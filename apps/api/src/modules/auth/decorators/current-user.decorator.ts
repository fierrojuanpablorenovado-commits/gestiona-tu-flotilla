import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../strategies/jwt.strategy';

/**
 * Parameter decorator that extracts the authenticated user from the request.
 *
 * Usage:
 *   @CurrentUser() user: JwtPayload           - returns the full JWT payload
 *   @CurrentUser('sub') userId: string         - returns a specific field
 *   @CurrentUser('tenantId') tenantId: string  - returns the tenant ID
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
