import { MiddlewareConsumer, Module, NestModule, RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { McpClientModule } from '~/modules/mcp_client/mcp_client.module';
import { ChatModule } from '~/modules/chat/chat.module';
import { McpAgentModule } from './modules/agent/mcp_agent.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { LoggingInterceptor } from './shared/interceptors/main.interceptor';
import { ToolsModule } from './modules/tools/tools.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { addTransactionalDataSource, getDataSourceByName } from 'typeorm-transactional';
import config from './config';
import { QueryLogger } from './shared/logging/query.logger';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { ApiKeyMiddleware } from './shared/middlewares/api_key.middleware';
import path from 'node:path';
import { AcceptLanguageResolver, HeaderResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { CacheModule } from './modules/cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...config.dbConfig,
        entities: [...config.dbConfig.entities],
        migrations: [...config.dbConfig.migrations],
        logger: new QueryLogger(),
      }),
      async dataSourceFactory(options) {
        if (!options) throw new Error('Invalid options passed');
        const dataSourceName = 'name' in options && typeof options.name === 'string' ? options.name : 'default';
        const dataSource = getDataSourceByName(dataSourceName) ?? addTransactionalDataSource(new DataSource(options));
        if (!dataSource.isInitialized) await dataSource.initialize();
        return dataSource;
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'es',
      fallbacks: { 'es-*': 'es', 'en-*': 'en' },
      loaderOptions: { path: path.join(__dirname, 'shared', 'services', 'i18n', 'locales'), watch: false },
      resolvers: [{ use: QueryResolver, options: ['lang'] }, new HeaderResolver(['x-lang']), AcceptLanguageResolver],
    }),
    ChatModule,
    McpClientModule,
    McpAgentModule,
    ToolsModule,
    AdminModule,
    AuthModule,
  ],
  controllers: [],
  exports: [CacheModule],
  providers: [
    CacheModule,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: false,
        transform: false,
        forbidNonWhitelisted: false,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(ApiKeyMiddleware)
      .exclude(
        { path: 'auth/oauth/callback', method: RequestMethod.GET },
        { path: 'admin/health', method: RequestMethod.GET },
        { path: 'admin/health/database', method: RequestMethod.GET }
      )
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
