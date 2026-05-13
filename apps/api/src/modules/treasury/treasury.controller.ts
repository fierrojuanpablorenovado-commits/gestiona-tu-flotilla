import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TreasuryService } from './treasury.service';

@Controller('treasury')
@ApiTags('treasury')
export class TreasuryController {
  constructor(private readonly service: TreasuryService) {}
}
