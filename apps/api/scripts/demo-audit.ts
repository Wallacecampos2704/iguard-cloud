import 'dotenv/config';

import { PrismaClient } from '@prisma/client';

import {
  findDemoCandidates,
  type DemoAuditData,
  type DemoAuditEntity,
} from '../src/demo-audit/demo-classifier';

const ENTITY_LABELS: Record<DemoAuditEntity, string> = {
  organizations: 'Organizações',
  customers: 'Clientes',
  sites: 'Sites',
  devices: 'Equipamentos',
  incidents: 'Incidentes',
};

const ENTITY_ORDER = Object.keys(ENTITY_LABELS) as DemoAuditEntity[];

function safeTerminalText(value: string): string {
  const withoutControls = Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || (code >= 127 && code <= 159) ? ' ' : character;
  }).join('');

  return withoutControls.replace(/\s+/g, ' ').trim().slice(0, 120);
}

async function readAuditData(prisma: PrismaClient): Promise<DemoAuditData> {
  const [organizations, customers, sites, devices, incidents] =
    await Promise.all([
      prisma.organization.findMany({
        select: { id: true, name: true, document: true, city: true },
      }),
      prisma.customer.findMany({
        select: {
          id: true,
          organizationId: true,
          name: true,
          responsibleName: true,
          email: true,
          notes: true,
        },
      }),
      prisma.site.findMany({
        select: {
          id: true,
          organizationId: true,
          customerId: true,
          name: true,
          address: true,
          notes: true,
        },
      }),
      prisma.device.findMany({
        select: {
          id: true,
          organizationId: true,
          customerId: true,
          siteId: true,
          name: true,
          manufacturer: true,
          model: true,
          host: true,
          notes: true,
        },
      }),
      prisma.incident.findMany({
        select: {
          id: true,
          organizationId: true,
          customerId: true,
          siteId: true,
          deviceId: true,
          title: true,
          description: true,
          probableCause: true,
          aiSummary: true,
        },
      }),
    ]);

  return { organizations, customers, sites, devices, incidents };
}

function printAudit(data: DemoAuditData): void {
  const candidates = findDemoCandidates(data);

  console.log('iGuard — auditoria de possíveis dados demonstrativos');
  console.log(
    'Modo somente leitura: este comando não apaga, atualiza ou desativa registros.',
  );

  for (const entity of ENTITY_ORDER) {
    const entityCandidates = candidates.filter(
      (candidate) => candidate.entity === entity,
    );

    console.log(
      `\n${ENTITY_LABELS[entity]}: ${entityCandidates.length} candidato(s) de ${data[entity].length} registro(s)`,
    );

    for (const candidate of entityCandidates) {
      const label = safeTerminalText(candidate.label) || '(sem nome)';
      console.log(
        `- ${candidate.id} | ${label} | ${candidate.reasons.join('; ')}`,
      );
    }
  }

  console.log(`\nTotal de possíveis registros demo: ${candidates.length}`);
  console.log(
    candidates.length === 0
      ? 'Nenhum marcador conhecido foi encontrado.'
      : 'Revise cada candidato antes de qualquer ação manual; falsos positivos são possíveis.',
  );
  console.log('Auditoria concluída. Nenhum dado foi alterado.');
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    const data = await readAuditData(prisma);
    printAudit(data);
  } catch {
    console.error(
      'Não foi possível concluir a auditoria. Verifique DATABASE_URL e a disponibilidade do banco; detalhes de conexão foram omitidos por segurança.',
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

void main();
