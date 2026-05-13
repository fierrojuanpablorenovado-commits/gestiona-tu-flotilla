import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';

@Controller('documents')
@ApiTags('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}
}
