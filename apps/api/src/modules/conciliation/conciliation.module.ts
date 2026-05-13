import { Module } from '@nestjs/common';
import { ConciliationController } from './conciliation.controller';
import { ConciliationService } from './conciliation.service';

@Module({
  controllers: [ConciliationController],
  providers: [ConciliationService],
  exports: [ConciliationService],
})
export class ConciliationModule {}
