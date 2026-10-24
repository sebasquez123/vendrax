import { Module } from '@nestjs/common';
import { RouterOrchestratorService } from './application/router_orchestrator.service';
import { McpAgentModule } from '../agent/mcp_agent.module';

@Module({
  imports: [McpAgentModule],
  providers: [RouterOrchestratorService],
  exports: [RouterOrchestratorService],
})
export class RouterModule {}
