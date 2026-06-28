const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do iGuard SaaS...');

  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant_sentinela' },
    update: {},
    create: {
      id: 'tenant_sentinela',
      name: 'Sentinela Conect',
      document: null,
      email: 'contato@sentinelaconect.com.br',
      phone: null,
      active: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'admin@sentinelaconect.com.br' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Wallace Campos',
      email: 'admin@sentinelaconect.com.br',
      role: 'MASTER',
      active: true,
    },
  });

  const customer = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: 'Cliente Demonstração',
      email: 'cliente@demo.com',
      active: true,
    },
  });

  const site = await prisma.site.create({
    data: {
      tenantId: tenant.id,
      customerId: customer.id,
      name: 'Branch A',
      address: 'Local de demonstração',
      active: true,
    },
  });

  await prisma.device.createMany({
    data: [
      {
        tenantId: tenant.id,
        customerId: customer.id,
        siteId: site.id,
        name: 'NVR Central 01',
        type: 'NVR',
        host: '192.168.1.10',
        port: 80,
        status: 'ONLINE',
        enabled: true,
        lastSeenAt: new Date(Date.now() - 2 * 60 * 1000),
        lastCheckedAt: new Date(),
        lastLatencyMs: 32,
      },
      {
        tenantId: tenant.id,
        customerId: customer.id,
        siteId: site.id,
        name: 'MikroTik Router 13',
        type: 'MIKROTIK',
        host: '192.168.1.1',
        port: 8291,
        status: 'ATTENTION',
        enabled: true,
        lastSeenAt: new Date(Date.now() - 5 * 60 * 1000),
        lastCheckedAt: new Date(),
        lastLatencyMs: 140,
      },
      {
        tenantId: tenant.id,
        customerId: customer.id,
        siteId: site.id,
        name: 'Access Controller 07',
        type: 'ACCESS_CONTROL',
        host: '192.168.1.50',
        port: 80,
        status: 'OFFLINE',
        enabled: true,
        lastSeenAt: new Date(Date.now() - 12 * 60 * 1000),
        lastCheckedAt: new Date(),
        lastLatencyMs: null,
      },
      {
        tenantId: tenant.id,
        customerId: customer.id,
        siteId: site.id,
        name: 'Câmera PTZ 21',
        type: 'CAMERA',
        host: '192.168.1.80',
        port: 554,
        status: 'ONLINE',
        enabled: true,
        lastSeenAt: new Date(Date.now() - 30 * 1000),
        lastCheckedAt: new Date(),
        lastLatencyMs: 28,
      },
    ],
  });

  const offlineDevice = await prisma.device.findFirst({
    where: {
      tenantId: tenant.id,
      name: 'Access Controller 07',
    },
  });

  if (offlineDevice) {
    await prisma.incident.create({
      data: {
        tenantId: tenant.id,
        deviceId: offlineDevice.id,
        title: 'Equipamento offline',
        description: 'Access Controller 07 sem resposta na última checagem.',
        status: 'OPEN',
      },
    });
  }

  console.log('✅ Seed concluído.');
  console.log({ tenant: tenant.name, user: user.email });
}

main()
  .catch((error) => {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
