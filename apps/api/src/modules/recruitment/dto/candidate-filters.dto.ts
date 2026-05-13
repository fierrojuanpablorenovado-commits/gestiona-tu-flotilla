import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CandidateFiltersDto {
  @ApiPropertyOptional({ enum: ['active', 'approved', 'rejected', 'withdrawn'], description: 'Filtrar por estatus' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'stage-nuevo', description: 'Filtrar por etapa del pipeline' })
  @IsOptional()
  @IsString()
  stageId?: string;

  @ApiPropertyOptional({ example: 'src-facebook', description: 'Filtrar por fuente' })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional({ example: true, description: 'Filtrar por cuenta Uber' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasUberAccount?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Filtrar por cuenta Didi' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasDidiAccount?: boolean;

  @ApiPropertyOptional({ example: 60, description: 'Puntaje minimo' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minScore?: number;

  @ApiPropertyOptional({ example: 90, description: 'Puntaje maximo' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  maxScore?: number;

  @ApiPropertyOptional({ example: 'Guadalajara', description: 'Filtrar por ciudad' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Carlos', description: 'Busqueda por nombre, apellido, telefono o email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, description: 'Numero de pagina', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Registros por pagina', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
