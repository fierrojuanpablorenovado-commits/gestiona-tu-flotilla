import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RecruitmentService } from './recruitment.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { CandidateFiltersDto } from './dto/candidate-filters.dto';
import {
  ScheduleInterviewDto,
  CompleteInterviewDto,
  UploadDocumentDto,
  ReviewDocumentDto,
  RejectCandidateDto,
  MoveStageDto,
} from './dto/schedule-interview.dto';

const DEFAULT_TENANT = 'tenant-default';

@Controller('recruitment')
@ApiTags('Reclutamiento')
export class RecruitmentController {
  constructor(private readonly service: RecruitmentService) {}

  // ──────────────────────────────────────────────
  //  Candidates
  // ──────────────────────────────────────────────

  @Get('candidates')
  @ApiOperation({ summary: 'Listar candidatos con filtros y paginacion' })
  @ApiResponse({ status: 200, description: 'Lista paginada de candidatos' })
  findAllCandidates(@Query() filters: CandidateFiltersDto) {
    return this.service.findAllCandidates(DEFAULT_TENANT, filters);
  }

  @Get('candidates/:id')
  @ApiOperation({ summary: 'Detalle completo de un candidato' })
  @ApiParam({ name: 'id', description: 'ID del candidato' })
  @ApiResponse({ status: 200, description: 'Detalle del candidato con entrevistas y documentos' })
  @ApiResponse({ status: 404, description: 'Candidato no encontrado' })
  findCandidate(@Param('id') id: string) {
    return this.service.findCandidate(DEFAULT_TENANT, id);
  }

  @Post('candidates')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo candidato' })
  @ApiResponse({ status: 201, description: 'Candidato creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos invalidos' })
  createCandidate(@Body() dto: CreateCandidateDto) {
    return this.service.createCandidate(DEFAULT_TENANT, dto);
  }

  @Patch('candidates/:id')
  @ApiOperation({ summary: 'Actualizar datos de un candidato' })
  @ApiParam({ name: 'id', description: 'ID del candidato' })
  @ApiResponse({ status: 200, description: 'Candidato actualizado' })
  @ApiResponse({ status: 404, description: 'Candidato no encontrado' })
  updateCandidate(
    @Param('id') id: string,
    @Body() dto: UpdateCandidateDto,
  ) {
    return this.service.updateCandidate(DEFAULT_TENANT, id, dto);
  }

