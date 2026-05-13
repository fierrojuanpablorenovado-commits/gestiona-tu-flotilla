import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';

@Controller('maintenance')
@ApiTags('maintenance')
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}
}
