import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';

@Controller('tenants')
@ApiTags('tenants')
export class TenantsController {
  constructor(private readonly service: TenantsService) {}
}
