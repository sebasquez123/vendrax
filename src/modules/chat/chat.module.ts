import { Module } from '@nestjs/common';
import { McpClientModule } from '~/modules/mcp_client/mcp_client.module';
import { McpAgentModule } from '~/modules/agent/mcp_agent.module';
import { DomainContextModule } from '~/modules/context/context.module';

import { ChatController } from './presentation/controllers/chat.controller';
import { ChatService } from './application/chat.service';
import { AuthModule } from '../auth/auth.module';
import { ToolsModule } from '../tools/tools.module';
import { MainGateway } from './presentation/gateways/main.gateway';
import { ConnectionMiddleware } from '~/shared/middlewares/connection.middleware';
import { AdminModule } from '../admin/admin.module';
import { CacheModule } from '../cache/cache.module';
@Module({
  imports: [McpClientModule, McpAgentModule, DomainContextModule, AuthModule, ToolsModule, AdminModule, CacheModule],
  controllers: [ChatController],
  providers: [ChatService, MainGateway, ConnectionMiddleware],
  exports: [ChatService],
})
export class ChatModule {}
