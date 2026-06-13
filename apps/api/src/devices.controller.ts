import { Controller, Get } from '@nestjs/common';

@Controller('devices')
export class DevicesController {
  @Get()
  getDevices() {
    return [
      {
        id: 'dev-001',
        name: 'NVR Central 01',
        type: 'NVR',
        location: 'Branch A',
        status: 'online',
        health: 'normal',
        lastSeen: '2 min atrás',
      },
      {
        id: 'dev-002',
        name: 'MikroTik Router 13',
        type: 'Router',
        location: 'Headquarter',
        status: 'attention',
        health: 'warning',
        lastSeen: '5 min atrás',
      },
      {
        id: 'dev-003',
        name: 'Access Controller 07',
        type: 'Controle de Acesso',
        location: 'Portão Principal',
        status: 'offline',
        health: 'critical',
        lastSeen: '12 min atrás',
      },
      {
        id: 'dev-004',
        name: 'Câmera PTZ 21',
        type: 'CFTV',
        location: 'Entrada Leste',
        status: 'online',
        health: 'normal',
        lastSeen: '30 seg atrás',
      }
    ];
  }
}
