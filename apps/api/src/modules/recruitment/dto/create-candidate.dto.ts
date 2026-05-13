import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  Max,
  IsPhoneNumber,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PreferredShift {
  MATUTINO = 'matutino',
  VESPERTINO = 'vespertino',
  NOCTURNO = 'nocturno',
  MIXTO = 'mixto',
}

export class CreateCandidateDto {
  @ApiProperty({ example: 'Carlos', description: 'Nombre del candidato' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Hernandez Lopez', description: 'Apellidos del candidato' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  lastName: string;

  @ApiProperty({ example: '+5233101234501', description: 'Numero de telefono con lada' })
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone: string;

  @ApiPropertyOptional({ example: 'carlos.hernandez@gmail.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Guadalajara', description: 'Ciudad de residencia' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({ example: 'Zapopan Norte', description: 'Zona o colonia' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  zone?: string;

  @ApiProperty({ example: true, description: 'Tiene cuenta de Uber activa' })
  @IsBoolean()
  hasUberAccount: boolean;

  @ApiProperty({ example: false, description: 'Tiene cuenta de Didi activa' })
  @IsBoolean()
  hasDidiAccount: boolean;

  @ApiProperty({ example: false, description: 'Tiene cuenta de InDriver activa' })
  @IsBoolean()
  hasInDriverAccount: boolean;

  @ApiPropertyOptional({ example: 4.85, description: 'Rating en Uber (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  uberRating?: number;

  @ApiPropertyOptional({ example: 4.70, description: 'Rating en Didi (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  didiRating?: number;

  @ApiProperty({ example: 3, description: 'Anios de experiencia conduciendo' })
  @IsNumber()
  @Min(0)
  @Max(50)
  yearsDriving: number;

  @ApiProperty({ example: true, description: 'Tiene licencia de conducir vigente' })
  @IsBoolean()
  hasLicense: boolean;

  @ApiPropertyOptional({ example: 'B', description: 'Tipo de licencia (A, B, C, D, E)' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  licenseType?: string;

  @ApiPropertyOptional({ example: '2027-06-15', description: 'Fecha de vencimiento de la licencia' })
  @IsOptional()
  @IsDateString()
  licenseExpiry?: string;

  @ApiProperty({ enum: PreferredShift, example: PreferredShift.MATUTINO, description: 'Turno preferido' })
  @IsEnum(PreferredShift)
  preferredShift: PreferredShift;

  @ApiProperty({ example: 5000, description: 'Meta de ingreso semanal en MXN' })
  @IsNumber()
  @Min(0)
  weeklyIncomeGoal: number;

  @ApiProperty({ example: 3000, description: 'Capacidad de deposito inicial en MXN' })
  @IsNumber()
  @Min(0)
  depositCapacity: number;

  @ApiProperty({ example: 'src-facebook', description: 'ID de la fuente de reclutamiento' })
  @IsString()
  sourceId: string;

  @ApiPropertyOptional({ example: 'driver-012', description: 'ID del conductor que refirio' })
  @IsOptional()
  @IsString()
  referredByDriverId?: string;

  @ApiPropertyOptional({ example: 'Interesado en turno de lunes a viernes', description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
