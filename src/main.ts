import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import config from '~/config';
import { LoggerService } from '~/shared/logging/main.logger';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { API_KEY_HEADER } from '~/shared/services/crypto/crypto';

initializeTransactionalContext();

export const bootstrap = async (): Promise<NestExpressApplication> => {
  const logger = new LoggerService(bootstrap.name);

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new LoggerService('main'),
    cors: true,
    rawBody: true,
  });
  app.disable('x-powered-by');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('MetBot API')
    .setVersion(config.app.version)
    .addApiKey({ type: 'apiKey', name: API_KEY_HEADER, in: 'header' }, API_KEY_HEADER)
    .addSecurityRequirements(API_KEY_HEADER)
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('client-api/swagger', app, document, {
    swaggerOptions: {
      defaultModelsExpandDepth: -1,
    },
  });

  app.enableShutdownHooks();
  await app.listen(config.app.port);
  logger.info(`Listening on ${config.app.port} PORT`);
  logger.info(`Swagger documentation available at ${config.app.url}/client-api/swagger`);

  return app;
};

if (require.main === module) {
  bootstrap().catch((error: unknown) => {
    new LoggerService('main').fatal(
      `Bootstrap failed: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      error instanceof Error ? error.stack : undefined
    );
    process.exitCode = 1;
  });
}
