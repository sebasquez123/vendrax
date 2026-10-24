import { Module } from '@nestjs/common';

import { ApiOrchestratorService } from './application/api_orchestrator.service';
import { Superset } from './infrastructure';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [ApiOrchestratorService, Superset],
  exports: [ApiOrchestratorService],
})
export class ApiModule {}
