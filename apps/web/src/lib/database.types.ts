/**
 * Tipos de base de datos Supabase — Gestiona tu Flotilla
 * Generado manualmente. En producción: `npx supabase gen types typescript`
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: 'basic' | 'pro' | 'enterprise';
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>;
      };
      users: {
        Row: {
          id: string;
          tenant_id: string | null;
          first_name: string;
          last_name: string;
          email: string;
          role: 'super_admin' | 'admin_general' | 'administrador' | 'tesoreria' | 'operaciones' | 'mecanico' | 'supervisor' | 'socio' | 'chofer';
          avatar: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      vehicles: {
        Row: {
          id: string;
          tenant_id: string;
          eco: string;
          brand: string;
          model: string;
          year: number;
          color: string | null;
          plates: string | null;
          vin: string | null;
          status: 'active' | 'workshop' | 'inactive' | 'sold';
          platform: string[] | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vehicles']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['vehicles']['Insert']>;
      };
      drivers: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          vehicle_id: string | null;
          first_name: string;
          last_name: string;
          phone: string | null;
          email: string | null;
          licencia: string | null;
          licencia_tipo: string | null;
          licencia_vencimiento: string | null;
          curp: string | null;
          nss: string | null;
          address: string | null;
          hire_date: string | null;
          status: 'active' | 'inactive' | 'suspended';
          rating: number;
          score: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['drivers']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['drivers']['Insert']>;
      };
      weekly_accounts: {
        Row: {
          id: string;
          tenant_id: string;
          driver_id: string;
          vehicle_id: string | null;
          week_start: string;
          week_end: string;
          uber_income: number;
          didi_income: number;
          other_income: number;
          total_income: number;
          rent: number;
          deductions: number;
          balance: number;
          trips_count: number;
          hours_worked: number;
          status: 'pending' | 'paid' | 'partial';
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['weekly_accounts']['Row'], 'id' | 'total_income' | 'balance' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['weekly_accounts']['Insert']>;
      };
      maintenance_orders: {
        Row: {
          id: string;
          tenant_id: string;
          vehicle_id: string;
          orden: string;
          tipo: 'Preventivo' | 'Correctivo' | 'Urgente';
          descripcion: string;
          taller: string | null;
          fecha_ingreso: string;
          fecha_salida: string | null;
          costo_estimado: number | null;
          costo_real: number | null;
          status: 'Programado' | 'En diagnostico' | 'En reparacion' | 'Esperando refacciones' | 'Completado' | 'Cancelado';
          mechanic_id: string | null;
          condiciones: Json | null;
          notas: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['maintenance_orders']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['maintenance_orders']['Insert']>;
      };
      maintenance_parts: {
        Row: {
          id: string;
          order_id: string;
          nombre: string;
          cantidad: number;
          precio: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['maintenance_parts']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['maintenance_parts']['Insert']>;
      };
      attachments: {
        Row: {
          id: string;
          tenant_id: string;
          entity_type: 'maintenance' | 'driver' | 'incident' | 'candidate';
          entity_id: string;
          filename: string;
          file_type: 'image' | 'pdf' | 'other';
          storage_path: string;
          storage_url: string | null;
          size_bytes: number | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['attachments']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['attachments']['Insert']>;
      };
      incidents: {
        Row: {
          id: string;
          tenant_id: string;
          driver_id: string | null;
          vehicle_id: string | null;
          tipo: string;
          descripcion: string;
          fecha: string;
          costo: number | null;
          status: 'open' | 'investigating' | 'resolved' | 'closed';
          severity: 'low' | 'medium' | 'high' | 'critical';
          reported_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['incidents']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['incidents']['Insert']>;
      };
      candidates: {
        Row: {
          id: string;
          tenant_id: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          email: string | null;
          platform: string[] | null;
          kanban_stage: 'aplicacion' | 'pre_screening' | 'entrevista' | 'evaluacion' | 'documentos' | 'oferta' | 'contratado' | 'rechazado';
          score: number | null;
          source: string | null;
          referred_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['candidates']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['candidates']['Insert']>;
      };
      partners: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          vehicles: number;
          investment: number;
          monthly_income: number;
          roi: number | null;
          status: 'active' | 'inactive';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['partners']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['partners']['Insert']>;
      };
      treasury_transactions: {
        Row: {
          id: string;
          tenant_id: string;
          tipo: 'ingreso' | 'egreso' | 'transferencia';
          categoria: string;
          descripcion: string | null;
          monto: number;
          fecha: string;
          reference: string | null;
          driver_id: string | null;
          vehicle_id: string | null;
          status: 'pending' | 'completed' | 'cancelled';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['treasury_transactions']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['treasury_transactions']['Insert']>;
      };
    };
    Views: {};
    Functions: {
      get_user_tenant_id: {
        Args: {};
        Returns: string;
      };
      get_user_role: {
        Args: {};
        Returns: string;
      };
    };
    Enums: {};
  };
}
