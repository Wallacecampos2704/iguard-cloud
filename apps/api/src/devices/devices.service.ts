import { BadRequestException, Injectable } from '@nestjs/common';
import { DeviceStatus, DeviceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreateDeviceInput = {
  name: string;
  type: string;
  host: string;
  port?: number;
  status?: string;
};

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateDeviceInput) {
    const site = await this.prisma.site.findFirst({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        organizationId: true,
        customerId: true,
      },
    });

    if (!site) {
      throw new BadRequestException(
        'Cadastre uma organização, um cliente e um local antes do dispositivo.',
      );
    }

    const deviceType = input.type as DeviceType;
    if (!Object.values(DeviceType).includes(deviceType)) {
      throw new BadRequestException(`Tipo de dispositivo inválido: ${input.type}`);
    }

    const requestedStatus =
      input.status === 'ATTENTION' ? DeviceStatus.WARNING : input.status;
    const currentStatus = (requestedStatus ?? DeviceStatus.UNKNOWN) as DeviceStatus;
    if (!Object.values(DeviceStatus).includes(currentStatus)) {
      throw new BadRequestException(`Status de dispositivo inválido: ${input.status}`);
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
        customer: {
          select: {
            name: true,
          },
        },
        site: {
          select: {
            name: true,
          },
        },
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
}
