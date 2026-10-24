import { Module } from '@nestjs/common';

import { CacheService } from './application/cache.service';

@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
