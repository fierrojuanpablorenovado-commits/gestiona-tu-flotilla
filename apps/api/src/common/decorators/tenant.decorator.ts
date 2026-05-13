import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts tenant_id from the authenticated user's JWT payload.
 * Every request in the system is scoped to a tenant.
 *
 * Usage: @CurrentTenant() tenantId: string
 */
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenantId;
  },
);

/**
 * Extracts the full user object from JWT payload.
 * Re-exported for backward compatibility.
 * Prefer importing from '@/modules/auth/decorators/current-user.decorator'.
 *
 * Usage: @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
