import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RolesGuard } from '../auth/roles.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { SessionGuard } from '../auth/session.guard';
import { NotificationPreferencesController } from './notification-preferences.controller';
import type { NotificationService } from './notification.service';

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

function route(method: keyof NotificationPreferencesController) {
  return Object.getOwnPropertyDescriptor(
    NotificationPreferencesController.prototype,
    method,
  )?.value as object;
}

describe('NotificationPreferencesController guards', () => {
  it('aplica SessionGuard na classe inteira', () => {
    const classGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      NotificationPreferencesController,
    ) as unknown[] | undefined;

    expect(classGuards).toContain(SessionGuard);
  });

  it('não aplica RolesGuard nem @Roles em findOne/update', () => {
    const methods: Array<keyof NotificationPreferencesController> = [
      'findOne',
      'update',
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

describe('NotificationPreferencesController behavior', () => {
  function buildController() {
    const getPreferences = jest.fn();
    const updatePreferences = jest.fn();

    const service = {
      getPreferences,
      updatePreferences,
    } as unknown as NotificationService;
    const controller = new NotificationPreferencesController(service);

    return { controller, getPreferences, updatePreferences };
  }

  it('findOne encaminha organizationId da sessão e customerId da query', async () => {
    const { controller, getPreferences } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });
    getPreferences.mockResolvedValue({
      telegramEnabled: true,
      timezone: 'America/Sao_Paulo',
    });

    await expect(controller.findOne(user, 'customer-1')).resolves.toEqual({
      telegramEnabled: true,
      timezone: 'America/Sao_Paulo',
    });
    expect(getPreferences).toHaveBeenCalledWith('organization-1', 'customer-1');
  });

  it('update encaminha organizationId da sessão e o input, sem organizationId no body', async () => {
    const { controller, updatePreferences } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });
    const input = { customerId: 'customer-1', telegramEnabled: false };
    updatePreferences.mockResolvedValue({
      telegramEnabled: false,
      timezone: 'America/Sao_Paulo',
    });

    await expect(controller.update(user, input)).resolves.toEqual({
      telegramEnabled: false,
      timezone: 'America/Sao_Paulo',
    });
    expect(updatePreferences).toHaveBeenCalledWith('organization-1', input);
  });

  it('usuário com organizationId vazio ou só espaços recebe ForbiddenException sem chamar o service', () => {
    const { controller, getPreferences, updatePreferences } = buildController();
    const invalidUser = buildUser({ organizationId: '   ' });

    expect(() => controller.findOne(invalidUser)).toThrow(ForbiddenException);
    expect(() => controller.update(invalidUser, {})).toThrow(
      ForbiddenException,
    );
    expect(getPreferences).not.toHaveBeenCalled();
    expect(updatePreferences).not.toHaveBeenCalled();
  });

  it('usuário MASTER com organizationId null recebe ForbiddenException sem chamar o service', () => {
    const { controller, getPreferences, updatePreferences } = buildController();
    const master = buildUser({ organizationId: null, role: UserRole.MASTER });

    expect(() => controller.findOne(master)).toThrow(ForbiddenException);
    expect(() => controller.update(master, {})).toThrow(ForbiddenException);
    expect(getPreferences).not.toHaveBeenCalled();
    expect(updatePreferences).not.toHaveBeenCalled();
  });
});
