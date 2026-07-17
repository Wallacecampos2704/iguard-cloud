import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationService } from './notification.service';

describe('NotificationPreferencesController', () => {
  it('delega leitura e atualização sem receber segredos ou organizationId', async () => {
    const getPreferences = jest.fn().mockResolvedValue({
      telegramEnabled: true,
      timezone: 'America/Sao_Paulo',
    });
    const updatePreferences = jest.fn().mockResolvedValue({
      telegramEnabled: false,
      timezone: 'America/Sao_Paulo',
    });
    const controller = new NotificationPreferencesController({
      getPreferences,
      updatePreferences,
    } as unknown as NotificationService);

    await expect(controller.findOne('customer-1')).resolves.toEqual({
      telegramEnabled: true,
      timezone: 'America/Sao_Paulo',
    });
    expect(getPreferences).toHaveBeenCalledWith(undefined, 'customer-1');

    const input = {
      customerId: 'customer-1',
      telegramEnabled: false,
    };
    await expect(controller.update(input)).resolves.toEqual({
      telegramEnabled: false,
      timezone: 'America/Sao_Paulo',
    });
    expect(updatePreferences).toHaveBeenCalledWith(input);
  });
});
