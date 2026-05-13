import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';

@Controller('contracts')
@ApiTags('contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}
}
