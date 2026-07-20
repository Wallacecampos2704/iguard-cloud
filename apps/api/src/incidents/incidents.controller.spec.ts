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
import { IncidentsController } from './incidents.controller';
import type { IncidentsService } from './incidents.service';

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

function route(method: keyof IncidentsController) {
  return Object.getOwnPropertyDescriptor(IncidentsController.prototype, method)
    ?.value as object;
}

describe('IncidentsController routes', () => {
  it('expõe GET /incidents', () => {
    expect(Reflect.getMetadata(PATH_METADATA, IncidentsController)).toBe(
      'incidents',
    );
    expect(Reflect.getMetadata(PATH_METADATA, route('findAll'))).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, route('findAll'))).toBe(
      RequestMethod.GET,
    );
  });

  it('expõe GET /incidents/:id', () => {
    expect(Reflect.getMetadata(PATH_METADATA, route('findOne'))).toBe(':id');
    expect(Reflect.getMetadata(METHOD_METADATA, route('findOne'))).toBe(
      RequestMethod.GET,
    );
  });

  it('expõe POST /incidents/:id/acknowledge', () => {
    expect(Reflect.getMetadata(PATH_METADATA, route('acknowledge'))).toBe(
      ':id/acknowledge',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, route('acknowledge'))).toBe(
      RequestMethod.POST,
    );
  });

  it('expõe POST /incidents/:id/resolve', () => {
    expect(Reflect.getMetadata(PATH_METADATA, route('resolve'))).toBe(
      ':id/resolve',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, route('resolve'))).toBe(
      RequestMethod.POST,
    );
  });
});

describe('IncidentsController guards', () => {
  it('aplica SessionGuard na classe inteira', () => {
    const classGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      IncidentsController,
    ) as unknown[] | undefined;

    expect(classGuards).toContain(SessionGuard);
  });

  it('não aplica RolesGuard nem @Roles nesta etapa', () => {
    const methods: Array<keyof IncidentsController> = [
      'findAll',
      'findOne',
      'acknowledge',
      'resolve',
    ];

    for (const method of methods) {
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

describe('IncidentsController behavior', () => {
  function buildController() {
    const findAll = jest.fn();
    const findOne = jest.fn();
    const acknowledge = jest.fn();
    const resolve = jest.fn();

    const service = {
      findAll,
      findOne,
      acknowledge,
      resolve,
    } as unknown as IncidentsService;
    const controller = new IncidentsController(service);

    return { controller, findAll, findOne, acknowledge, resolve };
  }

  it('findAll encaminha organizationId do usuário', async () => {
    const { controller, findAll } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });

    await controller.findAll(user);

    expect(findAll).toHaveBeenCalledWith('organization-1');
  });

  it('findOne encaminha organizationId e id', async () => {
    const { controller, findOne } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });

    await controller.findOne(user, 'incident-1');

    expect(findOne).toHaveBeenCalledWith('organization-1', 'incident-1');
  });

  it('acknowledge encaminha organizationId e id', async () => {
    const { controller, acknowledge } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });

    await controller.acknowledge(user, 'incident-1');

    expect(acknowledge).toHaveBeenCalledWith('organization-1', 'incident-1');
  });

  it('resolve encaminha organizationId e id', async () => {
    const { controller, resolve } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });

    await controller.resolve(user, 'incident-1');

    expect(resolve).toHaveBeenCalledWith('organization-1', 'incident-1');
  });

  it('usuário sem organizationId (apenas espaços) recebe ForbiddenException em findAll', () => {
    const { controller, findAll } = buildController();
    const invalidUser = buildUser({ organizationId: '   ' });

    expect(() => controller.findAll(invalidUser)).toThrow(ForbiddenException);
    expect(findAll).not.toHaveBeenCalled();
  });

  it('usuário MASTER com organizationId null não chama o service em nenhuma rota', () => {
    const { controller, findAll, findOne, acknowledge, resolve } =
      buildController();
    const master = buildUser({ organizationId: null, role: UserRole.MASTER });

    expect(() => controller.findAll(master)).toThrow(ForbiddenException);
    expect(() => controller.findOne(master, 'incident-1')).toThrow(
      ForbiddenException,
    );
    expect(() => controller.acknowledge(master, 'incident-1')).toThrow(
      ForbiddenException,
    );
    expect(() => controller.resolve(master, 'incident-1')).toThrow(
      ForbiddenException,
    );

    expect(findAll).not.toHaveBeenCalled();
    expect(findOne).not.toHaveBeenCalled();
    expect(acknowledge).not.toHaveBeenCalled();
    expect(resolve).not.toHaveBeenCalled();
  });
});
