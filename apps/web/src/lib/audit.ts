import { sql } from '@/lib/db';

export type AuditAction =
  | 'login' | 'logout' | 'login_failed'
  | 'password_changed' | 'password_reset_requested' | 'password_reset_completed'
  | 'vehicle_created' | 'vehicle_updated' | 'vehicle_deleted'
  | 'driver_created'  | 'driver_updated'  | 'driver_deleted'
  | 'user_created'    | 'user_updated'    | 'user_deleted'
  | 'payment_started' | 'payment_completed' | 'payment_failed'
  | 'data_exported'   | 'account_deleted'
  | 'file_uploaded'   | 'session_revoked';

export async function auditLog(params: {
  tenantId:   string | null;
  userId?:    string | null;
  action:     AuditAction;
  resource?:  string;
  resourceId?: string;
  metadata?:  Record<string, unknown>;
  ip?:        string;
}): Promise<void> {
  try {
    await sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource, resource_id, metadata, ip)
      VALUES (
        ${params.tenantId},
        ${params.userId   ?? null},
        ${params.action},
        ${params.resource ?? null},
        ${params.resourceId ?? null},
        ${JSON.stringify(params.metadata ?? {})}::jsonb,
        ${params.ip       ?? null}
      )
    `;
  } catch {
    // El log jamás debe romper la operación principal
  }
}
