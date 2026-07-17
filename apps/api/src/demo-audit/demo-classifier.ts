export type DemoAuditEntity =
  | 'organizations'
  | 'customers'
  | 'sites'
  | 'devices'
  | 'incidents';

export interface DemoAuditCandidate {
  entity: DemoAuditEntity;
  id: string;
  label: string;
  reasons: string[];
}

export interface DemoAuditData {
  organizations: Array<{
    id: string;
    name: string;
    document?: string | null;
    city?: string | null;
  }>;
  customers: Array<{
    id: string;
    organizationId: string;
    name: string;
    responsibleName?: string | null;
    email?: string | null;
    notes?: string | null;
  }>;
  sites: Array<{
    id: string;
    organizationId: string;
    customerId: string;
    name: string;
    address?: string | null;
    notes?: string | null;
  }>;
  devices: Array<{
    id: string;
    organizationId: string;
    customerId: string;
    siteId: string;
    name: string;
    manufacturer?: string | null;
    model?: string | null;
    host?: string | null;
    notes?: string | null;
  }>;
  incidents: Array<{
    id: string;
    organizationId: string;
    customerId?: string | null;
    siteId?: string | null;
    deviceId?: string | null;
    title: string;
    description?: string | null;
    probableCause?: string | null;
    aiSummary?: string | null;
  }>;
}

const DEMO_MARKER =
  /(?:^|[^a-z0-9])(demo|demonstracao|teste|test|sample|sandbox|fake)(?:$|[^a-z0-9])/;

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function directReasons(
  fields: Array<[name: string, value: string | null | undefined]>,
): string[] {
  return fields
    .filter(([, value]) => value && DEMO_MARKER.test(normalize(value)))
    .map(([name]) => `campo ${name} contém marcador de demonstração`);
}

function addCandidate(
  candidates: DemoAuditCandidate[],
  entity: DemoAuditEntity,
  id: string,
  label: string,
  reasons: string[],
): boolean {
  const uniqueReasons = [...new Set(reasons)];

  if (uniqueReasons.length === 0) {
    return false;
  }

  candidates.push({ entity, id, label, reasons: uniqueReasons });
  return true;
}

/**
 * Classifica registros possivelmente demonstrativos sem modificar os dados.
 * Relações descendentes também são sinalizadas para permitir uma revisão segura
 * do escopo completo de uma organização ou cliente suspeito.
 */
export function findDemoCandidates(data: DemoAuditData): DemoAuditCandidate[] {
  const candidates: DemoAuditCandidate[] = [];
  const organizationIds = new Set<string>();
  const customerIds = new Set<string>();
  const siteIds = new Set<string>();
  const deviceIds = new Set<string>();

  for (const organization of data.organizations) {
    const matched = addCandidate(
      candidates,
      'organizations',
      organization.id,
      organization.name,
      directReasons([
        ['name', organization.name],
        ['document', organization.document],
        ['city', organization.city],
      ]),
    );

    if (matched) {
      organizationIds.add(organization.id);
    }
  }

  for (const customer of data.customers) {
    const reasons = directReasons([
      ['name', customer.name],
      ['responsibleName', customer.responsibleName],
      ['email', customer.email],
      ['notes', customer.notes],
    ]);

    if (organizationIds.has(customer.organizationId)) {
      reasons.push('vinculado a uma organização sinalizada');
    }

    if (
      addCandidate(candidates, 'customers', customer.id, customer.name, reasons)
    ) {
      customerIds.add(customer.id);
    }
  }

  for (const site of data.sites) {
    const reasons = directReasons([
      ['name', site.name],
      ['address', site.address],
      ['notes', site.notes],
    ]);

    if (organizationIds.has(site.organizationId)) {
      reasons.push('vinculado a uma organização sinalizada');
    }
    if (customerIds.has(site.customerId)) {
      reasons.push('vinculado a um cliente sinalizado');
    }

    if (addCandidate(candidates, 'sites', site.id, site.name, reasons)) {
      siteIds.add(site.id);
    }
  }

  for (const device of data.devices) {
    const reasons = directReasons([
      ['name', device.name],
      ['manufacturer', device.manufacturer],
      ['model', device.model],
      ['host', device.host],
      ['notes', device.notes],
    ]);

    if (organizationIds.has(device.organizationId)) {
      reasons.push('vinculado a uma organização sinalizada');
    }
    if (customerIds.has(device.customerId)) {
      reasons.push('vinculado a um cliente sinalizado');
    }
    if (siteIds.has(device.siteId)) {
      reasons.push('vinculado a um site sinalizado');
    }

    if (addCandidate(candidates, 'devices', device.id, device.name, reasons)) {
      deviceIds.add(device.id);
    }
  }

  for (const incident of data.incidents) {
    const reasons = directReasons([
      ['title', incident.title],
      ['description', incident.description],
      ['probableCause', incident.probableCause],
      ['aiSummary', incident.aiSummary],
    ]);

    if (organizationIds.has(incident.organizationId)) {
      reasons.push('vinculado a uma organização sinalizada');
    }
    if (incident.customerId && customerIds.has(incident.customerId)) {
      reasons.push('vinculado a um cliente sinalizado');
    }
    if (incident.siteId && siteIds.has(incident.siteId)) {
      reasons.push('vinculado a um site sinalizado');
    }
    if (incident.deviceId && deviceIds.has(incident.deviceId)) {
      reasons.push('vinculado a um equipamento sinalizado');
    }

    addCandidate(candidates, 'incidents', incident.id, incident.title, reasons);
  }

  return candidates;
}
