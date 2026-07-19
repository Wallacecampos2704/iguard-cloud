import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Socket } from 'node:net';
import { promisify } from 'node:util';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CheckType, DeviceStatus, DeviceType, Prisma } from '@prisma/client';
import { IncidentsService } from '../incidents/incidents.service';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';

type DeviceInput = {
  name?: string;
  deviceType?: string;
  host?: string;
  port?: number | null;
  currentStatus?: string;
  checkType?: string;
};

type CheckResult = {
  status: DeviceStatus;
  responseTimeMs: number | null;
  errorMessage: string | null;
  rawPayload: Prisma.InputJsonValue;
};

type CheckableDevice = {
  id: string;
  organizationId: string;
  customerId: string;
  siteId: string;
  name: string;
  host: string;
  port: number | null;
  checkType: CheckType;
};

const execFileAsync = promisify(execFile);

function readPositiveInteger(
  value: string | undefined,
  fallback: number,
  maximum: number,
) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? Math.min(parsed, maximum)
    : fallback;
}

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly incidentsService: IncidentsService,
  ) {}

  private readonly checkTimeoutMs = readPositiveInteger(
    process.env.CHECK_TIMEOUT_MS,
    3_000,
    120_000,
  );
  private readonly checkConcurrency = readPositiveInteger(
    process.env.CHECK_CONCURRENCY,
    5,
    50,
  );

  /**
   * Único ponto de validação de organizationId para os métodos públicos de
   * usuário. O fluxo interno global (checkAllOrganizationsInternal) não usa
   * esta validação, pois propositalmente não está escopado a uma organização.
   */
  private requireOrganizationId(organizationId: string): string {
    if (!organizationId || !organizationId.trim()) {
      throw new BadRequestException('Organização inválida.');
    }
    return organizationId;
  }

  private normalizeDeviceType(value: string) {
    const aliases: Record<string, DeviceType> = {
      HTTP: DeviceType.SERVER,
      TCP: DeviceType.OTHER,
      PING: DeviceType.INTERNET_LINK,
      RTSP: DeviceType.CAMERA_IP,
      CAMERA: DeviceType.CAMERA_IP,
      DVR: DeviceType.DVR_NVR,
      NVR: DeviceType.DVR_NVR,
      ACCESS_CONTROL: DeviceType.ACCESS_CONTROLLER,
      MODEM: DeviceType.INTERNET_LINK,
    };
    const deviceType = aliases[value] ?? (value as DeviceType);

    if (!Object.values(DeviceType).includes(deviceType)) {
      throw new BadRequestException(`Tipo de dispositivo inválido: ${value}`);
    }

    return deviceType;
  }

  private normalizeCheckType(value?: string) {
    const normalized = value === 'TCP' ? CheckType.TCP_PORT : value;
    const checkType = (normalized ?? CheckType.HTTP) as CheckType;

    if (
      !new Set<CheckType>([
        CheckType.HTTP,
        CheckType.HTTPS,
        CheckType.TCP_PORT,
        CheckType.RTSP,
        CheckType.PING,
      ]).has(checkType)
    ) {
      throw new BadRequestException(`Tipo de verificação inválido: ${value}`);
    }

    return checkType;
  }

  private normalizeStatus(value?: string) {
    const requestedStatus =
      value === 'ATTENTION' ? DeviceStatus.WARNING : value;
    const status = (requestedStatus ?? DeviceStatus.UNKNOWN) as DeviceStatus;

    if (!Object.values(DeviceStatus).includes(status)) {
      throw new BadRequestException(`Status de dispositivo inválido: ${value}`);
    }

    return status;
  }

  private normalizeAddress(hostInput: string, requestedPort?: number | null) {
    const value = hostInput.trim();
    if (!value) {
      throw new BadRequestException('Informe o host ou IP do equipamento.');
    }

    try {
      const hasExplicitProtocol = /^https?:\/\//i.test(value);
      const url = new URL(hasExplicitProtocol ? value : `http://${value}`);
      const extractedPort = url.port ? Number(url.port) : undefined;
      const port = extractedPort ?? requestedPort ?? null;

      if (
        port !== null &&
        (!Number.isInteger(port) || port < 1 || port > 65535)
      ) {
        throw new BadRequestException('Informe uma porta entre 1 e 65535.');
      }

      return {
        host: url.hostname.replace(/^\[|\]$/g, ''),
        port,
        protocol: hasExplicitProtocol
          ? value.toLowerCase().startsWith('https://')
            ? CheckType.HTTPS
            : CheckType.HTTP
          : undefined,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Host ou IP inválido.');
    }
  }

  private validatePortForCheck(checkType: CheckType, port?: number | null) {
    if (
      new Set<CheckType>([CheckType.TCP_PORT, CheckType.RTSP]).has(checkType) &&
      port == null
    ) {
      throw new BadRequestException(
        `A porta é obrigatória para verificações ${checkType === CheckType.TCP_PORT ? 'TCP' : 'RTSP'}.`,
      );
    }
  }

  private buildHttpUrl(
    host: string,
    port: number | null,
    checkType: CheckType,
  ) {
    const protocol = checkType === CheckType.HTTPS ? 'https' : 'http';
    const url = new URL(`${protocol}://${host}`);
    if (port !== null) url.port = String(port);
    return url;
  }

  private async performHttpCheck(
    host: string,
    port: number | null,
    checkType: CheckType,
  ): Promise<CheckResult> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.checkTimeoutMs);

    try {
      const url = this.buildHttpUrl(host, port, checkType);
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
      });
      const onlineStatuses = new Set([200, 301, 302, 401, 403]);
      const status = onlineStatuses.has(response.status)
        ? DeviceStatus.ONLINE
        : DeviceStatus.WARNING;

      return {
        status,
        responseTimeMs: Date.now() - startedAt,
        errorMessage:
          status === DeviceStatus.ONLINE ? null : `HTTP ${response.status}`,
        rawPayload: {
          protocol: checkType,
          httpStatus: response.status,
        },
      };
    } catch (error) {
      return this.offlineResult(startedAt, error);
    } finally {
      clearTimeout(timeout);
    }
  }

  private performTcpCheck(
    host: string,
    port: number,
    checkType: CheckType,
  ): Promise<CheckResult> {
    const startedAt = Date.now();

    return new Promise((resolve) => {
      const socket = new Socket();
      let settled = false;

      const finish = (result: CheckResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(hardTimeout);
        socket.destroy();
        resolve(result);
      };

      const hardTimeout = setTimeout(
        () =>
          finish(
            this.offlineResult(startedAt, new Error('Timeout de conexão')),
          ),
        this.checkTimeoutMs,
      );
      socket.setTimeout(this.checkTimeoutMs);
      socket.once('connect', () =>
        finish({
          status: DeviceStatus.ONLINE,
          responseTimeMs: Date.now() - startedAt,
          errorMessage: null,
          rawPayload: { protocol: checkType },
        }),
      );
      socket.once('timeout', () =>
        finish(this.offlineResult(startedAt, new Error('Timeout de conexão'))),
      );
      socket.once('error', (error) =>
        finish(this.offlineResult(startedAt, error)),
      );
      socket.connect(port, host);
    });
  }

  private async performPingCheck(host: string): Promise<CheckResult> {
    const startedAt = Date.now();
    const isWindows = process.platform === 'win32';
    const args = isWindows
      ? ['-n', '1', '-w', String(this.checkTimeoutMs), host]
      : ['-c', '1', '-W', String(Math.ceil(this.checkTimeoutMs / 1000)), host];

    try {
      await execFileAsync('ping', args, {
        timeout: this.checkTimeoutMs,
      });
      return {
        status: DeviceStatus.ONLINE,
        responseTimeMs: Date.now() - startedAt,
        errorMessage: null,
        rawPayload: { protocol: CheckType.PING },
      };
    } catch (error) {
      return this.offlineResult(startedAt, error);
    }
  }

  private offlineResult(startedAt: number, error: unknown): CheckResult {
    const isTimeout =
      error instanceof Error &&
      (error.name === 'AbortError' || /timeout/i.test(error.message));
    return {
      status: DeviceStatus.OFFLINE,
      responseTimeMs: Date.now() - startedAt,
      errorMessage: isTimeout
        ? `Timeout após ${this.checkTimeoutMs} ms`
        : error instanceof Error
          ? error.message
          : 'Falha de conexão',
      rawPayload: { timeout: isTimeout },
    };
  }

  async create(organizationId: string, input: DeviceInput) {
    this.requireOrganizationId(organizationId);

    if (!input.name?.trim() || !input.deviceType || !input.host) {
      throw new BadRequestException('Nome, tipo e host são obrigatórios.');
    }

    const site = await this.prisma.site.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, organizationId: true, customerId: true },
    });
    if (!site) {
      throw new BadRequestException(
        'Cadastre uma organização, um cliente e um local antes do dispositivo.',
      );
    }

    const address = this.normalizeAddress(input.host, input.port);
    const checkType = this.normalizeCheckType(
      address.protocol ?? input.checkType,
    );
    this.validatePortForCheck(checkType, address.port);

    return this.prisma.device.create({
      data: {
        // Usa o organizationId recebido pelo método, nunca o valor devolvido
        // pela consulta ao Site — mesmo que um mock inconsistente devolva
        // outro organizationId, a organização de origem é sempre a do
        // parâmetro validado, não a do resultado de uma query subsequente.
        organizationId,
        customerId: site.customerId,
        siteId: site.id,
        name: input.name.trim(),
        deviceType: this.normalizeDeviceType(input.deviceType),
        host: address.host,
        port: address.port,
        checkType,
        currentStatus: this.normalizeStatus(input.currentStatus),
      },
    });
  }

  async update(organizationId: string, id: string, input: DeviceInput) {
    this.requireOrganizationId(organizationId);

    const existing = await this.prisma.device.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Equipamento não encontrado.');

    const address = this.normalizeAddress(
      input.host ?? existing.host,
      input.port === undefined ? existing.port : input.port,
    );
    const checkType = this.normalizeCheckType(
      address.protocol ?? input.checkType ?? existing.checkType,
    );
    this.validatePortForCheck(checkType, address.port);

    const updated = await this.prisma.device.updateMany({
      where: { id, organizationId },
      data: {
        name: input.name?.trim() || existing.name,
        deviceType: input.deviceType
          ? this.normalizeDeviceType(input.deviceType)
          : existing.deviceType,
        host: address.host,
        port: address.port,
        checkType,
        currentStatus: input.currentStatus
          ? this.normalizeStatus(input.currentStatus)
          : existing.currentStatus,
      },
    });

    if (updated.count !== 1) {
      throw new NotFoundException('Equipamento não encontrado.');
    }

    const device = await this.prisma.device.findFirst({
      where: { id, organizationId },
    });
    if (!device) {
      throw new NotFoundException('Equipamento não encontrado.');
    }

    return device;
  }

  async remove(organizationId: string, id: string) {
    this.requireOrganizationId(organizationId);

    const deleted = await this.prisma.device.deleteMany({
      where: { id, organizationId },
    });

    if (deleted.count !== 1) {
      throw new NotFoundException('Equipamento não encontrado.');
    }

    return { success: true };
  }

  async findAll(organizationId: string) {
    this.requireOrganizationId(organizationId);

    const devices = await this.prisma.device.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        deviceType: true,
        host: true,
        port: true,
        checkType: true,
        currentStatus: true,
        responseTimeMs: true,
        lastCheckedAt: true,
        customer: { select: { name: true } },
        site: { select: { name: true } },
      },
    });

    return devices.map((device) => ({
      id: device.id,
      name: device.name,
      deviceType: device.deviceType,
      host: device.host,
      port: device.port,
      checkType: device.checkType,
      currentStatus: device.currentStatus,
      responseTimeMs: device.responseTimeMs,
      lastCheckedAt: device.lastCheckedAt,
      customerName: device.customer.name,
      siteName: device.site.name,
    }));
  }

  private async persistCheck(
    device: CheckableDevice,
    result: CheckResult,
    source: string,
    checkedAt: Date,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      let previousStatus: DeviceStatus | undefined;

      // A comparação e a atualização condicionais impedem que duas rotinas
      // simultâneas alertem pela mesma mudança de status.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const currentDevice = await transaction.device.findUnique({
          where: { id: device.id },
          select: { currentStatus: true },
        });
        if (!currentDevice) {
          throw new NotFoundException('Equipamento não encontrado.');
        }

        const updated = await transaction.device.updateMany({
          where: {
            id: device.id,
            currentStatus: currentDevice.currentStatus,
          },
          data: {
            currentStatus: result.status,
            lastCheckedAt: checkedAt,
            responseTimeMs: result.responseTimeMs,
          },
        });

        if (updated.count === 1) {
          previousStatus = currentDevice.currentStatus;
          break;
        }
      }

      if (previousStatus === undefined) {
        throw new Error(
          'Não foi possível atualizar o status devido a verificações concorrentes.',
        );
      }

      const checkResult = await transaction.checkResult.create({
        data: {
          organizationId: device.organizationId,
          deviceId: device.id,
          status: result.status,
          responseTimeMs: result.responseTimeMs,
          errorMessage: result.errorMessage,
          checkType: device.checkType,
          source,
          rawPayload: result.rawPayload,
          checkedAt,
        },
        select: { id: true },
      });

      const incident = await this.incidentsService.handleDeviceStatusChange(
        transaction,
        {
          deviceId: device.id,
          previousStatus,
          currentStatus: result.status,
          checkedAt,
          source,
        },
      );

      return {
        id: device.id,
        currentStatus: result.status,
        lastCheckedAt: checkedAt,
        responseTimeMs: result.responseTimeMs,
        checkResultId: checkResult.id,
        errorMessage: result.errorMessage,
        previousStatus,
        incidentId: incident?.incidentId ?? null,
      };
    });
  }

  private async alertStatusChange(
    device: CheckableDevice,
    previousStatus: DeviceStatus,
    result: CheckResult,
    checkedAt: Date,
    incidentId: string | null,
  ) {
    try {
      await this.notificationService.notifyStatusChange({
        organizationId: device.organizationId,
        customerId: device.customerId,
        siteId: device.siteId,
        deviceId: device.id,
        incidentId,
        name: device.name,
        host: device.host,
        port: device.port,
        checkType: device.checkType,
        previousStatus,
        newStatus: result.status,
        checkedAt,
        responseTimeMs: result.responseTimeMs,
        errorMessage: result.errorMessage,
      });
    } catch (error) {
      this.logger.error(
        error instanceof Error
          ? `Falha inesperada ao processar alerta: ${error.message}`
          : 'Falha inesperada ao processar alerta.',
      );
    }
  }

  private async runDeviceCheck(device: CheckableDevice, source: string) {
    this.validatePortForCheck(device.checkType, device.port);
    let result: CheckResult;

    switch (device.checkType) {
      case CheckType.HTTP:
      case CheckType.HTTPS:
        result = await this.performHttpCheck(
          device.host,
          device.port,
          device.checkType,
        );
        break;
      case CheckType.TCP_PORT:
      case CheckType.RTSP:
        result = await this.performTcpCheck(
          device.host,
          device.port as number,
          device.checkType,
        );
        break;
      case CheckType.PING:
        result = await this.performPingCheck(device.host);
        break;
      default:
        throw new BadRequestException(
          `Verificação não disponível para ${device.checkType}.`,
        );
    }

    const checkedAt = new Date();
    const persisted = await this.persistCheck(
      device,
      result,
      source,
      checkedAt,
    );
    await this.alertStatusChange(
      device,
      persisted.previousStatus,
      result,
      checkedAt,
      persisted.incidentId,
    );

    return {
      id: persisted.id,
      currentStatus: persisted.currentStatus,
      lastCheckedAt: persisted.lastCheckedAt,
      responseTimeMs: persisted.responseTimeMs,
      checkResultId: persisted.checkResultId,
      errorMessage: persisted.errorMessage,
    };
  }

  async check(organizationId: string, id: string) {
    this.requireOrganizationId(organizationId);

    const device = await this.prisma.device.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        customerId: true,
        siteId: true,
        name: true,
        host: true,
        port: true,
        checkType: true,
      },
    });
    if (!device) throw new NotFoundException('Equipamento não encontrado.');

    return this.runDeviceCheck(device, 'MANUAL');
  }

  async getChecks(organizationId: string, id: string) {
    this.requireOrganizationId(organizationId);

    const device = await this.prisma.device.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!device) throw new NotFoundException('Equipamento não encontrado.');

    return this.prisma.checkResult.findMany({
      where: { organizationId, deviceId: id },
      orderBy: { checkedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        responseTimeMs: true,
        errorMessage: true,
        checkType: true,
        source: true,
        checkedAt: true,
      },
    });
  }

  /**
   * Executor de lote compartilhado. Recebe a lista de devices já carregada
   * (escopada por organização ou global, conforme o chamador) e não decide
   * por conta própria qual conjunto de devices verificar.
   */
  private async executeBatch(
    devices: CheckableDevice[],
    source: 'BATCH' | 'AUTOMATIC',
  ) {
    const runSource = `${source}:${randomUUID()}`;

    const results: Array<DeviceStatus | null> = Array.from(
      { length: devices.length },
      () => null,
    );
    let cursor = 0;
    const worker = async () => {
      while (cursor < devices.length) {
        const index = cursor++;
        try {
          const result = await this.runDeviceCheck(devices[index], runSource);
          results[index] = result.currentStatus;
        } catch (error) {
          try {
            const checkedAt = new Date();
            const errorMessage =
              error instanceof Error ? error.message : 'Falha na verificação';
            const fallbackResult: CheckResult = {
              status: DeviceStatus.OFFLINE,
              responseTimeMs: null,
              errorMessage,
              rawPayload: { batchError: true },
            };
            const persisted = await this.persistCheck(
              devices[index],
              fallbackResult,
              runSource,
              checkedAt,
            );
            await this.alertStatusChange(
              devices[index],
              persisted.previousStatus,
              fallbackResult,
              checkedAt,
              persisted.incidentId,
            );
            results[index] = DeviceStatus.OFFLINE;
          } catch {
            results[index] = null;
          }
        }
      }
    };

    const concurrency = Math.min(this.checkConcurrency, devices.length);
    await Promise.allSettled(
      Array.from({ length: concurrency }, () => worker()),
    );

    const checked = results.filter((status) => status !== null).length;
    const online = results.filter(
      (status) => status === DeviceStatus.ONLINE,
    ).length;
    const offline = results.filter(
      (status) => status === DeviceStatus.OFFLINE,
    ).length;
    const warning = results.filter(
      (status) => status === DeviceStatus.WARNING,
    ).length;

    return {
      success: true,
      total: devices.length,
      checked,
      online,
      offline,
      warning,
      message: `${checked} de ${devices.length} equipamentos verificados: ${online} online, ${offline} offline e ${warning} em atenção.`,
    };
  }

  /**
   * Lote de usuário: verifica somente os equipamentos da organização
   * autenticada. Usado por POST /devices/check-all.
   */
  async checkAllForOrganization(organizationId: string) {
    this.requireOrganizationId(organizationId);

    const devices = await this.prisma.device.findMany({
      where: { organizationId },
      select: {
        id: true,
        organizationId: true,
        customerId: true,
        siteId: true,
        name: true,
        host: true,
        port: true,
        checkType: true,
      },
    });

    return this.executeBatch(devices, 'BATCH');
  }

  /**
   * Lote interno da plataforma: verifica os equipamentos de todas as
   * organizações. Não deve depender de cookie, usuário ou guard — é chamado
   * por monitor-once.ts e pelo endpoint administrativo protegido por
   * @Roles(MASTER). Não deve ser exposto como opção ao usuário comum.
   */
  async checkAllOrganizationsInternal(
    source: 'BATCH' | 'AUTOMATIC' = 'AUTOMATIC',
  ) {
    const devices = await this.prisma.device.findMany({
      select: {
        id: true,
        organizationId: true,
        customerId: true,
        siteId: true,
        name: true,
        host: true,
        port: true,
        checkType: true,
      },
    });

    return this.executeBatch(devices, source);
  }
}
