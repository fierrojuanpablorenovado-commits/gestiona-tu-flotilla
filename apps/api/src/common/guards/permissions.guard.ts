import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to set required permissions on a route.
 * Usage: @RequirePermissions('vehicles.view', 'vehicles.edit')
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Guard that checks if the current user has the required permissions.
 * Permissions follow the format: 'module.action' (e.g., 'vehicles.view')
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('No authenticated user');
    }

    // Super admin bypasses all permission checks
    if (user.isSuperAdmin) {
      return true;
    }

    // Admin general has all permissions within their tenant
    if (user.roleSlug === 'admin_general') {
      return true;
    }

    const userPermissions: string[] = user.permissions || [];
    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing permissions: ${requiredPermissions.filter(
          (p) => !userPermissions.includes(p),
        ).join(', ')}`,
      );
    }

    return true;
  }
}
