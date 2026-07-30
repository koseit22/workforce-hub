const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export async function api<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message ?? "通信に失敗しました。");
  return data as T;
}