  @Post('candidates/:id/move-stage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mover candidato a otra etapa del pipeline' })
  @ApiParam({ name: 'id', description: 'ID del candidato' })
  @ApiResponse({ status: 200, description: 'Candidato movido de etapa' })
  @ApiResponse({ status: 400, description: 'Movimiento no permitido' })
  @ApiResponse({ status: 404, description: 'Candidato no encontrado' })
  moveToStage(
    @Param('id') id: string,
    @Body() dto: MoveStageDto,
  ) {
    return this.service.moveToStage(DEFAULT_TENANT, id, dto.stageId, dto.notes);
  }

  @Post('candidates/:id/schedule-interview')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Agendar entrevista para un candidato' })
  @ApiParam({ name: 'id', description: 'ID del candidato' })
  @ApiResponse({ status: 201, description: 'Entrevista agendada' })
  @ApiResponse({ status: 400, description: 'Datos invalidos o conflicto de horario' })
  @ApiResponse({ status: 404, description: 'Candidato no encontrado' })
  scheduleInterview(
    @Param('id') id: string,
    @Body() dto: ScheduleInterviewDto,
  ) {
    return this.service.scheduleInterview(DEFAULT_TENANT, id, dto);
  }

  @Post('candidates/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aprobar candidato y crear registro de conductor' })
  @ApiParam({ name: 'id', description: 'ID del candidato' })
  @ApiResponse({ status: 200, description: 'Candidato aprobado y registro de conductor creado' })
  @ApiResponse({ status: 400, description: 'No cumple requisitos para aprobacion' })
  @ApiResponse({ status: 404, description: 'Candidato no encontrado' })
  approveCandidate(@Param('id') id: string) {
    return this.service.approveCandidate(DEFAULT_TENANT, id);
  }

  @Post('candidates/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rechazar candidato' })
  @ApiParam({ name: 'id', description: 'ID del candidato' })
  @ApiResponse({ status: 200, description: 'Candidato rechazado' })
  @ApiResponse({ status: 400, description: 'No se puede rechazar' })
  @ApiResponse({ status: 404, description: 'Candidato no encontrado' })
  rejectCandidate(
    @Param('id') id: string,
    @Body() dto: RejectCandidateDto,
  ) {
    return this.service.rejectCandidate(DEFAULT_TENANT, id, dto.reason);
  }

  // ──────────────────────────────────────────────
  //  Pipeline & Dashboard
  // ──────────────────────────────────────────────

  @Get('pipeline')
  @ApiOperation({ summary: 'Tablero kanban del pipeline de reclutamiento' })
  @ApiResponse({ status: 200, description: 'Candidatos agrupados por etapa' })
  getPipelineBoard() {
    return this.service.getPipelineBoard(DEFAULT_TENANT);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Metricas del embudo de reclutamiento' })
  @ApiQuery({ name: 'period', required: false, description: 'Periodo: week, month, quarter' })
  @ApiResponse({ status: 200, description: 'Metricas de reclutamiento' })
  getDashboardMetrics(@Query('period') period?: string) {
    return this.service.getDashboardMetrics(DEFAULT_TENANT, period);
  }

  @Get('sources')
  @ApiOperation({ summary: 'Fuentes de reclutamiento con metricas de rendimiento' })
  @ApiResponse({ status: 200, description: 'Lista de fuentes con performance' })
  getSources() {
    return this.service.getSources(DEFAULT_TENANT);
  }

  @Get('referrals')
  @ApiOperation({ summary: 'Estadisticas del programa de referidos' })
  @ApiResponse({ status: 200, description: 'Metricas del programa de referidos' })
  getReferralStats() {
    return this.service.getReferralStats(DEFAULT_TENANT);
  }

  // ──────────────────────────────────────────────
  //  Interviews
  // ──────────────────────────────────────────────

  @Post('interviews/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registrar resultado de una entrevista' })
  @ApiParam({ name: 'id', description: 'ID de la entrevista' })
  @ApiResponse({ status: 200, description: 'Entrevista completada' })
  @ApiResponse({ status: 400, description: 'No se puede completar' })
  @ApiResponse({ status: 404, description: 'Entrevista no encontrada' })
  completeInterview(
    @Param('id') id: string,
    @Body() dto: CompleteInterviewDto,
  ) {
    return this.service.completeInterview(DEFAULT_TENANT, id, dto);
  }

  // ──────────────────────────────────────────────
  //  Documents
  // ──────────────────────────────────────────────

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar documento de un candidato' })
  @ApiResponse({ status: 201, description: 'Documento registrado' })
  @ApiResponse({ status: 404, description: 'Candidato no encontrado' })
  uploadDocument(@Body() dto: UploadDocumentDto) {
    return this.service.uploadDocument(DEFAULT_TENANT, dto.candidateId, dto);
  }

  @Patch('documents/:id/review')
  @ApiOperation({ summary: 'Aprobar o rechazar un documento' })
  @ApiParam({ name: 'id', description: 'ID del documento' })
  @ApiResponse({ status: 200, description: 'Documento revisado' })
  @ApiResponse({ status: 400, description: 'Datos invalidos' })
  @ApiResponse({ status: 404, description: 'Documento no encontrado' })
  reviewDocument(
    @Param('id') id: string,
    @Body() dto: ReviewDocumentDto,
  ) {
    return this.service.reviewDocument(DEFAULT_TENANT, id, dto);
  }
}
