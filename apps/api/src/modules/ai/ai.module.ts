import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { VehiclesModule } from '../vehicles/vehicles.module';

@Module({
  imports: [VehiclesModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
