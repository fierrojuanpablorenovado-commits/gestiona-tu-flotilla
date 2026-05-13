import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean, Min, Max, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { VehicleStatus } from './create-vehicle.dto';

export class VehicleFiltersDto {
  @ApiPropertyOptional({
    description: 'Filtrar por estado del vehiculo',
    enum: VehicleStatus,
    example: 'active',
  })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por marca',
    example: 'Nissan',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por anio del modelo',
    example: 2024,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2030)
  year?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por ID del socio/partner',
    example: 'prt-001',
  })
  @IsOptional()
  @IsString()
  partnerId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar vehiculos con/sin conductor asignado',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasDriver?: boolean;

  @ApiPropertyOptional({
    description: 'Busqueda por texto (numero economico, placas, VIN, marca, modelo)',
    example: 'ECO-001',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Numero de pagina',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Registros por pagina',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Campo de ordenamiento',
    example: 'economicNumber',
    enum: ['economicNumber', 'brand', 'year', 'status', 'acquisitionDate', 'acquisitionCost', 'currentOdometer', 'createdAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Orden de resultados',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
