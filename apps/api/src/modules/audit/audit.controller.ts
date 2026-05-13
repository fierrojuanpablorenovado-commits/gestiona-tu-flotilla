import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';

@Controller('audit')
@ApiTags('audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}
}
