import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DevicesService } from './devices.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const devicesService = app.get(DevicesService);
    const summary =
      await devicesService.checkAllOrganizationsInternal('AUTOMATIC');
    console.log(JSON.stringify(summary));
  } finally {
    await app.close();
  }
}

run().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'Falha no monitoramento automático.',
  );
  process.exitCode = 1;
});
