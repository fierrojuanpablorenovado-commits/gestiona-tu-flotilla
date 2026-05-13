import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMeta } from './pagination.dto';

export class ApiResponseDto<T = any> {
  @ApiProperty({ example: true, description: 'Whether the request succeeded' })
  success: boolean;

  @ApiProperty({ description: 'Response data payload' })
  data: T;

  @ApiPropertyOptional({
    example: 'Operation completed successfully',
    description: 'Human-readable message',
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Pagination metadata (present for paginated responses)',
  })
  meta?: PaginationMeta;

  constructor(data: T, message?: string, meta?: PaginationMeta) {
    this.success = true;
    this.data = data;
    this.message = message;
    this.meta = meta;
  }

  static ok<T>(data: T, message?: string): ApiResponseDto<T> {
    return new ApiResponseDto(data, message);
  }

  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string,
  ): ApiResponseDto<T[]> {
    const totalPages = Math.ceil(total / limit);
    const meta: PaginationMeta = {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
    return new ApiResponseDto(data, message, meta);
  }

  static error(message: string): ApiResponseDto<null> {
    const response = new ApiResponseDto<null>(null, message);
    response.success = false;
    return response;
  }
}
