import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum InterviewType {
  PRESENCIAL = 'presencial',
  VIDEOLLAMADA = 'videollamada',
  TELEFONICA = 'telefonica',
}

export class ScheduleInterviewDto {
  @ApiProperty({ example: '2026-03-25T10:00:00.000Z', description: 'Fecha y hora de la entrevista' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ enum: InterviewType, example: InterviewType.PRESENCIAL, description: 'Tipo de entrevista' })
  @IsEnum(InterviewType)
  interviewType: InterviewType;

  @ApiPropertyOptional({ example: 'Oficina Guadalajara - Av. Americas 1254', description: 'Ubicacion fisica' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-defg-hij', description: 'Link de videollamada' })
  @IsOptional()
  @IsUrl()
  meetingLink?: string;

  @ApiProperty({ example: 'user-recruiter-01', description: 'ID del entrevistador' })
  @IsString()
  interviewerId: string;
}

export class CompleteInterviewDto {
  @ApiProperty({ example: 82, description: 'Puntuacion de la entrevista (0-100)' })
  score: number;

  @ApiPropertyOptional({ example: 'Buena comunicacion, experiencia verificada.', description: 'Notas de la entrevista' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UploadDocumentDto {
  @ApiProperty({ example: 'cand-015', description: 'ID del candidato' })
  @IsString()
  candidateId: string;

  @ApiProperty({ example: 'INE', description: 'Tipo de documento' })
  @IsString()
  @MaxLength(100)
  type: string;

  @ApiProperty({ example: 'ine_carlos_hernandez.pdf', description: 'Nombre del archivo' })
  @IsString()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({ example: '/uploads/recruitment/cand-015/ine_carlos_hernandez.pdf', description: 'URL del archivo' })
  @IsString()
  fileUrl: string;
}

export class ReviewDocumentDto {
  @ApiProperty({ enum: ['approved', 'rejected'], example: 'approved', description: 'Resultado de la revision' })
  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @ApiPropertyOptional({ example: 'Documento ilegible', description: 'Razon de rechazo' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}

export class RejectCandidateDto {
  @ApiProperty({ example: 'No cumple con los requisitos minimos de experiencia', description: 'Razon del rechazo' })
  @IsString()
  @MaxLength(500)
  reason: string;
}

export class MoveStageDto {
  @ApiProperty({ example: 'stage-contactado', description: 'ID de la nueva etapa' })
  @IsString()
  stageId: string;

  @ApiPropertyOptional({ example: 'Candidato contactado por WhatsApp', description: 'Notas del movimiento' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
