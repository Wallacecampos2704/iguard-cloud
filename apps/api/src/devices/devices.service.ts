import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CheckType, DeviceStatus, DeviceType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreateDeviceInput = {
  name: string;
  deviceType: string;
  host: string;
  port?: number;
  currentStatus?: string;
};

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly checkTimeoutMs = 5000;

  private buildCheckUrl(
    host: string,
    port: number | null,
    checkType: CheckType,
  ) {
    const hasProtocol = /^https?:\/\//i.test(host);
    const protocol = checkType === CheckType.HTTPS ? 'https' : 'http';
    const url = new URL(hasProtocol ? host : `${protocol}://${host}`);

    if (port !== null) {
      url.port = String(port);
    }

    return url;
  }

  private async performHttpCheck(
    host: string,
    port: number | null,
    checkType: CheckType,
  ) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.checkTimeoutMs);

    try {
      const url = this.buildCheckUrl(host, port, checkType);
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
      });
      const responseTimeMs = Date.now() - startedAt;
      const status =
        response.ok || (response.status >= 300 && response.status < 400)
          ? DeviceStatus.ONLINE
          : DeviceStatus.WARNING;

      return {
        status,
        responseTimeMs,
        errorMessage: response.ok ? null : `HTTP ${response.status}`,
        rawPayload: {
          url: url.toString(),
          httpStatus: response.status,
        } satisfies Prisma.InputJsonValue,
      };
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      return {
        status: DeviceStatus.OFFLINE,
        responseTimeMs: Date.now() - startedAt,
        errorMessage: isTimeout
          ? `Timeout após ${this.checkTimeoutMs} ms`
          : error instanceof Error
            ? error.message
            : 'Falha de conexão',
        rawPayload: { timeout: isTimeout } satisfies Prisma.InputJsonValue,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async create(input: CreateDeviceInput) {
    const site = await this.prisma.site.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true, organizationId: true, customerId: true },
    });

    if (!site) {
      throw new BadRequestException(
        'Cadastre uma organização, um cliente e um local antes do dispositivo.',
      );
    }

    const deviceType = input.deviceType as DeviceType;
    if (!Object.values(DeviceType).includes(deviceType)) {
      throw new BadRequestException(
        `Tipo de dispositivo inválido: ${input.deviceType}`,
      );
    }

    const requestedStatus =
      input.currentStatus === 'ATTENTION'
        ? DeviceStatus.WARNING
        : input.currentStatus;
    const currentStatus = (requestedStatus ??
      DeviceStatus.UNKNOWN) as DeviceStatus;
    if (!Object.values(DeviceStatus).includes(currentStatus)) {
      throw new BadRequestException(
        `Status de dispositivo inválido: ${input.currentStatus}`,
      );
    }

    return this.prisma.device.create({
      data: {
        organizationId: site.organizationId,
        customerId: site.customerId,
        siteId: site.id,
        name: input.name,
        deviceType,
        host: input.host,
        port: input.port,
        currentStatus,
      },
    });
  }

  async findAll() {
    const devices = await this.prisma.device.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        deviceType: true,
        host: true,
        port: true,
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
      currentStatus: device.currentStatus,
      responseTimeMs: device.responseTimeMs,
      lastCheckedAt: device.lastCheckedAt,
      customerName: device.customer.name,
      siteName: device.site.name,
    }));
  }

  async check(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        deviceType: true,
        host: true,
        port: true,
        checkType: true,
      },
    });

    if (!device) {
      throw new NotFoundException('Equipamento não encontrado.');
    }

    const supportedTypes = new Set([
      'HTTP',
      'FACIAL',
      'CAMERA',
      'CAMERA_IP',
      'DVR',
      'NVR',
      'DVR_NVR',
    ]);

    if (!supportedTypes.has(String(device.deviceType))) {
      throw new BadRequestException(
        `Verificação HTTP ainda não disponível para o tipo ${device.deviceType}.`,
      );
    }

    const checkedAt = new Date();
    const result = await this.performHttpCheck(
      device.host,
      device.port,
      device.checkType,
    );

    const [updatedDevice, checkResult] = await this.prisma.$transaction([
      this.prisma.device.update({
        where: { id: device.id },
        data: {
          currentStatus: result.status,
          lastCheckedAt: checkedAt,
          responseTimeMs: result.responseTimeMs,
        },
        select: {
          id: true,
          currentStatus: true,
          lastCheckedAt: true,
          responseTimeMs: true,
        },
      }),
      this.prisma.checkResult.create({
        data: {
          organizationId: device.organizationId,
          deviceId: device.id,
          status: result.status,
          responseTimeMs: result.responseTimeMs,
          errorMessage: result.errorMessage,
          checkType: device.checkType,
          source: 'MANUAL',
          rawPayload: result.rawPayload,
          checkedAt,
        },
        select: { id: true },
      }),
    ]);

    return {
      ...updatedDevice,
      checkResultId: checkResult.id,
      errorMessage: result.errorMessage,
    };
  }
}
