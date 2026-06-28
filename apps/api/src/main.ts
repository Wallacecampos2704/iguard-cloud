import { NestFactory } from '@nestjs/core';
import { Module, Controller, Get } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type DeviceStatus = 'ONLINE' | 'ATTENTION' | 'OFFLINE' | 'PAUSED';

function formatLastSeen(date: Date | null): string {
  if (!date) return 'nunca';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.max(1, Math.floor(diffMs / 1000));

  if (diffSec < 60) return `${diffSec} seg atrás`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min atrás`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} h atrás`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} d atrás`;
}

function mapStatus(status: DeviceStatus): 'online' | 'attention' | 'offline' {
  if (status === 'ONLINE') return 'online';
  if (status === 'OFFLINE') return 'offline';
  return 'attention';
}

function mapHealth(status: DeviceStatus): 'normal' | 'warning' | 'critical' {
  if (status === 'ONLINE') return 'normal';
  if (status === 'OFFLINE') return 'critical';
  return 'warning';
}

@Controller()
class AppController {
  @Get()
  root() {
    return {
      name: 'iGuard Cloud API',
      status: 'running',
      docs: {
        health: '/health',
        dashboard: '/dashboard/summary',
        devices: '/devices',
      },
    };
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('dashboard/summary')
  async dashboardSummary() {
    const tenantId = 'tenant_sentinela';

    const [
      monitoredDevices,
      online,
      attention,
      offline,
      openIncidents,
    ] = await Promise.all([
      prisma.device.count({
        where: { tenantId, enabled: true },
      }),
      prisma.device.count({
        where: { tenantId, enabled: true, status: 'ONLINE' },
      }),
      prisma.device.count({
        where: { tenantId, enabled: true, status: 'ATTENTION' },
      }),
      prisma.device.count({
        where: { tenantId, enabled: true, status: 'OFFLINE' },
      }),
      prisma.incident.count({
        where: { tenantId, status: 'OPEN' },
      }),
    ]);

    const uptime =
      monitoredDevices > 0
        ? `${((online / monitoredDevices) * 100).toFixed(2)}%`
        : '0.00%';

    return {
      monitoredDevices,
      online,
      attention,
      offline,
      openIncidents,
      uptime,
      lastUpdated: new Date().toISOString(),
    };
  }

  @Get('devices')
  async devices() {
    const tenantId = 'tenant_sentinela';

    const devices = await prisma.device.findMany({
      where: {
        tenantId,
        enabled: true,
      },
      include: {
        site: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return devices.map((device) => ({
      id: device.id,
      name: device.name,
      type: device.type,
      location: device.site?.name ?? 'Sem local',
      status: mapStatus(device.status as DeviceStatus),
      health: mapHealth(device.status as DeviceStatus),
      lastSeen: formatLastSeen(device.lastSeenAt),
    }));
  }
}

@Module({
  controllers: [AppController],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  const port = Number(process.env.API_PORT || 4000);
  await app.listen(port, '0.0.0.0');

  console.log(`iGuard API running on port ${port}`);
}

bootstrap();
