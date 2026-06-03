import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(@Request() req: any, @Body() dto: ChatDto) {
    const tenantId = req.user?.tenantId ?? 'demo-tenant';
    return this.aiService.chat(tenantId, dto.message, dto.history ?? []);
  }
}
