import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DriversService } from './drivers.service';

@Controller('drivers')
@ApiTags('drivers')
export class DriversController {
  constructor(private readonly service: DriversService) {}
}
