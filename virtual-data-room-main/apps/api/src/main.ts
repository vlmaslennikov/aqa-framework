import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const corsOrigin = config
    .getOrThrow<string>('CORS_ORIGIN')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (corsOrigin.length === 0) {
    throw new Error('CORS_ORIGIN is required');
  }
  app.enableCors({ origin: corsOrigin });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(process.env.PORT ?? 3000, '::');

  console.log(`Listening on ${await app.getUrl()}`);
}
bootstrap();
