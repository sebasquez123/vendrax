import { Module } from '@nestjs/common';

import { RagService } from './application/rag.service';

@Module({
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
