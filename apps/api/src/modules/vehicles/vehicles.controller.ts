import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, VehicleStatus } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleFiltersDto } from './dto/vehicle-filters.dto';
import {
  VehicleResponseDto,
  PaginatedVehiclesDto,
  TimelineEventDto,
  FinancialSummaryDto,
  HealthScoreDto,
  DashboardStatsDto,
} from './dto/vehicle-response.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions, PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('vehicles')
@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  /**
   * Lista todos los vehiculos del tenant con paginacion y filtros.
   */
  @Get()
  @RequirePermissions('vehicles.view')
  @ApiOperation({
    summary: 'Listar vehiculos',
    description: 'Obtiene la lista paginada de vehiculos con filtros opcionales por estado, marca, anio, partner y conductor.',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de vehiculos', type: PaginatedVehiclesDto })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos suficientes' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() filters: VehicleFiltersDto,
  ): Promise<PaginatedVehiclesDto> {
    return this.vehiclesService.findAll(tenantId, filters);
  }

  /**
   * Obtiene estadisticas del dashboard de vehiculos.
   * NOTA: Esta ruta debe ir antes de :id para evitar conflictos.
   */
  @Get('stats')
  @RequirePermissions('vehicles.view')
  @ApiOperation({
    summary: 'Estadisticas del dashboard',
    description: 'Obtiene conteos por estado, alertas activas, distribucion por marca y resumen financiero de la flota.',
  })
  @ApiResponse({ status: 200, description: 'Estadisticas de la flota', type: DashboardStatsDto })
  async getDashboardStats(
    @CurrentTenant() tenantId: string,
  ): Promise<DashboardStatsDto> {
    return this.vehiclesService.getDashboardStats(tenantId);
  }

  /**
   * Obtiene un vehiculo por su ID con todos los detalles.
   */
  @Get(':id')
  @RequirePermissions('vehicles.view')
  @ApiOperation({
    summary: 'Obtener vehiculo por ID',
    description: 'Obtiene los detalles completos de un vehiculo incluyendo seguro, servicio, partner y conductor asignado.',
  })
  @ApiParam({ name: 'id', description: 'ID del vehiculo', example: 'veh-001' })
  @ApiResponse({ status: 200, description: 'Detalle del vehiculo', type: VehicleResponseDto })
  @ApiResponse({ status: 404, description: 'Vehiculo no encontrado' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.findOne(tenantId, id);
  }

  /**
   * Crea un nuevo vehiculo en la flota.
   */
  @Post()
  @RequirePermissions('vehicles.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear vehiculo',
    description: 'Registra un nuevo vehiculo en la flota del tenant con todos sus datos de adquisicion y seguro.',
  })
  @ApiResponse({ status: 201, description: 'Vehiculo creado exitosamente', type: VehicleResponseDto })
  @ApiResponse({ status: 400, description: 'Datos de entrada invalidos' })
  @ApiResponse({ status: 409, description: 'Vehiculo duplicado (numero economico, placas o VIN)' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateVehicleDto,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.create(tenantId, dto);
  }

  /**
   * Actualiza los datos de un vehiculo.
   */
  @Patch(':id')
  @RequirePermissions('vehicles.edit')
  @ApiOperation({
    summary: 'Actualizar vehiculo',
    description: 'Actualiza parcialmente los datos de un vehiculo existente.',
  })
  @ApiParam({ name: 'id', description: 'ID del vehiculo', example: 'veh-001' })
  @ApiResponse({ status: 200, description: 'Vehiculo actualizado', type: VehicleResponseDto })
  @ApiResponse({ status: 404, description: 'Vehiculo no encontrado' })
  @ApiResponse({ status: 409, description: 'Conflicto con placas o VIN existentes' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.update(tenantId, id, dto);
  }

  /**
   * Cambia el estado de un vehiculo con razon de auditoria.
   */
  @Patch(':id/status')
  @RequirePermissions('vehicles.edit')
  @ApiOperation({
    summary: 'Cambiar estado del vehiculo',
    description: 'Actualiza el estado de un vehiculo con una razon obligatoria para auditoria. Algunas transiciones desasignan automaticamente al conductor.',
  })
  @ApiParam({ name: 'id', description: 'ID del vehiculo', example: 'veh-001' })
  @ApiResponse({ status: 200, description: 'Estado actualizado', type: VehicleResponseDto })
  @ApiResponse({ status: 400, description: 'Transicion de estado no permitida' })
  @ApiResponse({ status: 404, description: 'Vehiculo no encontrado' })
  async updateStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body('status') status: VehicleStatus,
    @Body('reason') reason: string,
  ): Promise<VehicleResponseDto> {
    if (!status) {
      throw new BadRequestException(
        'El campo status es obligatorio',
      );
    }
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException(
        'El campo reason es obligatorio para cambios de estado',
      );
    }
    return this.vehiclesService.updateStatus(tenantId, id, status, reason);
  }

  /**
   * Obtiene la linea de tiempo unificada de un vehiculo.
   */
  @Get(':id/timeline')
  @RequirePermissions('vehicles.view')
  @ApiOperation({
    summary: 'Timeline del vehiculo',
    description: 'Obtiene la linea de tiempo unificada con todos los eventos del vehiculo: cambios de estado, mantenimientos, incidentes, documentos y pagos.',
  })
  @ApiParam({ name: 'id', description: 'ID del vehiculo', example: 'veh-001' })
  @ApiResponse({ status: 200, description: 'Lista de eventos del timeline', type: [TimelineEventDto] })
  @ApiResponse({ status: 404, description: 'Vehiculo no encontrado' })
  async getTimeline(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<TimelineEventDto[]> {
    return this.vehiclesService.getTimeline(tenantId, id);
  }

  /**
   * Obtiene el resumen financiero (P&L) de un vehiculo.
   */
  @Get(':id/financial')
  @RequirePermissions('vehicles.view')
  @ApiOperation({
    summary: 'Resumen financiero del vehiculo',
    description: 'Calcula el estado de resultados (P&L) del vehiculo para un periodo dado, incluyendo ingresos, egresos, utilidad y costo por kilometro.',
  })
  @ApiParam({ name: 'id', description: 'ID del vehiculo', example: 'veh-001' })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Periodo en formato YYYY-MM o rango YYYY-MM:YYYY-MM. Default: ultimos 3 meses.',
    example: '2026-01:2026-03',
  })
  @ApiResponse({ status: 200, description: 'Resumen financiero', type: FinancialSummaryDto })
  @ApiResponse({ status: 400, description: 'Formato de periodo invalido' })
  @ApiResponse({ status: 404, description: 'Vehiculo no encontrado' })
  async getFinancialSummary(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Query('period') period?: string,
  ): Promise<FinancialSummaryDto> {
    return this.vehiclesService.getFinancialSummary(tenantId, id, period);
  }

  /**
   * Calcula el health score de un vehiculo.
   */
  @Get(':id/health-score')
  @RequirePermissions('vehicles.view')
  @ApiOperation({
    summary: 'Health score del vehiculo',
    description: 'Calcula una puntuacion de 0 a 100 basada en mantenimiento, edad, kilometraje, incidentes y seguro. Incluye alertas y recomendaciones.',
  })
  @ApiParam({ name: 'id', description: 'ID del vehiculo', example: 'veh-001' })
  @ApiResponse({ status: 200, description: 'Health score con desglose', type: HealthScoreDto })
  @ApiResponse({ status: 404, description: 'Vehiculo no encontrado' })
  async getHealthScore(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<HealthScoreDto> {
    return this.vehiclesService.getHealthScore(tenantId, id);
  }

  /**
   * Asigna un conductor a un vehiculo.
   */
  @Post(':id/assign-driver')
  @RequirePermissions('vehicles.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Asignar conductor',
    description: 'Asigna un conductor disponible a un vehiculo activo o disponible. El vehiculo cambia automaticamente a estado activo.',
  })
  @ApiParam({ name: 'id', description: 'ID del vehiculo', example: 'veh-008' })
  @ApiResponse({ status: 200, description: 'Conductor asignado exitosamente', type: VehicleResponseDto })
  @ApiResponse({ status: 400, description: 'Vehiculo o conductor no disponible' })
  @ApiResponse({ status: 404, description: 'Vehiculo o conductor no encontrado' })
  async assignDriver(
    @CurrentTenant() tenantId: string,
    @Param('id') vehicleId: string,
    @Body('driverId') driverId: string,
  ): Promise<VehicleResponseDto> {
    if (!driverId) {
      throw new BadRequestException(
        'El campo driverId es obligatorio',
      );
    }
    return this.vehiclesService.assignDriver(tenantId, vehicleId, driverId);
  }

  /**
   * Desasigna el conductor actual de un vehiculo.
   */
  @Delete(':id/unassign-driver')
  @RequirePermissions('vehicles.edit')
  @ApiOperation({
    summary: 'Desasignar conductor',
    description: 'Desasigna al conductor actual del vehiculo. El vehiculo cambia automaticamente a estado disponible.',
  })
  @ApiParam({ name: 'id', description: 'ID del vehiculo', example: 'veh-001' })
  @ApiResponse({ status: 200, description: 'Conductor desasignado exitosamente', type: VehicleResponseDto })
  @ApiResponse({ status: 400, description: 'El vehiculo no tiene conductor asignado' })
  @ApiResponse({ status: 404, description: 'Vehiculo no encontrado' })
  async unassignDriver(
    @CurrentTenant() tenantId: string,
    @Param('id') vehicleId: string,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.unassignDriver(tenantId, vehicleId);
  }
}
