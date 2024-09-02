import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { envs } from './config/envs';

async function bootstrap() {
  const logger = new Logger('Orders bootstrap');

  const app = await NestFactory.create(AppModule);
  await app.listen(envs.port);

  logger.log(`Application listening on port ${envs.port}`);
}
bootstrap();
