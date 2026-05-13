import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VehiclePartnerDto {
  @ApiProperty({ example: 'prt-001' })
  id: string;

  @ApiProperty({ example: 'Transportes del Valle CDMX' })
  name: string;
}

export class VehicleDriverDto {
  @ApiProperty({ example: 'drv-001' })
  id: string;

  @ApiProperty({ example: 'Carlos Eduardo Hernandez Lopez' })
  name: string;
}

export class VehicleInsuranceDto {
  @ApiPropertyOptional({ example: 'POL-QBE-2023-0451' })
  policy: string | null;

  @ApiPropertyOptional({ example: '2026-03-15' })
  expiry: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: 15 })
  daysUntilExpiry: number | null;
}

export class VehicleServiceDto {
  @ApiPropertyOptional({ example: '2026-01-10' })
  lastServiceDate: string | null;

  @ApiPropertyOptional({ example: '2026-04-10' })
  nextServiceDate: string | null;

  @ApiPropertyOptional({ example: 82000 })
  lastServiceOdometer: number | null;

  @ApiProperty({ example: false })
  isOverdue: boolean;

  @ApiPropertyOptional({ example: 17 })
  daysUntilNextService: number | null;
}

export class VehicleResponseDto {
  @ApiProperty({ example: 'veh-001' })
  id: string;

  @ApiProperty({ example: 'tenant-001' })
  tenantId: string;

  @ApiProperty({ example: 'ECO-001' })
  economicNumber: string;

  @ApiProperty({ example: 'Nissan' })
  brand: string;

  @ApiProperty({ example: 'Versa' })
  model: string;

  @ApiProperty({ example: 'Sense CVT' })
  version: string;

  @ApiProperty({ example: 2023 })
  year: number;

  @ApiProperty({ example: 'ABC-123-A' })
  plates: string;

  @ApiProperty({ example: '3N1CN7AD3PL830001' })
  vin: string;

  @ApiProperty({ example: 'Blanco' })
  color: string;

  @ApiProperty({ example: '2023-03-15' })
  acquisitionDate: string;

  @ApiProperty({ example: 295000 })
  acquisitionCost: number;

  @ApiProperty({ example: 'compra_directa' })
  acquisitionMethod: string;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiPropertyOptional({ example: null })
  statusReason: string | null;

  @ApiProperty({ example: '2023-03-20T10:00:00Z' })
  statusChangedAt: string;

  @ApiProperty({ example: 87500 })
  currentOdometer: number;

  @ApiProperty({ example: 'CDMX - Zona Norte' })
  zone: string;

  @ApiProperty({ example: 'gasolina' })
  fuelType: string;

  @ApiPropertyOptional({ type: VehiclePartnerDto })
  partner: VehiclePartnerDto | null;

  @ApiPropertyOptional({ type: VehicleDriverDto })
  currentDriver: VehicleDriverDto | null;

  @ApiProperty({ type: VehicleInsuranceDto })
  insurance: VehicleInsuranceDto;

  @ApiProperty({ type: VehicleServiceDto })
  service: VehicleServiceDto;

  @ApiProperty({ example: '2023-03-15T08:00:00Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-03-01T14:30:00Z' })
  updatedAt: string;
}

export class VehicleListItemDto {
  @ApiProperty({ example: 'veh-001' })
  id: string;

  @ApiProperty({ example: 'ECO-001' })
  economicNumber: string;

  @ApiProperty({ example: 'Nissan' })
  brand: string;

  @ApiProperty({ example: 'Versa' })
  model: string;

  @ApiProperty({ example: 2023 })
  year: number;

  @ApiProperty({ example: 'ABC-123-A' })
  plates: string;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiPropertyOptional({ type: VehicleDriverDto })
  currentDriver: VehicleDriverDto | null;

  @ApiPropertyOptional({ type: VehiclePartnerDto })
  partner: VehiclePartnerDto | null;

  @ApiProperty({ example: 87500 })
  currentOdometer: number;

  @ApiProperty({ example: 'CDMX - Zona Norte' })
  zone: string;
}

export class PaginatedVehiclesDto {
  @ApiProperty({ type: [VehicleListItemDto] })
  data: VehicleListItemDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class TimelineEventDto {
  @ApiProperty({ example: 'evt-001' })
  id: string;

  @ApiProperty({ example: 'status_change' })
  type: string;

  @ApiProperty({ example: 'Vehiculo dado de alta' })
  title: string;

  @ApiProperty({ example: 'Se registro el vehiculo ECO-001 en el sistema.' })
  description: string;

  @ApiProperty({ example: '2023-03-15T08:00:00Z' })
  date: string;

  @ApiProperty()
  metadata: Record<string, any>;

  @ApiProperty({ example: 'admin@fleetcore.mx' })
  createdBy: string;
}

export class FinancialSummaryDto {
  @ApiProperty({ example: 'veh-001' })
  vehicleId: string;

  @ApiProperty({ example: 'ECO-001 - Nissan Versa 2023' })
  vehicleLabel: string;

  @ApiProperty({ example: '2026-01' })
  periodStart: string;

  @ApiProperty({ example: '2026-03' })
  periodEnd: string;

  @ApiProperty()
  income: {
    rentalIncome: number;
    otherIncome: number;
    total: number;
  };

  @ApiProperty()
  expenses: {
    fuel: number;
    maintenance: number;
    insurance: number;
    taxes: number;
    depreciation: number;
    other: number;
    total: number;
  };

  @ApiProperty({ example: 18750 })
  netProfit: number;

  @ApiProperty({ example: 42.5 })
  profitMargin: number;

  @ApiProperty({ example: 6.35 })
  costPerKm: number;
}

export class HealthScoreDto {
  @ApiProperty({ example: 'veh-001' })
  vehicleId: string;

  @ApiProperty({ example: 'ECO-001 - Nissan Versa 2023' })
  vehicleLabel: string;

  @ApiProperty({ description: 'Puntuacion general de 0 a 100', example: 78 })
  overallScore: number;

  @ApiProperty({ description: 'Categoria del score', example: 'bueno' })
  category: 'excelente' | 'bueno' | 'regular' | 'malo' | 'critico';

  @ApiProperty()
  breakdown: {
    maintenanceScore: number;
    ageScore: number;
    odometerScore: number;
    incidentScore: number;
    insuranceScore: number;
  };

  @ApiProperty({ type: [String] })
  alerts: string[];

  @ApiProperty({ type: [String] })
  recommendations: string[];
}

export class DashboardStatsDto {
  @ApiProperty()
  totalVehicles: number;

  @ApiProperty()
  byStatus: {
    active: number;
    in_maintenance: number;
    stopped: number;
    available: number;
    total_loss: number;
  };

  @ApiProperty()
  withDriver: number;

  @ApiProperty()
  withoutDriver: number;

  @ApiProperty()
  averageOdometer: number;

  @ApiProperty()
  averageAge: number;

  @ApiProperty()
  totalFleetValue: number;

  @ApiProperty({ type: [Object] })
  alerts: {
    type: string;
    message: string;
    vehicleId: string;
    vehicleLabel: string;
    severity: 'high' | 'medium' | 'low';
  }[];

  @ApiProperty()
  byBrand: Record<string, number>;

  @ApiProperty()
  byAcquisitionMethod: Record<string, number>;
}
