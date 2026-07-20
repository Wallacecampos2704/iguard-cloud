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
import { DashboardController } from './dashboard.controller';
import type { DashboardService } from './dashboard.service';

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

function route(method: keyof DashboardController) {
  return Object.getOwnPropertyDescriptor(DashboardController.prototype, method)
    ?.value as object;
}

describe('DashboardController routes', () => {
  it('expõe GET /dashboard/summary', () => {
    expect(Reflect.getMetadata(PATH_METADATA, DashboardController)).toBe(
      'dashboard',
    );
    expect(Reflect.getMetadata(PATH_METADATA, route('getSummary'))).toBe(
      'summary',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, route('getSummary'))).toBe(
      RequestMethod.GET,
    );
  });
});

describe('DashboardController guards', () => {
  it('aplica SessionGuard na classe inteira', () => {
    const classGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      DashboardController,
    ) as unknown[] | undefined;

    expect(classGuards).toContain(SessionGuard);
  });

  it('não aplica RolesGuard nem @Roles em getSummary', () => {
    const methodGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      route('getSummary'),
    ) as unknown[] | undefined;
    const roles = Reflect.getMetadata(ROLES_KEY, route('getSummary')) as
      | UserRole[]
      | undefined;

    expect(methodGuards ?? []).not.toContain(RolesGuard);
    expect(roles).toBeUndefined();
  });
});

describe('DashboardController behavior', () => {
  function buildController() {
    const getSummary = jest.fn();
    const service = { getSummary } as unknown as DashboardService;
    const controller = new DashboardController(service);

    return { controller, getSummary };
  }

  it('encaminha organizationId do usuário autenticado para o service', async () => {
    const { controller, getSummary } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });

    await controller.getSummary(user);

    expect(getSummary).toHaveBeenCalledWith('organization-1');
  });

  it('retorna o resultado devolvido pelo service', async () => {
    const { controller, getSummary } = buildController();
    const summary = { totalDevices: 4 };
    getSummary.mockResolvedValue(summary);
    const user = buildUser({ organizationId: 'organization-1' });

    await expect(controller.getSummary(user)).resolves.toBe(summary);
  });

  it('usuário com organizationId vazio recebe ForbiddenException sem chamar o service', () => {
    const { controller, getSummary } = buildController();
    const invalidUser = buildUser({ organizationId: '' });

    expect(() => controller.getSummary(invalidUser)).toThrow(
      ForbiddenException,
    );
    expect(getSummary).not.toHaveBeenCalled();
  });

  it('usuário com organizationId somente espaços recebe ForbiddenException sem chamar o service', () => {
    const { controller, getSummary } = buildController();
    const invalidUser = buildUser({ organizationId: '   ' });

    expect(() => controller.getSummary(invalidUser)).toThrow(
      ForbiddenException,
    );
    expect(getSummary).not.toHaveBeenCalled();
  });

  it('usuário MASTER com organizationId null recebe ForbiddenException sem chamar o service', () => {
    const { controller, getSummary } = buildController();
    const master = buildUser({ organizationId: null, role: UserRole.MASTER });

    expect(() => controller.getSummary(master)).toThrow(ForbiddenException);
    expect(getSummary).not.toHaveBeenCalled();
  });
});
