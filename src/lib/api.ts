export type AppRole = "company" | "buyer";

export interface AppUser {
  id: string;
  email: string;
}

export interface AuthProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  industry?: string;
  description?: string;
  wallet_balance: number;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: AppUser;
  role: AppRole;
  profile: AuthProfile;
}

const TOKEN_KEY = "stock_watcher_token";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}, requiresAuth = false): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (requiresAuth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const authApi = {
  signUp: (payload: {
    email: string;
    password: string;
    fullName: string;
    role: AppRole;
    industry?: string;
    description?: string;
  }) => request<AuthResponse>("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),

  signIn: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/auth/signin", { method: "POST", body: JSON.stringify(payload) }),

  me: () =>
    request<{ user: AppUser; role: AppRole; profile: AuthProfile }>("/auth/me", {}, true),
};

export const stockApi = {
  list: (params?: { companyId?: string; availableOnly?: boolean; ids?: string[] }) => {
    const query = new URLSearchParams();
    if (params?.companyId) query.set("companyId", params.companyId);
    if (params?.availableOnly) query.set("availableOnly", "true");
    if (params?.ids?.length) query.set("ids", params.ids.join(","));
    return request<{ data: any[] }>(`/stocks${query.toString() ? `?${query.toString()}` : ""}`, {}, true);
  },

  create: (payload: any) =>
    request<{ data: any }>("/stocks", { method: "POST", body: JSON.stringify(payload) }, true),

  update: (id: string, payload: any) =>
    request<{ data: any }>(`/stocks/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, true),

  remove: (id: string) => request<{ ok: boolean }>(`/stocks/${id}`, { method: "DELETE" }, true),
};

export const profileApi = {
  list: (userIds?: string[]) => {
    const query = new URLSearchParams();
    if (userIds?.length) query.set("userIds", userIds.join(","));
    return request<{ data: any[] }>(
      `/profiles${query.toString() ? `?${query.toString()}` : ""}`,
      {},
      true
    );
  },
};

export const transactionApi = {
  list: (params?: { buyerId?: string; companyId?: string }) => {
    const query = new URLSearchParams();
    if (params?.buyerId) query.set("buyerId", params.buyerId);
    if (params?.companyId) query.set("companyId", params.companyId);
    return request<{ data: any[] }>(
      `/transactions${query.toString() ? `?${query.toString()}` : ""}`,
      {},
      true
    );
  },

  purchase: (stockId: string, quantity: number) =>
    request<{ data: any; wallet_balance: number }>(
      "/transactions/purchase",
      { method: "POST", body: JSON.stringify({ stockId, quantity }) },
      true
    ),
};

