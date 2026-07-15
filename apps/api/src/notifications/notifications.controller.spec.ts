import { RequestMethod, UnauthorizedException } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { NotificationService } from './notification.service';
import { NotificationsController } from './notifications.controller';

describe('NotificationsController', () => {
  const originalTestToken = process.env.NOTIFICATION_TEST_TOKEN;

  afterEach(() => {
    if (originalTestToken === undefined) {
      delete process.env.NOTIFICATION_TEST_TOKEN;
    } else {
      process.env.NOTIFICATION_TEST_TOKEN = originalTestToken;
    }
  });

  it('delega o teste ao NotificationService sem exigir token adicional', async () => {
    delete process.env.NOTIFICATION_TEST_TOKEN;
    const response = {
      success: true,
      message: 'Teste de notificacao processado.',
      channels: { email: 'logged', telegram: 'sent' },
    };
    const sendTest = jest.fn().mockResolvedValue(response);
    const controller = new NotificationsController({
      sendTest,
    } as unknown as NotificationService);

    await expect(controller.test()).resolves.toEqual(response);
    expect(sendTest).toHaveBeenCalledWith();
  });

  it('aceita o token administrativo correto quando configurado', async () => {
    process.env.NOTIFICATION_TEST_TOKEN = 'test-token';
    const sendTest = jest.fn().mockResolvedValue({ success: true });
    const controller = new NotificationsController({
      sendTest,
    } as unknown as NotificationService);

    await expect(controller.test('test-token')).resolves.toEqual({
      success: true,
    });
    expect(sendTest).toHaveBeenCalledTimes(1);
  });

  it('rejeita token administrativo inválido', () => {
    process.env.NOTIFICATION_TEST_TOKEN = 'test-token';
    const controller = new NotificationsController({
      sendTest: jest.fn(),
    } as unknown as NotificationService);

    expect(() => controller.test('invalid-token')).toThrow(
      UnauthorizedException,
    );
  });

  it('expõe POST /notifications/test', () => {
    const handler = Object.getOwnPropertyDescriptor(
      NotificationsController.prototype,
      'test',
    )?.value as object;

    expect(Reflect.getMetadata(PATH_METADATA, NotificationsController)).toBe(
      'notifications',
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('test');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.POST,
    );
  });
});
