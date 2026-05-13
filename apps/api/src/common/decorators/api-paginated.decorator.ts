import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * Swagger decorator for endpoints that return paginated responses.
 * Generates proper OpenAPI schema with data array and pagination metadata.
 *
 * Usage:
 *   @ApiPaginatedResponse(VehicleDto)
 *   @Get()
 *   findAll(@Query() query: PaginationDto) { ... }
 */
export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: 'Paginated response',
      schema: {
        allOf: [
          {
            properties: {
              success: {
                type: 'boolean',
                example: true,
              },
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              message: {
                type: 'string',
                example: 'Records retrieved successfully',
                nullable: true,
              },
              meta: {
                type: 'object',
                properties: {
                  total: {
                    type: 'number',
                    example: 100,
                    description: 'Total number of records',
                  },
                  page: {
                    type: 'number',
                    example: 1,
                    description: 'Current page number',
                  },
                  limit: {
                    type: 'number',
                    example: 20,
                    description: 'Records per page',
                  },
                  totalPages: {
                    type: 'number',
                    example: 5,
                    description: 'Total number of pages',
                  },
                  hasNext: {
                    type: 'boolean',
                    example: true,
                    description: 'Whether there is a next page',
                  },
                  hasPrev: {
                    type: 'boolean',
                    example: false,
                    description: 'Whether there is a previous page',
                  },
                },
              },
            },
          },
        ],
      },
    }),
  );
};
