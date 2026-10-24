import { Module } from '@nestjs/common';

import { AgentOrchestratorService } from './application/agent_orchestrator.service';
import { Gemini, OpenAi } from './infrastructure';

@Module({
  providers: [AgentOrchestratorService, Gemini, OpenAi],
  exports: [AgentOrchestratorService],
})
export class McpAgentModule {}
