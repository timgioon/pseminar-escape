import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publicKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

/** Public browser client only. Never put a secret/service-role key in VITE_* variables. */
export const supabase = url && publicKey
  ? createClient(url, publicKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

/** Must stay in sync with supabase/functions/create-member/index.ts. */
export function normalizeUsername(value: string): string {
  return value.trim().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Synthetic, non-deliverable email used only as Supabase Auth's login identifier. */
export function authEmailForUsername(value: string): string {
  return `${normalizeUsername(value)}@login.seminar-escape.invalid`;
}

export function generateAccessCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join("");
}
