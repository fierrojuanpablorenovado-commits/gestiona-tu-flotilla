import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConciliationService } from './conciliation.service';

@Controller('conciliation')
@ApiTags('conciliation')
export class ConciliationController {
  constructor(private readonly service: ConciliationService) {}
}
