import { Module } from '@nestjs/common';
import { ToolsModule } from '~/modules/tools/tools.module';
import { DomainContextService } from './application/context.service';
import { PreloadService } from './application/preload.service';
import { CacheModule } from '~/modules/cache/cache.module';

@Module({
  imports: [ToolsModule, CacheModule],
  providers: [DomainContextService, PreloadService],
  exports: [DomainContextService],
})
export class DomainContextModule {}
