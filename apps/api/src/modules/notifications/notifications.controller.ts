import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@ApiTags('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}
}
