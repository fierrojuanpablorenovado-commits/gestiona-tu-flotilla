import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { CandidateFiltersDto } from './dto/candidate-filters.dto';
import {
  ScheduleInterviewDto,
  CompleteInterviewDto,
  UploadDocumentDto,
  ReviewDocumentDto,
} from './dto/schedule-interview.dto';
import {
  Candidate,
  Interview,
  CandidateDocument,
  PIPELINE_STAGES,
  RECRUITMENT_SOURCES,
  MOCK_CANDIDATES,
  MOCK_INTERVIEWS,
  MOCK_DOCUMENTS,
  MOCK_METRICS,
  MOCK_REFERRAL_STATS,
} from './recruitment.mock';

@Injectable()
export class RecruitmentService {
  private candidates: Candidate[] = [...MOCK_CANDIDATES];
  private interviews: Interview[] = [...MOCK_INTERVIEWS];
  private documents: CandidateDocument[] = [...MOCK_DOCUMENTS];

  /**
   * Registrar un nuevo candidato en el pipeline de reclutamiento.
   */
  createCandidate(tenantId: string, dto: CreateCandidateDto): Candidate {
    const source = RECRUITMENT_SOURCES.find((s) => s.id === dto.sourceId);
    if (!source) {
      throw new BadRequestException(`Fuente de reclutamiento no encontrada: ${dto.sourceId}`);
    }

    const newCandidate: Candidate = {
      id: `cand-${uuidv4().slice(0, 8)}`,
      tenantId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      email: dto.email || '',
      city: dto.city,
      zone: dto.zone || '',
      hasUberAccount: dto.hasUberAccount,
      hasDidiAccount: dto.hasDidiAccount,
      hasInDriverAccount: dto.hasInDriverAccount,
      uberRating: dto.uberRating ?? null,
      didiRating: dto.didiRating ?? null,
      yearsDriving: dto.yearsDriving,
      hasLicense: dto.hasLicense,
      licenseType: dto.licenseType ?? null,
      licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : null,
      preferredShift: dto.preferredShift,
      weeklyIncomeGoal: dto.weeklyIncomeGoal,
      depositCapacity: dto.depositCapacity,
      sourceId: dto.sourceId,
      referredByDriverId: dto.referredByDriverId ?? null,
      notes: dto.notes ?? null,
      stageId: 'stage-nuevo',
      status: 'active',
      score: 0,
      rejectionReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    newCandidate.score = this.calculateScore(newCandidate);
    this.candidates.push(newCandidate);

    return newCandidate;
  }

  /**
   * Listado paginado de candidatos con filtros.
   */
  findAllCandidates(
    tenantId: string,
    filters: CandidateFiltersDto,
  ): {
    data: Candidate[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } {
    let results = this.candidates.filter((c) => c.tenantId === tenantId);

    if (filters.status) {
      results = results.filter((c) => c.status === filters.status);
    }

    if (filters.stageId) {
      results = results.filter((c) => c.stageId === filters.stageId);
    }

    if (filters.sourceId) {
      results = results.filter((c) => c.sourceId === filters.sourceId);
    }

    if (filters.hasUberAccount !== undefined) {
      results = results.filter((c) => c.hasUberAccount === filters.hasUberAccount);
    }

    if (filters.hasDidiAccount !== undefined) {
      results = results.filter((c) => c.hasDidiAccount === filters.hasDidiAccount);
    }

    if (filters.minScore !== undefined) {
      results = results.filter((c) => c.score >= filters.minScore);
    }

    if (filters.maxScore !== undefined) {
      results = results.filter((c) => c.score <= filters.maxScore);
    }

    if (filters.city) {
      const cityLower = filters.city.toLowerCase();
      results = results.filter((c) => c.city.toLowerCase().includes(cityLower));
    }

    if (filters.search) {
      const term = filters.search.toLowerCase();
      results = results.filter(
        (c) =>
          c.firstName.toLowerCase().includes(term) ||
          c.lastName.toLowerCase().includes(term) ||
          c.phone.includes(term) ||
          c.email.toLowerCase().includes(term),
      );
    }

    // Sort by createdAt descending (newest first)
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const total = results.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    return {
      data: results.slice(offset, offset + limit),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Detalle completo de un candidato, incluyendo entrevistas y documentos.
   */
  findCandidate(
    tenantId: string,
    id: string,
  ): {
    candidate: Candidate;
    interviews: Interview[];
    documents: CandidateDocument[];
    stage: (typeof PIPELINE_STAGES)[0] | undefined;
    source: (typeof RECRUITMENT_SOURCES)[0] | undefined;
  } {
    const candidate = this.candidates.find(
      (c) => c.id === id && c.tenantId === tenantId,
    );

    if (!candidate) {
      throw new NotFoundException(`Candidato no encontrado: ${id}`);
    }

    const candidateInterviews = this.interviews.filter(
      (i) => i.candidateId === id && i.tenantId === tenantId,
    );

    const candidateDocuments = this.documents.filter(
      (d) => d.candidateId === id && d.tenantId === tenantId,
    );

    const stage = PIPELINE_STAGES.find((s) => s.id === candidate.stageId);
    const source = RECRUITMENT_SOURCES.find((s) => s.id === candidate.sourceId);

    return {
      candidate,
      interviews: candidateInterviews,
      documents: candidateDocuments,
      stage,
      source,
    };
  }

  /**
   * Actualizar datos de un candidato.
   */
  updateCandidate(
    tenantId: string,
    id: string,
    dto: UpdateCandidateDto,
  ): Candidate {
    const index = this.candidates.findIndex(
      (c) => c.id === id && c.tenantId === tenantId,
    );

    if (index === -1) {
      throw new NotFoundException(`Candidato no encontrado: ${id}`);
    }

    const candidate = this.candidates[index];

    if (dto.firstName !== undefined) candidate.firstName = dto.firstName;
    if (dto.lastName !== undefined) candidate.lastName = dto.lastName;
    if (dto.phone !== undefined) candidate.phone = dto.phone;
    if (dto.email !== undefined) candidate.email = dto.email;
    if (dto.city !== undefined) candidate.city = dto.city;
    if (dto.zone !== undefined) candidate.zone = dto.zone;
    if (dto.hasUberAccount !== undefined) candidate.hasUberAccount = dto.hasUberAccount;
    if (dto.hasDidiAccount !== undefined) candidate.hasDidiAccount = dto.hasDidiAccount;
    if (dto.hasInDriverAccount !== undefined) candidate.hasInDriverAccount = dto.hasInDriverAccount;
    if (dto.uberRating !== undefined) candidate.uberRating = dto.uberRating;
    if (dto.didiRating !== undefined) candidate.didiRating = dto.didiRating;
    if (dto.yearsDriving !== undefined) candidate.yearsDriving = dto.yearsDriving;
    if (dto.hasLicense !== undefined) candidate.hasLicense = dto.hasLicense;
    if (dto.licenseType !== undefined) candidate.licenseType = dto.licenseType;
    if (dto.licenseExpiry !== undefined) {
      candidate.licenseExpiry = dto.licenseExpiry ? new Date(dto.licenseExpiry) : null;
    }
    if (dto.preferredShift !== undefined) candidate.preferredShift = dto.preferredShift;
    if (dto.weeklyIncomeGoal !== undefined) candidate.weeklyIncomeGoal = dto.weeklyIncomeGoal;
    if (dto.depositCapacity !== undefined) candidate.depositCapacity = dto.depositCapacity;
    if (dto.sourceId !== undefined) candidate.sourceId = dto.sourceId;
    if (dto.referredByDriverId !== undefined) candidate.referredByDriverId = dto.referredByDriverId;
    if (dto.notes !== undefined) candidate.notes = dto.notes;

    candidate.score = this.calculateScore(candidate);
    candidate.updatedAt = new Date();

    this.candidates[index] = candidate;
    return candidate;
  }

  /**
   * Mover candidato a una etapa del pipeline.
   */
  moveToStage(
    tenantId: string,
    candidateId: string,
    stageId: string,
    notes?: string,
  ): Candidate {
    const stage = PIPELINE_STAGES.find((s) => s.id === stageId);
    if (!stage) {
      throw new BadRequestException(`Etapa no encontrada: ${stageId}`);
    }

    const index = this.candidates.findIndex(
      (c) => c.id === candidateId && c.tenantId === tenantId,
    );

    if (index === -1) {
      throw new NotFoundException(`Candidato no encontrado: ${candidateId}`);
    }

    const candidate = this.candidates[index];

    if (candidate.status !== 'active') {
      throw new BadRequestException(
        `No se puede mover un candidato con estatus: ${candidate.status}`,
      );
    }

    const currentStage = PIPELINE_STAGES.find((s) => s.id === candidate.stageId);
    if (currentStage && stage.order < currentStage.order) {
      throw new BadRequestException(
        `No se puede retroceder de "${currentStage.name}" a "${stage.name}"`,
      );
    }

    candidate.stageId = stageId;
    if (notes) {
      candidate.notes = candidate.notes
        ? `${candidate.notes}\n[${new Date().toISOString()}] ${notes}`
        : `[${new Date().toISOString()}] ${notes}`;
    }
    candidate.updatedAt = new Date();

    this.candidates[index] = candidate;
    return candidate;
  }

  /**
   * Calcular puntaje de reclutamiento (0-100) basado en reglas de negocio.
   *
   * Criterios:
   * - Experiencia conduciendo (max 25 pts)
   * - Cuentas en plataformas activas (max 20 pts)
   * - Rating promedio en plataformas (max 20 pts)
   * - Licencia vigente (max 15 pts)
   * - Capacidad de deposito (max 10 pts)
   * - Referido por conductor activo (max 10 pts)
   */
  calculateScore(candidate: Candidate): number {
    let score = 0;

    // Experiencia conduciendo (max 25 pts)
    if (candidate.yearsDriving >= 5) {
      score += 25;
    } else if (candidate.yearsDriving >= 3) {
      score += 18;
    } else if (candidate.yearsDriving >= 2) {
      score += 12;
    } else if (candidate.yearsDriving >= 1) {
      score += 6;
    }

    // Cuentas en plataformas (max 20 pts)
    const platformCount =
      (candidate.hasUberAccount ? 1 : 0) +
      (candidate.hasDidiAccount ? 1 : 0) +
      (candidate.hasInDriverAccount ? 1 : 0);

    if (platformCount >= 3) {
      score += 20;
    } else if (platformCount === 2) {
      score += 14;
    } else if (platformCount === 1) {
      score += 8;
    }

    // Rating promedio (max 20 pts)
    const ratings: number[] = [];
    if (candidate.uberRating) ratings.push(candidate.uberRating);
    if (candidate.didiRating) ratings.push(candidate.didiRating);

    if (ratings.length > 0) {
      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      if (avgRating >= 4.9) {
        score += 20;
      } else if (avgRating >= 4.8) {
        score += 16;
      } else if (avgRating >= 4.7) {
        score += 12;
      } else if (avgRating >= 4.5) {
        score += 8;
      } else {
        score += 4;
      }
    }

    // Licencia vigente (max 15 pts)
    if (candidate.hasLicense) {
      score += 10;
      if (candidate.licenseType === 'C' || candidate.licenseType === 'D' || candidate.licenseType === 'E') {
        score += 5;
      } else if (candidate.licenseType === 'B') {
        score += 3;
      }
    }

    // Capacidad de deposito (max 10 pts)
    if (candidate.depositCapacity >= 5000) {
      score += 10;
    } else if (candidate.depositCapacity >= 3000) {
      score += 7;
    } else if (candidate.depositCapacity >= 2000) {
      score += 4;
    } else if (candidate.depositCapacity > 0) {
      score += 2;
    }

    // Referido por conductor activo (max 10 pts)
    if (candidate.referredByDriverId) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Agendar una entrevista para un candidato.
   */
  scheduleInterview(
    tenantId: string,
    candidateId: string,
    dto: ScheduleInterviewDto,
  ): Interview {
    const candidate = this.candidates.find(
      (c) => c.id === candidateId && c.tenantId === tenantId,
    );

    if (!candidate) {
      throw new NotFoundException(`Candidato no encontrado: ${candidateId}`);
    }

    if (candidate.status !== 'active') {
      throw new BadRequestException(
        `No se puede agendar entrevista para candidato con estatus: ${candidate.status}`,
      );
    }

    const scheduledDate = new Date(dto.scheduledAt);
    if (scheduledDate <= new Date()) {
      throw new BadRequestException('La fecha de la entrevista debe ser futura');
    }

    // Check for scheduling conflicts for the interviewer
    const conflict = this.interviews.find(
      (i) =>
        i.interviewerId === dto.interviewerId &&
        i.status === 'scheduled' &&
        Math.abs(new Date(i.scheduledAt).getTime() - scheduledDate.getTime()) < 3600000, // 1 hour window
    );

    if (conflict) {
      throw new BadRequestException(
        `El entrevistador ya tiene una entrevista agendada cercana a esa hora`,
      );
    }

    const interview: Interview = {
      id: `int-${uuidv4().slice(0, 8)}`,
      tenantId,
      candidateId,
      scheduledAt: scheduledDate,
      interviewType: dto.interviewType,
      location: dto.location ?? null,
      meetingLink: dto.meetingLink ?? null,
      interviewerId: dto.interviewerId,
      interviewerName: this.getInterviewerName(dto.interviewerId),
      status: 'scheduled',
      score: null,
      notes: null,
      completedAt: null,
    };

    this.interviews.push(interview);
    return interview;
  }

  /**
   * Registrar resultado de una entrevista.
   */
  completeInterview(
    tenantId: string,
    interviewId: string,
    dto: CompleteInterviewDto,
  ): Interview {
    const index = this.interviews.findIndex(
      (i) => i.id === interviewId && i.tenantId === tenantId,
    );

    if (index === -1) {
      throw new NotFoundException(`Entrevista no encontrada: ${interviewId}`);
    }

    const interview = this.interviews[index];

    if (interview.status !== 'scheduled') {
      throw new BadRequestException(
        `La entrevista ya tiene estatus: ${interview.status}`,
      );
    }

    if (dto.score < 0 || dto.score > 100) {
      throw new BadRequestException('El puntaje debe estar entre 0 y 100');
    }

    interview.status = 'completed';
    interview.score = dto.score;
    interview.notes = dto.notes ?? null;
    interview.completedAt = new Date();

    this.interviews[index] = interview;
    return interview;
  }

  /**
   * Registrar un documento para un candidato.
   */
  uploadDocument(
    tenantId: string,
    candidateId: string,
    dto: UploadDocumentDto,
  ): CandidateDocument {
    const candidate = this.candidates.find(
      (c) => c.id === candidateId && c.tenantId === tenantId,
    );

    if (!candidate) {
      throw new NotFoundException(`Candidato no encontrado: ${candidateId}`);
    }

    const document: CandidateDocument = {
      id: `doc-${uuidv4().slice(0, 8)}`,
      tenantId,
      candidateId,
      type: dto.type,
      fileName: dto.fileName,
      fileUrl: dto.fileUrl,
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      uploadedAt: new Date(),
    };

    this.documents.push(document);
    return document;
  }

  /**
   * Aprobar o rechazar un documento.
   */
  reviewDocument(
    tenantId: string,
    docId: string,
    dto: ReviewDocumentDto,
  ): CandidateDocument {
    const index = this.documents.findIndex(
      (d) => d.id === docId && d.tenantId === tenantId,
    );

    if (index === -1) {
      throw new NotFoundException(`Documento no encontrado: ${docId}`);
    }

    const document = this.documents[index];

    if (document.status !== 'pending') {
      throw new BadRequestException(
        `El documento ya fue revisado con estatus: ${document.status}`,
      );
    }

    if (dto.status === 'rejected' && !dto.rejectionReason) {
      throw new BadRequestException(
        'Se requiere una razon de rechazo para rechazar el documento',
      );
    }

    document.status = dto.status;
    document.reviewedBy = 'current-user'; // In production, from auth context
    document.reviewedAt = new Date();
    document.rejectionReason = dto.rejectionReason ?? null;

    this.documents[index] = document;
    return document;
  }

  /**
   * Aprobar candidato y crear registro de conductor.
   */
  approveCandidate(
    tenantId: string,
    candidateId: string,
  ): { candidate: Candidate; driverRecord: Record<string, unknown> } {
    const index = this.candidates.findIndex(
      (c) => c.id === candidateId && c.tenantId === tenantId,
    );

    if (index === -1) {
      throw new NotFoundException(`Candidato no encontrado: ${candidateId}`);
    }

    const candidate = this.candidates[index];

    if (candidate.status !== 'active') {
      throw new BadRequestException(
        `No se puede aprobar un candidato con estatus: ${candidate.status}`,
      );
    }

    // Validate candidate is in the documents or interview stage at minimum
    const currentStage = PIPELINE_STAGES.find((s) => s.id === candidate.stageId);
    if (currentStage && currentStage.order < 3) {
      throw new BadRequestException(
        `El candidato debe estar al menos en etapa "Entrevista" para ser aprobado. Etapa actual: "${currentStage.name}"`,
      );
    }

    // Check all required documents are approved
    const candidateDocs = this.documents.filter(
      (d) => d.candidateId === candidateId && d.tenantId === tenantId,
    );
    const pendingDocs = candidateDocs.filter((d) => d.status === 'pending');
    const rejectedDocs = candidateDocs.filter((d) => d.status === 'rejected');

    if (pendingDocs.length > 0) {
      throw new BadRequestException(
        `Hay ${pendingDocs.length} documento(s) pendientes de revision`,
      );
    }

    if (rejectedDocs.length > 0) {
      throw new BadRequestException(
        `Hay ${rejectedDocs.length} documento(s) rechazados que deben ser corregidos`,
      );
    }

    candidate.status = 'approved';
    candidate.stageId = 'stage-aprobado';
    candidate.updatedAt = new Date();
    this.candidates[index] = candidate;

    // Create mock driver record
    const driverRecord = {
      id: `driver-${uuidv4().slice(0, 8)}`,
      tenantId,
      candidateId: candidate.id,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      phone: candidate.phone,
      email: candidate.email,
      city: candidate.city,
      zone: candidate.zone,
      licenseType: candidate.licenseType,
      licenseExpiry: candidate.licenseExpiry,
      status: 'pending_assignment',
      createdAt: new Date(),
    };

    return { candidate, driverRecord };
  }

  /**
   * Rechazar candidato con razon.
   */
  rejectCandidate(
    tenantId: string,
    candidateId: string,
    reason: string,
  ): Candidate {
    const index = this.candidates.findIndex(
      (c) => c.id === candidateId && c.tenantId === tenantId,
    );

    if (index === -1) {
      throw new NotFoundException(`Candidato no encontrado: ${candidateId}`);
    }

    const candidate = this.candidates[index];

    if (candidate.status !== 'active') {
      throw new BadRequestException(
        `No se puede rechazar un candidato con estatus: ${candidate.status}`,
      );
    }

    candidate.status = 'rejected';
    candidate.rejectionReason = reason;
    candidate.updatedAt = new Date();

    this.candidates[index] = candidate;
    return candidate;
  }

  /**
   * Obtener datos del tablero kanban (candidatos agrupados por etapa).
   */
  getPipelineBoard(tenantId: string): {
    stages: Array<{
      id: string;
      name: string;
      order: number;
      color: string;
      candidates: Candidate[];
      count: number;
    }>;
    totalActive: number;
  } {
    const activeCandidates = this.candidates.filter(
      (c) => c.tenantId === tenantId && c.status === 'active',
    );

    const stages = PIPELINE_STAGES.map((stage) => {
      const stageCandidates = activeCandidates
        .filter((c) => c.stageId === stage.id)
        .sort((a, b) => b.score - a.score);

      return {
        ...stage,
        candidates: stageCandidates,
        count: stageCandidates.length,
      };
    });

    return {
      stages,
      totalActive: activeCandidates.length,
    };
  }

  /**
   * Metricas del embudo de reclutamiento.
   */
  getDashboardMetrics(
    tenantId: string,
    period?: string,
  ): typeof MOCK_METRICS & {
    pipeline: { stageId: string; stageName: string; count: number }[];
  } {
    const activeCandidates = this.candidates.filter(
      (c) => c.tenantId === tenantId,
    );

    const pipeline = PIPELINE_STAGES.map((stage) => ({
      stageId: stage.id,
      stageName: stage.name,
      count: activeCandidates.filter(
        (c) => c.stageId === stage.id && c.status === 'active',
      ).length,
    }));

    return {
      ...MOCK_METRICS,
      pipeline,
    };
  }

  /**
   * Estadisticas del programa de referidos.
   */
  getReferralStats(tenantId: string): typeof MOCK_REFERRAL_STATS {
    return MOCK_REFERRAL_STATS;
  }

  /**
   * Listar fuentes de reclutamiento con performance.
   */
  getSources(
    tenantId: string,
  ): Array<
    (typeof RECRUITMENT_SOURCES)[0] & {
      activeCandidates: number;
      totalCandidates: number;
      metrics: (typeof MOCK_METRICS.bySource)[0] | null;
    }
  > {
    return RECRUITMENT_SOURCES.map((source) => {
      const totalCandidates = this.candidates.filter(
        (c) => c.tenantId === tenantId && c.sourceId === source.id,
      ).length;

      const activeCandidates = this.candidates.filter(
        (c) =>
          c.tenantId === tenantId &&
          c.sourceId === source.id &&
          c.status === 'active',
      ).length;

      const metrics =
        MOCK_METRICS.bySource.find((m) => m.sourceId === source.id) ?? null;

      return {
        ...source,
        activeCandidates,
        totalCandidates,
        metrics,
      };
    });
  }

  /**
   * Helper: get interviewer name from ID (mock).
   */
  private getInterviewerName(interviewerId: string): string {
    const interviewers: Record<string, string> = {
      'user-recruiter-01': 'Ana Lucia Vargas',
      'user-recruiter-02': 'Pedro Rios Campos',
      'user-recruiter-03': 'Sofia Mendez Trejo',
    };
    return interviewers[interviewerId] ?? 'Reclutador';
  }
}
