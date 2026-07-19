import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

const DEV_ORIGIN = 'http://localhost:3000';

type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

function parseOrigins(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  const isProduction = process.env.NODE_ENV === 'production';
  const configuredOrigins = parseOrigins(process.env.CORS_ORIGIN);
  const allowedOrigins = isProduction
    ? configuredOrigins
    : [...new Set([...configuredOrigins, DEV_ORIGIN])];

  if (isProduction && allowedOrigins.length === 0) {
    console.warn(
      'CORS_ORIGIN não configurada em produção: nenhuma origem cross-origin será permitida.',
    );
  }

  app.enableCors({
    origin(origin: string | undefined, callback: CorsOriginCallback): void {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origem não permitida por CORS: ${origin}`));
    },
    credentials: allowedOrigins.length > 0,
  });

  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
