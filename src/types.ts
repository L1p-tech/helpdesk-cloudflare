export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_SETUP_TOKEN: string;
  SESSION_TTL_HOURS: string;
}

export type Role = "employee" | "editor" | "admin";

export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  role: Role;
}

export interface SessionRow {
  id: number;
  user_id: number;
  username: string;
  display_name: string;
  role: Role;
  active: number;
  expires_at: string;
}

export interface JsonObject {
  [key: string]: unknown;
}
