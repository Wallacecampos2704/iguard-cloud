import {
  ForbiddenException,
  RequestMethod,
  UnauthorizedException,
} from '@nestjs/common';
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
import { NotificationsController } from './notifications.controller';
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

function route(method: keyof NotificationsController) {
  return Object.getOwnPropertyDescriptor(
    NotificationsController.prototype,
    method,
  )?.value as object;
}

describe('NotificationsController routes', () => {
  it('expõe GET /notifications', () => {
    expect(Reflect.getMetadata(PATH_METADATA, NotificationsController)).toBe(
      'notifications',
    );
    expect(Reflect.getMetadata(PATH_METADATA, route('findAll'))).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, route('findAll'))).toBe(
      RequestMethod.GET,
    );
  });

  it('expõe GET /notifications/stats', () => {
    expect(Reflect.getMetadata(PATH_METADATA, route('stats'))).toBe('stats');
    expect(Reflect.getMetadata(METHOD_METADATA, route('stats'))).toBe(
      RequestMethod.GET,
    );
  });

  it('expõe POST /notifications/test', () => {
    expect(Reflect.getMetadata(PATH_METADATA, route('test'))).toBe('test');
    expect(Reflect.getMetadata(METHOD_METADATA, route('test'))).toBe(
      RequestMethod.POST,
    );
  });

  it('expõe GET /notifications/:id', () => {
    expect(Reflect.getMetadata(PATH_METADATA, route('findOne'))).toBe(':id');
    expect(Reflect.getMetadata(METHOD_METADATA, route('findOne'))).toBe(
      RequestMethod.GET,
    );
  });

  it('expõe POST /notifications/:id/retry', () => {
    expect(Reflect.getMetadata(PATH_METADATA, route('retry'))).toBe(
      ':id/retry',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, route('retry'))).toBe(
      RequestMethod.POST,
    );
  });
});

describe('NotificationsController guards', () => {
  it('aplica SessionGuard na classe inteira', () => {
    const classGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      NotificationsController,
    ) as unknown[] | undefined;

    expect(classGuards).toContain(SessionGuard);
  });

  it('não aplica RolesGuard nem @Roles em nenhum método', () => {
    const methods: Array<keyof NotificationsController> = [
      'findAll',
      'stats',
      'test',
      'findOne',
      'retry',
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

describe('NotificationsController behavior', () => {
  function buildController() {
    const findAll = jest.fn();
    const getStats = jest.fn();
    const findOne = jest.fn();
    const retry = jest.fn();
    const sendTest = jest.fn();

    const service = {
      findAll,
      getStats,
      findOne,
      retry,
      sendTest,
    } as unknown as NotificationService;
    const controller = new NotificationsController(service);

    return { controller, findAll, getStats, findOne, retry, sendTest };
  }

  const originalTestToken = process.env.NOTIFICATION_TEST_TOKEN;

  afterEach(() => {
    if (originalTestToken === undefined) {
      delete process.env.NOTIFICATION_TEST_TOKEN;
    } else {
      process.env.NOTIFICATION_TEST_TOKEN = originalTestToken;
    }
  });

  it('findAll encaminha organizationId do usuário e a query recebida', async () => {
    const { controller, findAll } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });
    const query = { page: '2' };

    await controller.findAll(user, query);

    expect(findAll).toHaveBeenCalledWith('organization-1', query);
  });

  it('stats encaminha somente organizationId do usuário', async () => {
    const { controller, getStats } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });

    await controller.stats(user);

    expect(getStats).toHaveBeenCalledWith('organization-1');
  });

  it('findOne encaminha organizationId e id', async () => {
    const { controller, findOne } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });

    await controller.findOne(user, 'notification-1');

    expect(findOne).toHaveBeenCalledWith('organization-1', 'notification-1');
  });

  it('retry encaminha organizationId e id', async () => {
    const { controller, retry } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });

    await controller.retry(user, 'notification-1');

    expect(retry).toHaveBeenCalledWith('organization-1', 'notification-1');
  });

  it('test delega ao service com organizationId da sessão, sem exigir token adicional quando não configurado', async () => {
    delete process.env.NOTIFICATION_TEST_TOKEN;
    const { controller, sendTest } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });
    sendTest.mockResolvedValue({ success: true });

    await expect(controller.test(user)).resolves.toEqual({ success: true });
    expect(sendTest).toHaveBeenCalledWith('organization-1');
  });

  it('test aceita o token administrativo correto quando configurado', async () => {
    process.env.NOTIFICATION_TEST_TOKEN = 'test-token';
    const { controller, sendTest } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });
    sendTest.mockResolvedValue({ success: true });

    await expect(controller.test(user, 'test-token')).resolves.toEqual({
      success: true,
    });
    expect(sendTest).toHaveBeenCalledWith('organization-1');
  });

  it('test rejeita token administrativo inválido sem chamar o service', () => {
    process.env.NOTIFICATION_TEST_TOKEN = 'test-token';
    const { controller, sendTest } = buildController();
    const user = buildUser({ organizationId: 'organization-1' });

    expect(() => controller.test(user, 'invalid-token')).toThrow(
      UnauthorizedException,
    );
    expect(sendTest).not.toHaveBeenCalled();
  });

  it('test continua exigindo sessão mesmo sem NOTIFICATION_TEST_TOKEN configurado', () => {
    delete process.env.NOTIFICATION_TEST_TOKEN;
    const { controller, sendTest } = buildController();
    const invalidUser = buildUser({ organizationId: '' });

    expect(() => controller.test(invalidUser)).toThrow(ForbiddenException);
    expect(sendTest).not.toHaveBeenCalled();
  });

  it('usuário com organizationId vazio ou só espaços recebe ForbiddenException em todas as rotas', () => {
    const { controller, findAll, getStats, findOne, retry } = buildController();
    const invalidUser = buildUser({ organizationId: '   ' });

    expect(() => controller.findAll(invalidUser, {})).toThrow(
      ForbiddenException,
    );
    expect(() => controller.stats(invalidUser)).toThrow(ForbiddenException);
    expect(() => controller.findOne(invalidUser, 'notification-1')).toThrow(
      ForbiddenException,
    );
    expect(() => controller.retry(invalidUser, 'notification-1')).toThrow(
      ForbiddenException,
    );

    expect(findAll).not.toHaveBeenCalled();
    expect(getStats).not.toHaveBeenCalled();
    expect(findOne).not.toHaveBeenCalled();
    expect(retry).not.toHaveBeenCalled();
  });

  it('usuário MASTER com organizationId null recebe ForbiddenException em todas as rotas, sem chamar o service', () => {
    const { controller, findAll, getStats, findOne, retry, sendTest } =
      buildController();
    const master = buildUser({ organizationId: null, role: UserRole.MASTER });

    expect(() => controller.findAll(master, {})).toThrow(ForbiddenException);
    expect(() => controller.stats(master)).toThrow(ForbiddenException);
    expect(() => controller.findOne(master, 'notification-1')).toThrow(
      ForbiddenException,
    );
    expect(() => controller.retry(master, 'notification-1')).toThrow(
      ForbiddenException,
    );
    expect(() => controller.test(master)).toThrow(ForbiddenException);

    expect(findAll).not.toHaveBeenCalled();
    expect(getStats).not.toHaveBeenCalled();
    expect(findOne).not.toHaveBeenCalled();
    expect(retry).not.toHaveBeenCalled();
    expect(sendTest).not.toHaveBeenCalled();
  });
});
