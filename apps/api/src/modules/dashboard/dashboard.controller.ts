import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@ApiTags('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
}
