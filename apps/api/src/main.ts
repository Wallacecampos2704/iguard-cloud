import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'HEAD', 'OPTIONS'],
    credentials: true,
  });

  const port = Number(process.env.API_PORT) || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`iGuard API running on http://0.0.0.0:${port}`);
}

bootstrap();
