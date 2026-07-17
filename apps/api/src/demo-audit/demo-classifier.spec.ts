import { findDemoCandidates, type DemoAuditData } from './demo-classifier';

function createEmptyAuditData(): DemoAuditData {
  return {
    organizations: [],
    customers: [],
    sites: [],
    devices: [],
    incidents: [],
  };
}

describe('findDemoCandidates', () => {
  it('não sinaliza dados sem marcadores de demonstração', () => {
    const data = createEmptyAuditData();
    data.organizations.push({ id: 'org-1', name: 'Sentinela Conect' });
    data.customers.push({
      id: 'customer-1',
      organizationId: 'org-1',
      name: 'Condomínio Central',
    });

    expect(findDemoCandidates(data)).toEqual([]);
  });

  it('reconhece marcador com acento sem expor o campo sensível', () => {
    const data = createEmptyAuditData();
    data.customers.push({
      id: 'customer-1',
      organizationId: 'org-1',
      name: 'Cliente temporário',
      email: 'operador@demo.iguard.app',
      notes: 'Ambiente de Demonstração',
    });

    const candidates = findDemoCandidates(data);

    expect(candidates).toEqual([
      {
        entity: 'customers',
        id: 'customer-1',
        label: 'Cliente temporário',
        reasons: [
          'campo email contém marcador de demonstração',
          'campo notes contém marcador de demonstração',
        ],
      },
    ]);
    expect(JSON.stringify(candidates)).not.toContain(
      'operador@demo.iguard.app',
    );
  });

  it('sinaliza relações descendentes de uma organização demo', () => {
    const data = createEmptyAuditData();
    data.organizations.push({ id: 'org-1', name: 'Integrador Demo' });
    data.customers.push({
      id: 'customer-1',
      organizationId: 'org-1',
      name: 'Cliente sem marcador',
    });
    data.sites.push({
      id: 'site-1',
      organizationId: 'org-1',
      customerId: 'customer-1',
      name: 'Portaria',
    });
    data.devices.push({
      id: 'device-1',
      organizationId: 'org-1',
      customerId: 'customer-1',
      siteId: 'site-1',
      name: 'DVR principal',
      host: '192.0.2.1',
    });
    data.incidents.push({
      id: 'incident-1',
      organizationId: 'org-1',
      customerId: 'customer-1',
      siteId: 'site-1',
      deviceId: 'device-1',
      title: 'Equipamento indisponível',
    });

    const candidates = findDemoCandidates(data);

    expect(candidates.map(({ entity }) => entity)).toEqual([
      'organizations',
      'customers',
      'sites',
      'devices',
      'incidents',
    ]);
  });

  it('considera registros nomeados como teste apenas como candidatos', () => {
    const data = createEmptyAuditData();
    data.devices.push({
      id: 'device-1',
      organizationId: 'org-1',
      customerId: 'customer-1',
      siteId: 'site-1',
      name: 'Link teste',
    });

    expect(findDemoCandidates(data)).toHaveLength(1);
  });
});
