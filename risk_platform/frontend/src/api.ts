const API = "/api/v1";

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type User = { id: number; email: string; role: string };

export type Score = {
  prediction_id: number;
  probability_default: number;
  recommendation: string;
  risk_tier: string;
  explanation: {
    narratives?: string[];
    top_contributions?: { feature: string; shap_value: number; direction: string }[];
  };
  policy_snapshot: Record<string, unknown>;
};

export type FriendlyForm = {
  applicant_segment: string;
  monthly_income_usd: number;
  amount_usd: number;
  term_months: number;
  employment_sector?: string;
  loan_purpose?: string;
  existing_obligations?: number;
  months_at_employer?: number;
  province?: string;
  annual_rate_pct?: number;
};
