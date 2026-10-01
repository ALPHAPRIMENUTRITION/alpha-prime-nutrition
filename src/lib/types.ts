// Tipos de dominio que usa la interfaz. Reflejan las tablas/vistas de
// supabase/migrations. Para tipos generados: `npx supabase gen types typescript`.

export type UserRole = "coach" | "client";

export type MembershipStatus = "active" | "past_due" | "grace" | "expired" | "suspended";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
}

export interface ClientOverviewRow {
  id: string;
  coach_id: string;
  first_name: string;
  last_name: string;
  email: string;
  goal: string | null;
  status: "active" | "suspended";
  start_date: string;
  renewal_date: string | null;
  avatar_url: string | null;
  current_weight_kg: number | null;
  current_body_fat_pct: number | null;
  adherence_pct: number | null;
  last_checkin_at: string | null;
  membership_status: MembershipStatus;
  days_to_renewal: number | null;
  checkin_pending: boolean;
}

export interface CoachDashboardStats {
  total: number;
  active: number;
  expiring_soon: number;
  overdue: number;
  expired: number;
  suspended: number;
  checkins_pending: number;
  low_adherence: number;
  revenue_30d_cents: number;
}

export interface ClientRecord {
  id: string;
  coach_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  goal: string | null;
  status: "active" | "suspended";
  start_date: string;
  renewal_date: string | null;
}
