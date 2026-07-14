import { CheckType, DeviceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DevicesService } from './devices.service';

type TestableDevicesService = {
  checkTimeoutMs: number;
  normalizeAddress: (
    host: string,
    port?: number | null,
  ) => { host: string; port: number | null; protocol?: CheckType };
  performHttpCheck: (
    host: string,
    port: number | null,
    checkType: CheckType,
  ) => Promise<{ status: DeviceStatus; responseTimeMs: number }>;
};

describe('DevicesService', () => {
  const service = new DevicesService({} as PrismaService);
  const testable = service as unknown as TestableDevicesService;

  afterEach(() => jest.restoreAllMocks());

  it('normaliza URL HTTP extraindo host, porta e protocolo', () => {
    expect(
      testable.normalizeAddress(
        'http://clientevpn.sentinelaconect.com.br:8081',
      ),
    ).toEqual({
      host: 'clientevpn.sentinelaconect.com.br',
      port: 8081,
      protocol: CheckType.HTTP,
    });
  });

  it('mantém domínio limpo sem inventar protocolo ou porta', () => {
    expect(
      testable.normalizeAddress('clientevpn.sentinelaconect.com.br'),
    ).toEqual({
      host: 'clientevpn.sentinelaconect.com.br',
      port: null,
      protocol: undefined,
    });
  });

  it('considera HTTP 401 online e monta protocolo, host e porta', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ status: 401 } as Response);

    const result = await testable.performHttpCheck(
      'condominio.exemplo.com.br',
      8443,
      CheckType.HTTPS,
    );

    expect(result.status).toBe(DeviceStatus.ONLINE);
    const requestedUrl = fetchMock.mock.calls[0][0] as URL;
    expect(requestedUrl.href).toBe('https://condominio.exemplo.com.br:8443/');
    expect(testable.checkTimeoutMs).toBe(10_000);
  });

  it('considera HTTP 500 warning', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ status: 500 } as Response);

    const result = await testable.performHttpCheck(
      'condominio.exemplo.com.br',
      80,
      CheckType.HTTP,
    );

    expect(result.status).toBe(DeviceStatus.WARNING);
  });

  it('retorna as últimas 20 verificações em ordem decrescente', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'device-1' });
    const findMany = jest.fn().mockResolvedValue([]);
    const historyService = new DevicesService({
      device: { findUnique },
      checkResult: { findMany },
    } as unknown as PrismaService);

    await historyService.getChecks('device-1');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deviceId: 'device-1' },
        orderBy: { checkedAt: 'desc' },
        take: 20,
      }),
    );
  });

  it('retorna o contrato completo do check em lote', async () => {
    const batchService = new DevicesService({
      device: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService);

    await expect(batchService.checkAll()).resolves.toEqual({
      success: true,
      total: 0,
      checked: 0,
      online: 0,
      offline: 0,
      warning: 0,
      message:
        '0 de 0 equipamentos verificados: 0 online, 0 offline e 0 em atenção.',
    });
  });
});
