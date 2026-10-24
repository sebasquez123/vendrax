import { Module } from '@nestjs/common';

import { AdminService } from './application/admin.service';
import { AdminController } from './presentation/controllers/admin.controller';

@Module({
  imports: [],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
