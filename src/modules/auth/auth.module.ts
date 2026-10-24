import { Module } from '@nestjs/common';

import { AuthOrchestratorService } from './application/auth_orchestrator.service';
import { Pms, Superset, Pay } from './infrastructure';
import { AuthController } from './presentation/controllers/auth.controller';
import { AdminModule } from '../admin/admin.module';
import { McpClientModule } from '../mcp_client/mcp_client.module';
import { McpClientCheckout } from '../mcp_client/application/services/checkout.service';

@Module({
  imports: [AdminModule, McpClientModule, AdminModule],
  providers: [AuthOrchestratorService, McpClientCheckout, Pms, Pay, Superset],
  exports: [AuthOrchestratorService],
  controllers: [AuthController],
})
export class AuthModule {}
