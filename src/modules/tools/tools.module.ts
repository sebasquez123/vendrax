import { Module } from '@nestjs/common';

import { ToolOrchestratorService } from './application/tools_orchestrator.service';
import { AuthModule } from '../auth/auth.module';
import { Oauth, Jwt, Mcp } from './application/providers';
import { AdminModule } from '../admin/admin.module';
import { ApiModule } from '../api/api.module';
import { RagModule } from '../RAG/rag.module';
@Module({
  controllers: [],
  imports: [AuthModule, AdminModule, ApiModule, RagModule],
  providers: [ToolOrchestratorService, Mcp, Jwt, Oauth],
  exports: [ToolOrchestratorService],
})
export class ToolsModule {}
