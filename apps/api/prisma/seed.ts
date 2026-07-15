import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.alertTemplate.deleteMany();
  await prisma.notificationContact.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.checkResult.deleteMany();
  await prisma.device.deleteMany();
  await prisma.site.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.organization.deleteMany();

  const organization = await prisma.organization.create({
    data: {
      name: 'Integrador Demo',
      type: 'INTEGRATOR',
      document: '00.000.000/0001-00',
      phone: '(14) 99999-0000',
      city: 'Bauru',
      state: 'SP',
      plan: 'trial',
      deviceLimit: 3,
      status: 'TRIAL',
      trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
  });

  const customer = await prisma.customer.create({
    data: {
      organizationId: organization.id,
      name: 'Condomínio Solar',
      responsibleName: 'Síndico Demo',
      phone: '(14) 98888-0000',
      email: 'sindico@condominiosolar.com.br',
      notes: 'Cliente demo para apresentação do iGuard.',
    },
  });

  const site = await prisma.site.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      name: 'Portaria Principal',
      type: 'Condomínio',
      address: 'Rua Demo, 100',
      city: 'Bauru',
      state: 'SP',
      notes: 'Local principal monitorado.',
    },
  });

  const dvr = await prisma.device.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      siteId: site.id,
      name: 'DVR Principal',
      deviceType: 'DVR_NVR',
      manufacturer: 'Intelbras',
      model: 'MHDX Demo',
      host: '192.168.1.101',
      port: 80,
      checkType: 'HTTP',
      currentStatus: 'ONLINE',
      responseTimeMs: 42,
      lastCheckedAt: new Date(),
    },
  });

  const portaria = await prisma.device.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      siteId: site.id,
      name: 'Portaria Remota',
      deviceType: 'OTHER',
      host: '192.168.1.150',
      port: 5060,
      checkType: 'TCP_PORT',
      currentStatus: 'OFFLINE',
      responseTimeMs: null,
      lastCheckedAt: new Date(),
    },
  });

  const servidor = await prisma.device.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      siteId: site.id,
      name: 'Servidor NVR',
      deviceType: 'SERVER',
      host: '10.0.0.12',
      port: 8080,
      checkType: 'HTTP',
      currentStatus: 'WARNING',
      responseTimeMs: 890,
      lastCheckedAt: new Date(),
    },
  });

  await prisma.device.createMany({
    data: [
      {
        organizationId: organization.id,
        customerId: customer.id,
        siteId: site.id,
        name: 'MikroTik Borda',
        deviceType: 'MIKROTIK',
        host: '192.168.88.1',
        port: 8291,
        checkType: 'TCP_PORT',
        currentStatus: 'ONLINE',
        responseTimeMs: 18,
        lastCheckedAt: new Date(),
      },
      {
        organizationId: organization.id,
        customerId: customer.id,
        siteId: site.id,
        name: 'Facial Entrada Social',
        deviceType: 'FACIAL',
        host: '192.168.1.45',
        port: 80,
        checkType: 'HTTP',
        currentStatus: 'ONLINE',
        responseTimeMs: 55,
        lastCheckedAt: new Date(),
      },
    ],
  });

  await prisma.incident.createMany({
    data: [
      {
        organizationId: organization.id,
        customerId: customer.id,
        siteId: site.id,
        deviceId: portaria.id,
        title: 'Portaria Remota offline',
        severity: 'CRITICAL',
        status: 'OPEN',
        previousStatus: 'ONLINE',
        currentStatus: 'OFFLINE',
        source: 'MONITORING_CRON',
        category: 'DEVICE',
        probableCause:
          'Possível queda de internet, energia ou equipamento travado.',
        description: 'A portaria remota parou de responder ao monitoramento.',
      },
      {
        organizationId: organization.id,
        customerId: customer.id,
        siteId: site.id,
        deviceId: servidor.id,
        title: 'Servidor NVR com latência alta',
        severity: 'HIGH',
        status: 'ACKNOWLEDGED',
        previousStatus: 'ONLINE',
        currentStatus: 'WARNING',
        source: 'MONITORING_CRON',
        category: 'SERVER',
        probableCause:
          'Possível sobrecarga, rede lenta ou disco em uso elevado.',
        description: 'O servidor respondeu, mas com tempo acima do ideal.',
      },
    ],
  });

  await prisma.notificationContact.createMany({
    data: [
      {
        organizationId: organization.id,
        name: 'Técnico de Campo',
        role: 'Técnico',
        whatsapp: '14999990001',
        email: 'tecnico@demo.iguard.app',
        telegramChatId: '@tecnico_demo',
        receivesCriticalAlert: true,
        receivesRecoveryAlert: true,
        receivesBillingAlert: false,
      },
      {
        organizationId: organization.id,
        name: 'Gestor Operacional',
        role: 'Gestor',
        whatsapp: '14999990002',
        email: 'gestor@demo.iguard.app',
        telegramChatId: '@gestor_demo',
        receivesCriticalAlert: true,
        receivesRecoveryAlert: true,
        receivesBillingAlert: true,
      },
      {
        organizationId: organization.id,
        name: 'Síndico Demo',
        role: 'Cliente final',
        whatsapp: '14999990003',
        email: 'sindico@demo.iguard.app',
        telegramChatId: '@sindico_demo',
        receivesCriticalAlert: true,
        receivesRecoveryAlert: true,
        receivesBillingAlert: false,
      },
    ],
  });

  await prisma.alertTemplate.createMany({
    data: [
      {
        organizationId: organization.id,
        name: 'Mensagem técnica',
        audience: 'Integrador',
        template:
          'Alerta iGuard: o equipamento {{equipamento}} do cliente {{cliente}} parou de responder às {{hora}}. Possível causa: {{causa}}.',
      },
      {
        organizationId: organization.id,
        name: 'Mensagem para cliente final',
        audience: 'Síndico / Cliente final',
        template:
          'Olá! Identificamos uma instabilidade em um equipamento do local. Nossa equipe já foi notificada e está analisando.',
      },
      {
        organizationId: organization.id,
        name: 'Mensagem crítica',
        audience: 'Gestor',
        template:
          'Atenção: vários equipamentos do mesmo local pararam de responder. Isso pode indicar queda de internet ou energia.',
      },
    ],
  });

  const subscription = await prisma.subscription.create({
    data: {
      organizationId: organization.id,
      plan: 'trial',
      status: 'TRIAL',
      trialStartsAt: new Date(),
      trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.payment.createMany({
    data: [
      {
        organizationId: organization.id,
        subscriptionId: subscription.id,
        amount: 89.9,
        currency: 'BRL',
        status: 'APPROVED',
        paymentMethod: 'credit_card',
        paidAt: new Date(),
      },
      {
        organizationId: organization.id,
        subscriptionId: subscription.id,
        amount: 89.9,
        currency: 'BRL',
        status: 'PENDING',
        paymentMethod: 'credit_card',
      },
    ],
  });

  console.log('Seed iGuard criado com sucesso.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
