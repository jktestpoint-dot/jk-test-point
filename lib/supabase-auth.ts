import { getSupabaseConfig } from "@/lib/supabase";

export const ACCESS_TOKEN_COOKIE = "jk_test_point_access_token";
export const REFRESH_TOKEN_COOKIE = "jk_test_point_refresh_token";

export type AuthenticatedStudent = {
  id: string;
  email?: string;
  name: string;
};

type SupabaseUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
};

export async function signInStudent(email: string, password: string) {
  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Invalid email or password.");
  const session = await response.json() as { access_token: string; refresh_token: string; user: SupabaseUser };
  if (!session.user.email_confirmed_at) throw new Error("Please verify the code sent to your email before logging in.");
  return session;
}

export async function registerStudent(name: string, email: string, password: string) {
  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data: { full_name: name } }),
    cache: "no-store"
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { msg?: string; message?: string; error_description?: string } | null;
    throw new Error(error?.msg || error?.error_description || error?.message || "Unable to create your account. Please try again.");
  }
  return response.json() as Promise<{ access_token?: string; refresh_token?: string; user: SupabaseUser }>;
}

export async function verifyRegistrationOtp(email: string, token: string) {
  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "signup", email, token }),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("That verification code is invalid or has expired.");
  const session = await response.json() as { access_token?: string; refresh_token?: string; user: SupabaseUser };
  if (!session.access_token || !session.refresh_token || !session.user.email_confirmed_at) {
    throw new Error("Your email could not be verified. Please request a new code.");
  }
  return session as { access_token: string; refresh_token: string; user: SupabaseUser };
}

export async function getAuthenticatedStudent(accessToken: string): Promise<AuthenticatedStudent | null> {
  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });
  if (!response.ok) return null;
  const user = (await response.json()) as SupabaseUser;
  if (!user.email_confirmed_at) return null;
  const metadata = user.user_metadata || {};
  const metadataName = metadata.full_name || metadata.name || metadata.display_name;
  const name = typeof metadataName === "string" && metadataName.trim()
    ? metadataName.trim()
    : user.email?.split("@")[0] || "Student";
  return { id: user.id, email: user.email, name };
}

export async function refreshStudentSession(refreshToken: string) {
  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });

  if (!response.ok) return null;
  const session = await response.json().catch(() => null) as { access_token?: string; refresh_token?: string } | null;
  if (!session?.access_token || !session.refresh_token) return null;
  return { accessToken: session.access_token, refreshToken: session.refresh_token };
}
