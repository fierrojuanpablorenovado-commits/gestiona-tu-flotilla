import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PartnersService } from './partners.service';

@Controller('partners')
@ApiTags('partners')
export class PartnersController {
  constructor(private readonly service: PartnersService) {}
}
