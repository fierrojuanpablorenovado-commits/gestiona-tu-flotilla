import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict route access to specific user roles.
 *
 * Usage:
 *   @Roles('admin_general', 'admin')
 *   @Roles(UserRole.SUPER_ADMIN)
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
