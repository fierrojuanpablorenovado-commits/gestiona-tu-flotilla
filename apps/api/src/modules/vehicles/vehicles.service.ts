import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { CreateVehicleDto, VehicleStatus } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleFiltersDto } from './dto/vehicle-filters.dto';
import {
  VehicleResponseDto,
  VehicleListItemDto,
  PaginatedVehiclesDto,
  TimelineEventDto,
  FinancialSummaryDto,
  HealthScoreDto,
  DashboardStatsDto,
} from './dto/vehicle-response.dto';
import {
  MOCK_VEHICLES,
  MOCK_TIMELINE_EVENTS,
  MOCK_DRIVERS,
  MockVehicle,
  MockTimelineEvent,
} from './vehicles.mock';

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);
  private vehicles: MockVehicle[] = [...MOCK_VEHICLES];
  private timelineEvents: MockTimelineEvent[] = [...MOCK_TIMELINE_EVENTS];
  private drivers = [...MOCK_DRIVERS];

  /**
   * Crea un nuevo vehiculo en la flota del tenant.
   *
   * @param tenantId - ID del tenant autenticado
   * @param dto - Datos del vehiculo a crear
   * @returns El vehiculo creado con formato de respuesta completo
   * @throws ConflictException si el numero economico, placas o VIN ya existen
   */
  async create(tenantId: string, dto: CreateVehicleDto): Promise<VehicleResponseDto> {
    this.logger.log(`Creando vehiculo para tenant ${tenantId}: ${dto.economicNumber}`);

    // Validar que no exista duplicado por numero economico
    const existingByEco = this.vehicles.find(
      (v) => v.tenantId === tenantId && v.economicNumber === dto.economicNumber,
    );
    if (existingByEco) {
      throw new ConflictException(
        `Ya existe un vehiculo con numero economico ${dto.economicNumber}`,
      );
    }

    // Validar que no exista duplicado por placas
    const existingByPlates = this.vehicles.find(
      (v) => v.tenantId === tenantId && v.plates === dto.plates,
    );
    if (existingByPlates) {
      throw new ConflictException(
        `Ya existe un vehiculo con placas ${dto.plates}`,
      );
    }

    // Validar que no exista duplicado por VIN
    const existingByVin = this.vehicles.find((v) => v.vin === dto.vin);
    if (existingByVin) {
      throw new ConflictException(
        `Ya existe un vehiculo con VIN ${dto.vin}`,
      );
    }

    // Resolver nombre del partner si aplica
    let partnerName: string | null = null;
    if (dto.partnerId) {
      const partnerNames: Record<string, string> = {
        'prt-001': 'Transportes del Valle CDMX',
        'prt-002': 'Movilidad Guadalajara SA',
        'prt-003': 'Flota Express Monterrey',
        'prt-004': 'Servicio Ejecutivo Puebla',
      };
      partnerName = partnerNames[dto.partnerId] || null;
    }

    const now = new Date().toISOString();
    const newVehicle: MockVehicle = {
      id: `veh-${String(this.vehicles.length + 1).padStart(3, '0')}`,
      tenantId,
      economicNumber: dto.economicNumber,
      brand: dto.brand,
      model: dto.model,
      version: dto.version,
      year: dto.year,
      plates: dto.plates,
      vin: dto.vin,
      color: dto.color,
      acquisitionDate: dto.acquisitionDate,
      acquisitionCost: dto.acquisitionCost,
      acquisitionMethod: dto.acquisitionMethod,
      partnerId: dto.partnerId || null,
      partnerName,
      insurancePolicy: dto.insurancePolicy || null,
      insuranceExpiry: dto.insuranceExpiry || null,
      status: (dto.status as MockVehicle['status']) || 'available',
      statusReason: null,
      statusChangedAt: now,
      currentDriverId: null,
      currentDriverName: null,
      currentOdometer: 0,
      zone: 'Sin asignar',
      fuelType: 'gasolina',
      lastServiceDate: null,
      nextServiceDate: null,
      lastServiceOdometer: null,
      createdAt: now,
      updatedAt: now,
    };

    this.vehicles.push(newVehicle);

    // Agregar evento al timeline
    this.timelineEvents.push({
      id: `evt-${Date.now()}`,
      vehicleId: newVehicle.id,
      tenantId,
      type: 'status_change',
      title: 'Vehiculo dado de alta',
      description: `Se registro el vehiculo ${dto.economicNumber} ${dto.brand} ${dto.model} ${dto.year} en el sistema.`,
      date: now,
      metadata: { fromStatus: null, toStatus: newVehicle.status },
      createdBy: 'system',
    });

    return this.mapToResponse(newVehicle);
  }

  /**
   * Lista vehiculos del tenant con paginacion y filtros.
   *
   * @param tenantId - ID del tenant autenticado
   * @param filters - Filtros de busqueda, paginacion y ordenamiento
   * @returns Lista paginada de vehiculos
   */
  async findAll(tenantId: string, filters: VehicleFiltersDto): Promise<PaginatedVehiclesDto> {
    this.logger.log(`Listando vehiculos para tenant ${tenantId} con filtros: ${JSON.stringify(filters)}`);

    let filtered = this.vehicles.filter((v) => v.tenantId === tenantId);

    // Aplicar filtro por status
    if (filters.status) {
      filtered = filtered.filter((v) => v.status === filters.status);
    }

    // Aplicar filtro por marca
    if (filters.brand) {
      filtered = filtered.filter(
        (v) => v.brand.toLowerCase() === filters.brand!.toLowerCase(),
      );
    }

    // Aplicar filtro por anio
    if (filters.year) {
      filtered = filtered.filter((v) => v.year === filters.year);
    }

    // Aplicar filtro por partner
    if (filters.partnerId) {
      filtered = filtered.filter((v) => v.partnerId === filters.partnerId);
    }

    // Aplicar filtro por conductor asignado
    if (filters.hasDriver !== undefined) {
      filtered = filtered.filter((v) =>
        filters.hasDriver ? v.currentDriverId !== null : v.currentDriverId === null,
      );
    }

    // Aplicar busqueda de texto
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.economicNumber.toLowerCase().includes(search) ||
          v.plates.toLowerCase().includes(search) ||
          v.vin.toLowerCase().includes(search) ||
          v.brand.toLowerCase().includes(search) ||
          v.model.toLowerCase().includes(search) ||
          (v.currentDriverName && v.currentDriverName.toLowerCase().includes(search)),
      );
    }

    // Aplicar ordenamiento
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'DESC';
    filtered.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      if (aVal < bVal) return sortOrder === 'ASC' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });

    // Paginacion
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedData = filtered.slice(start, start + limit);

    const data: VehicleListItemDto[] = paginatedData.map((v) => ({
      id: v.id,
      economicNumber: v.economicNumber,
      brand: v.brand,
      model: v.model,
      year: v.year,
      plates: v.plates,
      status: v.status,
      currentDriver: v.currentDriverId
        ? { id: v.currentDriverId, name: v.currentDriverName! }
        : null,
      partner: v.partnerId
        ? { id: v.partnerId, name: v.partnerName! }
        : null,
      currentOdometer: v.currentOdometer,
      zone: v.zone,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Obtiene un vehiculo por su ID con todos los detalles.
   *
   * @param tenantId - ID del tenant autenticado
   * @param id - ID del vehiculo
   * @returns Vehiculo con todos los detalles incluyendo seguro, servicio, partner y conductor
   * @throws NotFoundException si el vehiculo no existe o no pertenece al tenant
   */
  async findOne(tenantId: string, id: string): Promise<VehicleResponseDto> {
    this.logger.log(`Buscando vehiculo ${id} para tenant ${tenantId}`);

    const vehicle = this.vehicles.find(
      (v) => v.id === id && v.tenantId === tenantId,
    );

    if (!vehicle) {
      throw new NotFoundException(`Vehiculo con ID ${id} no encontrado`);
    }

    return this.mapToResponse(vehicle);
  }

  /**
   * Actualiza los datos de un vehiculo existente.
   *
   * @param tenantId - ID del tenant autenticado
   * @param id - ID del vehiculo a actualizar
   * @param dto - Campos a actualizar (parcial)
   * @returns Vehiculo actualizado
   * @throws NotFoundException si el vehiculo no existe
   * @throws ConflictException si las placas o VIN actualizados ya existen
   */
  async update(tenantId: string, id: string, dto: UpdateVehicleDto): Promise<VehicleResponseDto> {
    this.logger.log(`Actualizando vehiculo ${id} para tenant ${tenantId}`);

    const index = this.vehicles.findIndex(
      (v) => v.id === id && v.tenantId === tenantId,
    );

    if (index === -1) {
      throw new NotFoundException(`Vehiculo con ID ${id} no encontrado`);
    }

    // Validar unicidad de placas si se estan actualizando
    if (dto.plates && dto.plates !== this.vehicles[index].plates) {
      const existingByPlates = this.vehicles.find(
        (v) => v.tenantId === tenantId && v.plates === dto.plates && v.id !== id,
      );
      if (existingByPlates) {
        throw new ConflictException(
          `Ya existe un vehiculo con placas ${dto.plates}`,
        );
      }
    }

    // Validar unicidad de VIN si se esta actualizando
    if (dto.vin && dto.vin !== this.vehicles[index].vin) {
      const existingByVin = this.vehicles.find(
        (v) => v.vin === dto.vin && v.id !== id,
      );
      if (existingByVin) {
        throw new ConflictException(
          `Ya existe un vehiculo con VIN ${dto.vin}`,
        );
      }
    }

    // Resolver nombre del partner si cambia
    if (dto.partnerId !== undefined) {
      const partnerNames: Record<string, string> = {
        'prt-001': 'Transportes del Valle CDMX',
        'prt-002': 'Movilidad Guadalajara SA',
        'prt-003': 'Flota Express Monterrey',
        'prt-004': 'Servicio Ejecutivo Puebla',
      };
      (this.vehicles[index] as any).partnerName = dto.partnerId
        ? partnerNames[dto.partnerId] || null
        : null;
    }

    // Aplicar actualizaciones
    Object.keys(dto).forEach((key) => {
      if ((dto as any)[key] !== undefined) {
        (this.vehicles[index] as any)[key] = (dto as any)[key];
      }
    });

    this.vehicles[index].updatedAt = new Date().toISOString();

    return this.mapToResponse(this.vehicles[index]);
  }

  /**
   * Cambia el estado de un vehiculo con registro de auditoria.
   *
   * @param tenantId - ID del tenant autenticado
   * @param id - ID del vehiculo
   * @param status - Nuevo estado
   * @param reason - Razon del cambio de estado
   * @returns Vehiculo con estado actualizado
   * @throws NotFoundException si el vehiculo no existe
   * @throws BadRequestException si la transicion de estado no es valida
   */
  async updateStatus(
    tenantId: string,
    id: string,
    status: VehicleStatus,
    reason: string,
  ): Promise<VehicleResponseDto> {
    this.logger.log(`Cambiando estado de vehiculo ${id} a ${status}`);

    const index = this.vehicles.findIndex(
      (v) => v.id === id && v.tenantId === tenantId,
    );

    if (index === -1) {
      throw new NotFoundException(`Vehiculo con ID ${id} no encontrado`);
    }

    const vehicle = this.vehicles[index];
    const previousStatus = vehicle.status;

    // Validar transiciones de estado
    const validTransitions: Record<string, string[]> = {
      active: ['in_maintenance', 'stopped', 'available', 'total_loss'],
      in_maintenance: ['active', 'stopped', 'total_loss'],
      stopped: ['active', 'in_maintenance', 'available', 'total_loss'],
      available: ['active', 'in_maintenance', 'stopped'],
      total_loss: [], // Estado terminal
    };

    const allowed = validTransitions[previousStatus] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `No es posible cambiar el estado de '${previousStatus}' a '${status}'. Transiciones permitidas: ${allowed.join(', ') || 'ninguna (estado terminal)'}`,
      );
    }

    const now = new Date().toISOString();
    vehicle.status = status;
    vehicle.statusReason = reason;
    vehicle.statusChangedAt = now;
    vehicle.updatedAt = now;

    // Si pasa a mantenimiento o detenido, desasignar conductor
    if (status === 'in_maintenance' || status === 'stopped' || status === 'total_loss') {
      if (vehicle.currentDriverId) {
        const driver = this.drivers.find((d) => d.id === vehicle.currentDriverId);
        if (driver) {
          driver.assignedVehicleId = null;
        }

        this.timelineEvents.push({
          id: `evt-${Date.now()}-unassign`,
          vehicleId: id,
          tenantId,
          type: 'driver_change',
          title: 'Conductor desasignado automaticamente',
          description: `Se desasigno a ${vehicle.currentDriverName} por cambio de estado a ${status}.`,
          date: now,
          metadata: {
            driverId: vehicle.currentDriverId,
            driverName: vehicle.currentDriverName,
            action: 'unassign',
            reason: `Cambio de estado a ${status}`,
          },
          createdBy: 'system',
        });

        vehicle.currentDriverId = null;
        vehicle.currentDriverName = null;
      }
    }

    // Registrar evento en timeline
    this.timelineEvents.push({
      id: `evt-${Date.now()}`,
      vehicleId: id,
      tenantId,
      type: 'status_change',
      title: `Estado cambiado a ${status}`,
      description: reason,
      date: now,
      metadata: { fromStatus: previousStatus, toStatus: status, reason },
      createdBy: 'system',
    });

    return this.mapToResponse(vehicle);
  }

  /**
   * Obtiene la linea de tiempo unificada de un vehiculo.
   * Incluye cambios de estado, mantenimientos, incidentes, cambios de conductor, documentos y pagos.
   *
   * @param tenantId - ID del tenant autenticado
   * @param id - ID del vehiculo
   * @returns Lista de eventos ordenados cronologicamente (mas recientes primero)
   * @throws NotFoundException si el vehiculo no existe
   */
  async getTimeline(tenantId: string, id: string): Promise<TimelineEventDto[]> {
    this.logger.log(`Obteniendo timeline de vehiculo ${id}`);

    const vehicle = this.vehicles.find(
      (v) => v.id === id && v.tenantId === tenantId,
    );

    if (!vehicle) {
      throw new NotFoundException(`Vehiculo con ID ${id} no encontrado`);
    }

    const events = this.timelineEvents
      .filter((e) => e.vehicleId === id && e.tenantId === tenantId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((e) => ({
        id: e.id,
        type: e.type,
        title: e.title,
        description: e.description,
        date: e.date,
        metadata: e.metadata,
        createdBy: e.createdBy,
      }));

    return events;
  }

  /**
   * Genera el resumen financiero (P&L) de un vehiculo para un periodo dado.
   * Calcula ingresos, egresos, utilidad neta y costo por kilometro.
   *
   * @param tenantId - ID del tenant autenticado
   * @param id - ID del vehiculo
   * @param period - Periodo en formato 'YYYY-MM' o rango 'YYYY-MM:YYYY-MM'
   * @returns Resumen financiero con desglose de ingresos y gastos
   * @throws NotFoundException si el vehiculo no existe
   * @throws BadRequestException si el formato del periodo es invalido
   */
  async getFinancialSummary(
    tenantId: string,
    id: string,
    period?: string,
  ): Promise<FinancialSummaryDto> {
    this.logger.log(`Obteniendo resumen financiero de vehiculo ${id}, periodo: ${period}`);

    const vehicle = this.vehicles.find(
      (v) => v.id === id && v.tenantId === tenantId,
    );

    if (!vehicle) {
      throw new NotFoundException(`Vehiculo con ID ${id} no encontrado`);
    }

    // Parsear periodo
    let periodStart = '2026-01';
    let periodEnd = '2026-03';

    if (period) {
      if (period.includes(':')) {
        const parts = period.split(':');
        if (parts.length !== 2 || !parts[0].match(/^\d{4}-\d{2}$/) || !parts[1].match(/^\d{4}-\d{2}$/)) {
          throw new BadRequestException(
            'Formato de periodo invalido. Use YYYY-MM o YYYY-MM:YYYY-MM',
          );
        }
        periodStart = parts[0];
        periodEnd = parts[1];
      } else if (period.match(/^\d{4}-\d{2}$/)) {
        periodStart = period;
        periodEnd = period;
      } else {
        throw new BadRequestException(
          'Formato de periodo invalido. Use YYYY-MM o YYYY-MM:YYYY-MM',
        );
      }
    }

    // Generar datos financieros mock realistas basados en el vehiculo
    const monthsInPeriod = this.getMonthsDifference(periodStart, periodEnd) + 1;
    const baseMonthlyIncome = vehicle.status === 'active' ? 28000 + Math.random() * 12000 : 0;
    const rentalIncome = Math.round(baseMonthlyIncome * monthsInPeriod);
    const otherIncome = Math.round(rentalIncome * 0.05);

    const fuel = Math.round((3500 + Math.random() * 2000) * monthsInPeriod);
    const maintenance = Math.round((1200 + Math.random() * 3000) * monthsInPeriod);
    const insuranceMonthly = vehicle.acquisitionCost * 0.005;
    const insurance = Math.round(insuranceMonthly * monthsInPeriod);
    const taxes = Math.round(500 * monthsInPeriod);
    const monthlyDepreciation = vehicle.acquisitionCost / (5 * 12); // Depreciacion lineal a 5 anios
    const depreciation = Math.round(monthlyDepreciation * monthsInPeriod);
    const other = Math.round(800 * monthsInPeriod);

    const totalIncome = rentalIncome + otherIncome;
    const totalExpenses = fuel + maintenance + insurance + taxes + depreciation + other;
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 1000) / 10 : 0;

    // Estimar km recorridos en el periodo
    const avgKmPerMonth = vehicle.currentOdometer / Math.max(1, this.getVehicleAgeMonths(vehicle));
    const kmInPeriod = Math.round(avgKmPerMonth * monthsInPeriod);
    const costPerKm = kmInPeriod > 0 ? Math.round((totalExpenses / kmInPeriod) * 100) / 100 : 0;

    return {
      vehicleId: vehicle.id,
      vehicleLabel: `${vehicle.economicNumber} - ${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
      periodStart,
      periodEnd,
      income: {
        rentalIncome,
        otherIncome,
        total: totalIncome,
      },
      expenses: {
        fuel,
        maintenance,
        insurance,
        taxes,
        depreciation,
        other,
        total: totalExpenses,
      },
      netProfit,
      profitMargin,
      costPerKm,
    };
  }

  /**
   * Calcula el health score (puntuacion de salud) de un vehiculo.
   * Evalua mantenimiento, edad, kilometraje, incidentes y seguro.
   *
   * @param tenantId - ID del tenant autenticado
   * @param id - ID del vehiculo
   * @returns Health score con desglose, alertas y recomendaciones
   * @throws NotFoundException si el vehiculo no existe
   */
  async getHealthScore(tenantId: string, id: string): Promise<HealthScoreDto> {
    this.logger.log(`Calculando health score de vehiculo ${id}`);

    const vehicle = this.vehicles.find(
      (v) => v.id === id && v.tenantId === tenantId,
    );

    if (!vehicle) {
      throw new NotFoundException(`Vehiculo con ID ${id} no encontrado`);
    }

    const now = new Date();
    const alerts: string[] = [];
    const recommendations: string[] = [];

    // Score de mantenimiento (0-100)
    let maintenanceScore = 100;
    if (vehicle.nextServiceDate) {
      const nextService = new Date(vehicle.nextServiceDate);
      const daysUntil = Math.floor((nextService.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil < 0) {
        maintenanceScore = 30;
        alerts.push(`Servicio vencido hace ${Math.abs(daysUntil)} dias`);
        recommendations.push('Programar servicio de mantenimiento de forma urgente');
      } else if (daysUntil < 15) {
        maintenanceScore = 60;
        alerts.push(`Proximo servicio en ${daysUntil} dias`);
        recommendations.push('Agendar cita de servicio preventivo');
      } else if (daysUntil < 30) {
        maintenanceScore = 80;
      }
    } else {
      maintenanceScore = 50;
      recommendations.push('Registrar historial de servicios del vehiculo');
    }

    // Score por edad (0-100)
    const ageYears = now.getFullYear() - vehicle.year;
    let ageScore = 100;
    if (ageYears >= 5) {
      ageScore = 40;
      recommendations.push('Evaluar reemplazo del vehiculo por antiguedad');
    } else if (ageYears >= 4) {
      ageScore = 60;
    } else if (ageYears >= 3) {
      ageScore = 75;
    } else if (ageYears >= 2) {
      ageScore = 90;
    }

    // Score por kilometraje (0-100)
    let odometerScore = 100;
    if (vehicle.currentOdometer > 150000) {
      odometerScore = 30;
      alerts.push('Kilometraje alto (>150,000 km)');
      recommendations.push('Considerar reemplazo o revision mecanica exhaustiva');
    } else if (vehicle.currentOdometer > 120000) {
      odometerScore = 50;
      alerts.push('Kilometraje elevado (>120,000 km)');
    } else if (vehicle.currentOdometer > 80000) {
      odometerScore = 70;
    } else if (vehicle.currentOdometer > 50000) {
      odometerScore = 85;
    }

    // Score de incidentes (0-100)
    const vehicleIncidents = this.timelineEvents.filter(
      (e) => e.vehicleId === id && e.type === 'incident',
    );
    let incidentScore = 100;
    if (vehicleIncidents.length >= 3) {
      incidentScore = 40;
      alerts.push(`${vehicleIncidents.length} incidentes registrados`);
    } else if (vehicleIncidents.length === 2) {
      incidentScore = 65;
    } else if (vehicleIncidents.length === 1) {
      incidentScore = 80;
    }

    // Score de seguro (0-100)
    let insuranceScore = 100;
    if (!vehicle.insuranceExpiry) {
      insuranceScore = 0;
      alerts.push('Sin poliza de seguro registrada');
      recommendations.push('Contratar poliza de seguro vehicular');
    } else {
      const expiry = new Date(vehicle.insuranceExpiry);
      const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry < 0) {
        insuranceScore = 0;
        alerts.push(`Seguro vencido hace ${Math.abs(daysUntilExpiry)} dias`);
        recommendations.push('Renovar poliza de seguro de forma urgente');
      } else if (daysUntilExpiry < 30) {
        insuranceScore = 50;
        alerts.push(`Seguro vence en ${daysUntilExpiry} dias`);
        recommendations.push('Iniciar proceso de renovacion de seguro');
      } else if (daysUntilExpiry < 60) {
        insuranceScore = 75;
      }
    }

    // Calcular score general ponderado
    const overallScore = Math.round(
      maintenanceScore * 0.3 +
      ageScore * 0.15 +
      odometerScore * 0.2 +
      incidentScore * 0.15 +
      insuranceScore * 0.2,
    );

    // Determinar categoria
    let category: HealthScoreDto['category'];
    if (overallScore >= 85) category = 'excelente';
    else if (overallScore >= 70) category = 'bueno';
    else if (overallScore >= 50) category = 'regular';
    else if (overallScore >= 30) category = 'malo';
    else category = 'critico';

    return {
      vehicleId: vehicle.id,
      vehicleLabel: `${vehicle.economicNumber} - ${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
      overallScore,
      category,
      breakdown: {
        maintenanceScore,
        ageScore,
        odometerScore,
        incidentScore,
        insuranceScore,
      },
      alerts,
      recommendations,
    };
  }

  /**
   * Obtiene estadisticas del dashboard de vehiculos para el tenant.
   * Incluye conteos por estado, alertas activas y distribucion por marca.
   *
   * @param tenantId - ID del tenant autenticado
   * @returns Estadisticas generales de la flota
   */
  async getDashboardStats(tenantId: string): Promise<DashboardStatsDto> {
    this.logger.log(`Obteniendo stats de dashboard para tenant ${tenantId}`);

    const tenantVehicles = this.vehicles.filter((v) => v.tenantId === tenantId);
    const now = new Date();

    // Conteos por estado
    const byStatus = {
      active: 0,
      in_maintenance: 0,
      stopped: 0,
      available: 0,
      total_loss: 0,
    };
    tenantVehicles.forEach((v) => {
      byStatus[v.status as keyof typeof byStatus]++;
    });

    // Con/sin conductor
    const withDriver = tenantVehicles.filter((v) => v.currentDriverId !== null).length;
    const withoutDriver = tenantVehicles.length - withDriver;

    // Promedios
    const totalOdometer = tenantVehicles.reduce((sum, v) => sum + v.currentOdometer, 0);
    const averageOdometer = tenantVehicles.length > 0
      ? Math.round(totalOdometer / tenantVehicles.length)
      : 0;

    const totalAge = tenantVehicles.reduce(
      (sum, v) => sum + (now.getFullYear() - v.year),
      0,
    );
    const averageAge = tenantVehicles.length > 0
      ? Math.round((totalAge / tenantVehicles.length) * 10) / 10
      : 0;

    // Valor total de la flota
    const totalFleetValue = tenantVehicles.reduce(
      (sum, v) => sum + v.acquisitionCost,
      0,
    );

    // Alertas
    const alerts: DashboardStatsDto['alerts'] = [];

    tenantVehicles.forEach((v) => {
      // Seguro vencido o proximo a vencer
      if (v.insuranceExpiry) {
        const expiry = new Date(v.insuranceExpiry);
        const daysUntil = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) {
          alerts.push({
            type: 'insurance_expired',
            message: `Seguro vencido hace ${Math.abs(daysUntil)} dias`,
            vehicleId: v.id,
            vehicleLabel: `${v.economicNumber} - ${v.brand} ${v.model}`,
            severity: 'high',
          });
        } else if (daysUntil < 30) {
          alerts.push({
            type: 'insurance_expiring',
            message: `Seguro vence en ${daysUntil} dias`,
            vehicleId: v.id,
            vehicleLabel: `${v.economicNumber} - ${v.brand} ${v.model}`,
            severity: 'medium',
          });
        }
      }

      // Servicio vencido
      if (v.nextServiceDate) {
        const nextService = new Date(v.nextServiceDate);
        const daysUntil = Math.floor((nextService.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) {
          alerts.push({
            type: 'service_overdue',
            message: `Servicio vencido hace ${Math.abs(daysUntil)} dias`,
            vehicleId: v.id,
            vehicleLabel: `${v.economicNumber} - ${v.brand} ${v.model}`,
            severity: 'high',
          });
        } else if (daysUntil < 15) {
          alerts.push({
            type: 'service_upcoming',
            message: `Proximo servicio en ${daysUntil} dias`,
            vehicleId: v.id,
            vehicleLabel: `${v.economicNumber} - ${v.brand} ${v.model}`,
            severity: 'low',
          });
        }
      }

      // Vehiculo detenido mas de 30 dias
      if (v.status === 'stopped') {
        const stoppedAt = new Date(v.statusChangedAt);
        const daysStopped = Math.floor((now.getTime() - stoppedAt.getTime()) / (1000 * 60 * 60 * 24));
        if (daysStopped > 30) {
          alerts.push({
            type: 'long_stopped',
            message: `Vehiculo detenido hace ${daysStopped} dias`,
            vehicleId: v.id,
            vehicleLabel: `${v.economicNumber} - ${v.brand} ${v.model}`,
            severity: 'medium',
          });
        }
      }
    });

    // Distribucion por marca
    const byBrand: Record<string, number> = {};
    tenantVehicles.forEach((v) => {
      byBrand[v.brand] = (byBrand[v.brand] || 0) + 1;
    });

    // Distribucion por metodo de adquisicion
    const byAcquisitionMethod: Record<string, number> = {};
    tenantVehicles.forEach((v) => {
      byAcquisitionMethod[v.acquisitionMethod] =
        (byAcquisitionMethod[v.acquisitionMethod] || 0) + 1;
    });

    return {
      totalVehicles: tenantVehicles.length,
      byStatus,
      withDriver,
      withoutDriver,
      averageOdometer,
      averageAge,
      totalFleetValue,
      alerts: alerts.sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      byBrand,
      byAcquisitionMethod,
    };
  }

  /**
   * Asigna un conductor a un vehiculo.
   *
   * @param tenantId - ID del tenant autenticado
   * @param vehicleId - ID del vehiculo
   * @param driverId - ID del conductor a asignar
   * @returns Vehiculo actualizado con el conductor asignado
   * @throws NotFoundException si el vehiculo o conductor no existe
   * @throws BadRequestException si el vehiculo no esta disponible o el conductor ya tiene vehiculo
   */
  async assignDriver(
    tenantId: string,
    vehicleId: string,
    driverId: string,
  ): Promise<VehicleResponseDto> {
    this.logger.log(`Asignando conductor ${driverId} a vehiculo ${vehicleId}`);

    const vehicle = this.vehicles.find(
      (v) => v.id === vehicleId && v.tenantId === tenantId,
    );

    if (!vehicle) {
      throw new NotFoundException(`Vehiculo con ID ${vehicleId} no encontrado`);
    }

    if (vehicle.currentDriverId) {
      throw new BadRequestException(
        `El vehiculo ya tiene asignado al conductor ${vehicle.currentDriverName}. Desasigne primero.`,
      );
    }

    if (vehicle.status !== 'active' && vehicle.status !== 'available') {
      throw new BadRequestException(
        `No se puede asignar conductor a un vehiculo con estado '${vehicle.status}'. El vehiculo debe estar activo o disponible.`,
      );
    }

    const driver = this.drivers.find(
      (d) => d.id === driverId && d.tenantId === tenantId,
    );

    if (!driver) {
      throw new NotFoundException(`Conductor con ID ${driverId} no encontrado`);
    }

    if (driver.status !== 'active') {
      throw new BadRequestException(
        `El conductor ${driver.name} no esta activo`,
      );
    }

    if (driver.assignedVehicleId) {
      throw new BadRequestException(
        `El conductor ${driver.name} ya tiene asignado el vehiculo ${driver.assignedVehicleId}`,
      );
    }

    const now = new Date().toISOString();

    // Actualizar vehiculo
    vehicle.currentDriverId = driverId;
    vehicle.currentDriverName = driver.name;
    vehicle.status = 'active';
    vehicle.statusReason = null;
    vehicle.statusChangedAt = now;
    vehicle.updatedAt = now;

    // Actualizar conductor
    driver.assignedVehicleId = vehicleId;

    // Registrar en timeline
    this.timelineEvents.push({
      id: `evt-${Date.now()}`,
      vehicleId,
      tenantId,
      type: 'driver_change',
      title: 'Conductor asignado',
      description: `Se asigno a ${driver.name} como conductor del vehiculo.`,
      date: now,
      metadata: { driverId, driverName: driver.name, action: 'assign' },
      createdBy: 'system',
    });

    return this.mapToResponse(vehicle);
  }

  /**
   * Desasigna el conductor actual de un vehiculo.
   *
   * @param tenantId - ID del tenant autenticado
   * @param vehicleId - ID del vehiculo
   * @returns Vehiculo actualizado sin conductor
   * @throws NotFoundException si el vehiculo no existe
   * @throws BadRequestException si el vehiculo no tiene conductor asignado
   */
  async unassignDriver(tenantId: string, vehicleId: string): Promise<VehicleResponseDto> {
    this.logger.log(`Desasignando conductor de vehiculo ${vehicleId}`);

    const vehicle = this.vehicles.find(
      (v) => v.id === vehicleId && v.tenantId === tenantId,
    );

    if (!vehicle) {
      throw new NotFoundException(`Vehiculo con ID ${vehicleId} no encontrado`);
    }

    if (!vehicle.currentDriverId) {
      throw new BadRequestException('El vehiculo no tiene conductor asignado');
    }

    const now = new Date().toISOString();
    const previousDriverId = vehicle.currentDriverId;
    const previousDriverName = vehicle.currentDriverName;

    // Liberar conductor
    const driver = this.drivers.find((d) => d.id === previousDriverId);
    if (driver) {
      driver.assignedVehicleId = null;
    }

    // Actualizar vehiculo
    vehicle.currentDriverId = null;
    vehicle.currentDriverName = null;
    vehicle.status = 'available';
    vehicle.statusReason = 'Sin conductor asignado, listo para operacion';
    vehicle.statusChangedAt = now;
    vehicle.updatedAt = now;

    // Registrar en timeline
    this.timelineEvents.push({
      id: `evt-${Date.now()}`,
      vehicleId,
      tenantId,
      type: 'driver_change',
      title: 'Conductor desasignado',
      description: `Se desasigno a ${previousDriverName} del vehiculo.`,
      date: now,
      metadata: {
        driverId: previousDriverId,
        driverName: previousDriverName,
        action: 'unassign',
      },
      createdBy: 'system',
    });

    return this.mapToResponse(vehicle);
  }

  // ────────────────────────────────────────────────────────────
  // Metodos privados auxiliares
  // ────────────────────────────────────────────────────────────

  /**
   * Mapea un MockVehicle a VehicleResponseDto con campos calculados.
   */
  private mapToResponse(vehicle: MockVehicle): VehicleResponseDto {
    const now = new Date();

    // Calcular estado del seguro
    let insuranceIsActive = false;
    let daysUntilInsuranceExpiry: number | null = null;
    if (vehicle.insuranceExpiry) {
      const expiry = new Date(vehicle.insuranceExpiry);
      daysUntilInsuranceExpiry = Math.floor(
        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      insuranceIsActive = daysUntilInsuranceExpiry > 0;
    }

    // Calcular estado del servicio
    let serviceIsOverdue = false;
    let daysUntilNextService: number | null = null;
    if (vehicle.nextServiceDate) {
      const nextService = new Date(vehicle.nextServiceDate);
      daysUntilNextService = Math.floor(
        (nextService.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      serviceIsOverdue = daysUntilNextService < 0;
    }

    return {
      id: vehicle.id,
      tenantId: vehicle.tenantId,
      economicNumber: vehicle.economicNumber,
      brand: vehicle.brand,
      model: vehicle.model,
      version: vehicle.version,
      year: vehicle.year,
      plates: vehicle.plates,
      vin: vehicle.vin,
      color: vehicle.color,
      acquisitionDate: vehicle.acquisitionDate,
      acquisitionCost: vehicle.acquisitionCost,
      acquisitionMethod: vehicle.acquisitionMethod,
      status: vehicle.status,
      statusReason: vehicle.statusReason,
      statusChangedAt: vehicle.statusChangedAt,
      currentOdometer: vehicle.currentOdometer,
      zone: vehicle.zone,
      fuelType: vehicle.fuelType,
      partner: vehicle.partnerId
        ? { id: vehicle.partnerId, name: vehicle.partnerName! }
        : null,
      currentDriver: vehicle.currentDriverId
        ? { id: vehicle.currentDriverId, name: vehicle.currentDriverName! }
        : null,
      insurance: {
        policy: vehicle.insurancePolicy,
        expiry: vehicle.insuranceExpiry,
        isActive: insuranceIsActive,
        daysUntilExpiry: daysUntilInsuranceExpiry,
      },
      service: {
        lastServiceDate: vehicle.lastServiceDate,
        nextServiceDate: vehicle.nextServiceDate,
        lastServiceOdometer: vehicle.lastServiceOdometer,
        isOverdue: serviceIsOverdue,
        daysUntilNextService: daysUntilNextService,
      },
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    };
  }

  /**
   * Calcula la diferencia en meses entre dos strings YYYY-MM.
   */
  private getMonthsDifference(start: string, end: string): number {
    const [sy, sm] = start.split('-').map(Number);
    const [ey, em] = end.split('-').map(Number);
    return (ey - sy) * 12 + (em - sm);
  }

  /**
   * Calcula la edad del vehiculo en meses desde su adquisicion.
   */
  private getVehicleAgeMonths(vehicle: MockVehicle): number {
    const acquisition = new Date(vehicle.acquisitionDate);
    const now = new Date();
    return (
      (now.getFullYear() - acquisition.getFullYear()) * 12 +
      (now.getMonth() - acquisition.getMonth())
    );
  }
}
