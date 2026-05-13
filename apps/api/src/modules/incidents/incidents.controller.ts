import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';

@Controller('incidents')
@ApiTags('incidents')
export class IncidentsController {
  constructor(private readonly service: IncidentsService) {}
}
