import { ForbiddenException, RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RolesGuard } from '../auth/roles.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { SessionGuard } from '../auth/session.guard';
import { DevicesController } from './devices.controller';
import type { DevicesService } from './devices.service';

function buildUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: 'user-1',
    organizationId: 'organization-1',
    email: 'user@example.com',
    name: 'Test User',
    role: UserRole.OPERATOR,
    active: true,
    lastLoginAt: null,
    ...overrides,
  };
}

function route(method: keyof DevicesController) {
  return Object.getOwnPropertyDescriptor(DevicesController.prototype, method)
    ?.value as object;
}

describe('DevicesController routes', () => {
  it('expõe POST /devices/check-all', () => {
    const handler = route('checkAll');

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('check-all');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.POST,
    );
  });

  it('expõe GET /devices/:id/checks', () => {
    const handler = route('getChecks');

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(':id/checks');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.GET,
    );
  });

  it('expõe POST /devices/monitoring/run', () => {
    const handler = route('runMonitoring');

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('monitoring/run');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.POST,
    );
  });
});

describe('DevicesController guards', () => {
  it('aplica SessionGuard na classe inteira', () => {
    const classGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      DevicesController,
    ) as unknown[] | undefined;

    expect(classGuards).toContain(SessionGuard);
  });

  it('runMonitoring possui RolesGuard além do SessionGuard herdado da classe', () => {
    const methodGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      route('runMonitoring'),
    ) as unknown[] | undefined;

    expect(methodGuards).toContain(RolesGuard);
  });

  it('runMonitoring possui @Roles(UserRole.MASTER)', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, route('runMonitoring')) as
      | UserRole[]
      | undefined;

    expect(roles).toEqual([UserRole.MASTER]);
  });

  it('demais métodos comuns não possuem RolesGuard nem @Roles', () => {
    const commonMethods: Array<keyof DevicesController> = [
      'findAll',
      'create',
      'checkAll',
      'check',
      'getChecks',
      'update',
      'remove',
    ];

    for (const method of commonMethods) {
      const methodGuards = Reflect.getMetadata(
        GUARDS_METADATA,
        route(method),
      ) as unknown[] | undefined;
      const roles = Reflect.getMetadata(ROLES_KEY, route(method)) as
        | UserRole[]
        | undefined;

      expect(methodGuards ?? []).not.toContain(RolesGuard);
      expect(roles).toBeUndefined();
    }
  });
});

describe('DevicesController behavior', () => {
  function buildController() {
    const findAll = jest.fn();
    const create = jest.fn();
    const checkAllForOrganization = jest.fn();
    const checkAllOrganizationsInternal = jest.fn();
    const check = jest.fn();
    const getChecks = jest.fn();
    const update = jest.fn();
    const remove = jest.fn();

    const service = {
      findAll,
      create,
      checkAllForOrganization,
      checkAllOrganizationsInternal,
      check,
      getChecks,
      update,
      remove,
    } as unknown as DevicesService;
    const controller = new DevicesController(service);

    return {
      controller,
      service,
      findAll,
      create,
      checkAllForOrganization,
      checkAllOrganizationsInternal,
      check,
      getChecks,
      update,
      remove,
    };
  }

  it('findAll encaminha user.organizationId ao service', async () => {
    const { controller, findAll } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });

    await controller.findAll(user);

    expect(findAll).toHaveBeenCalledWith('organization-1');
  });

  it('create encaminha organizationId e body separadamente', async () => {
    const { controller, create } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });
    const body = { name: 'Câmera', deviceType: 'CAMERA_IP', host: 'host' };

    await controller.create(user, body);

    expect(create).toHaveBeenCalledWith('organization-1', body);
  });

  it('organizationId eventualmente presente no body não substitui o do usuário', async () => {
    const { controller, create } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });
    const body = {
      name: 'Câmera',
      deviceType: 'CAMERA_IP',
      host: 'host',
      organizationId: 'organization-ARBITRARIA',
    } as unknown as Parameters<DevicesController['create']>[1];

    await controller.create(user, body);

    const typedCreate = create as jest.Mock<unknown, [string]>;
    const forwardedOrganizationId = typedCreate.mock.calls[0][0];
    expect(forwardedOrganizationId).toBe('organization-1');
    expect(forwardedOrganizationId).not.toBe('organization-ARBITRARIA');
  });

  it('update encaminha organizationId, id e body', async () => {
    const { controller, update } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });
    const body = { name: 'Novo nome' };

    await controller.update(user, 'device-1', body);

    expect(update).toHaveBeenCalledWith('organization-1', 'device-1', body);
  });

  it('remove encaminha organizationId e id', async () => {
    const { controller, remove } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });

    await controller.remove(user, 'device-1');

    expect(remove).toHaveBeenCalledWith('organization-1', 'device-1');
  });

  it('check encaminha organizationId e id', async () => {
    const { controller, check } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });

    await controller.check(user, 'device-1');

    expect(check).toHaveBeenCalledWith('organization-1', 'device-1');
  });

  it('getChecks encaminha organizationId e id', async () => {
    const { controller, getChecks } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });

    await controller.getChecks(user, 'device-1');

    expect(getChecks).toHaveBeenCalledWith('organization-1', 'device-1');
  });

  it('checkAll chama checkAllForOrganization, não o antigo método global', async () => {
    const { controller, service, checkAllForOrganization } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });

    await controller.checkAll(user);

    expect(checkAllForOrganization).toHaveBeenCalledWith('organization-1');
    expect(
      (service as unknown as Record<string, unknown>).checkAll,
    ).toBeUndefined();
  });

  it('runMonitoring chama checkAllOrganizationsInternal("AUTOMATIC") sem exigir organizationId', async () => {
    const { controller, checkAllOrganizationsInternal } = buildController();

    await controller.runMonitoring();

    expect(checkAllOrganizationsInternal).toHaveBeenCalledWith('AUTOMATIC');
  });

  it('usuário com organizationId null recebe ForbiddenException nos endpoints comuns', () => {
    const { controller } = buildController();
    const master = buildUser({
      organizationId: null,
      role: UserRole.MASTER,
    });

    expect(() => controller.findAll(master)).toThrow(ForbiddenException);
  });

  it('usuário MASTER não ganha acesso global implícito em findAll', () => {
    const { controller, findAll } = buildController();
    const master = buildUser({
      organizationId: null,
      role: UserRole.MASTER,
    });

    expect(() => controller.findAll(master)).toThrow(ForbiddenException);
    expect(findAll).not.toHaveBeenCalled();
  });

  it('usuário com organizationId vazio (apenas espaços) também é rejeitado', () => {
    const { controller } = buildController();
    const invalidUser = buildUser({ organizationId: '   ' });

    expect(() => controller.remove(invalidUser, 'device-1')).toThrow(
      ForbiddenException,
    );
  });
});
