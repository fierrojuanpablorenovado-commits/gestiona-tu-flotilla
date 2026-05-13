import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Length,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VehicleStatus {
  ACTIVE = 'active',
  IN_MAINTENANCE = 'in_maintenance',
  STOPPED = 'stopped',
  AVAILABLE = 'available',
  TOTAL_LOSS = 'total_loss',
}

export enum AcquisitionMethod {
  COMPRA_DIRECTA = 'compra_directa',
  LEASING = 'leasing',
  CREDITO = 'credito',
  RENTING = 'renting',
}

export class CreateVehicleDto {
  @ApiProperty({
    description: 'Numero economico unico del vehiculo dentro de la flota',
    example: 'ECO-016',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  economicNumber: string;

  @ApiProperty({
    description: 'Marca del vehiculo',
    example: 'Nissan',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  brand: string;

  @ApiProperty({
    description: 'Modelo del vehiculo',
    example: 'Versa',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  model: string;

  @ApiProperty({
    description: 'Version o trim del vehiculo',
    example: 'Sense CVT',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  version: string;

  @ApiProperty({
    description: 'Anio del modelo',
    example: 2024,
    minimum: 2000,
    maximum: 2030,
  })
  @IsNumber()
  @Min(2000)
  @Max(2030)
  year: number;

  @ApiProperty({
    description: 'Placas del vehiculo (formato mexicano)',
    example: 'ABC-123-A',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{2,3}-\d{2,4}-[A-Z]$/, {
    message: 'Las placas deben tener formato mexicano (ej: ABC-123-A)',
  })
  plates: string;

  @ApiProperty({
    description: 'Numero de Identificacion Vehicular (VIN)',
    example: '3N1CN7AD3PL830016',
  })
  @IsString()
  @IsNotEmpty()
  @Length(17, 17, { message: 'El VIN debe tener exactamente 17 caracteres' })
  vin: string;

  @ApiProperty({
    description: 'Color del vehiculo',
    example: 'Blanco',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  color: string;

  @ApiProperty({
    description: 'Fecha de adquisicion del vehiculo',
    example: '2024-03-15',
  })
  @IsDateString()
  acquisitionDate: string;

  @ApiProperty({
    description: 'Costo de adquisicion en MXN',
    example: 295000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  acquisitionCost: number;

  @ApiProperty({
    description: 'Metodo de adquisicion',
    enum: AcquisitionMethod,
    example: AcquisitionMethod.COMPRA_DIRECTA,
  })
  @IsEnum(AcquisitionMethod, {
    message: 'El metodo de adquisicion debe ser: compra_directa, leasing, credito o renting',
  })
  acquisitionMethod: AcquisitionMethod;

  @ApiPropertyOptional({
    description: 'ID del socio/partner propietario o asociado',
    example: 'prt-001',
  })
  @IsOptional()
  @IsString()
  partnerId?: string;

  @ApiPropertyOptional({
    description: 'Numero de poliza de seguro',
    example: 'POL-QBE-2024-0001',
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  insurancePolicy?: string;

  @ApiPropertyOptional({
    description: 'Fecha de vencimiento del seguro',
    example: '2027-03-15',
  })
  @IsOptional()
  @IsDateString()
  insuranceExpiry?: string;

  @ApiPropertyOptional({
    description: 'Estado inicial del vehiculo',
    enum: VehicleStatus,
    default: VehicleStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(VehicleStatus, {
    message: 'El estado debe ser: active, in_maintenance, stopped, available o total_loss',
  })
  status?: VehicleStatus;
}
