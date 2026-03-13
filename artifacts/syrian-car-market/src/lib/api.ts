export async function apiRequest<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
  const token = localStorage.getItem("scm_token");

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return res.json();
}
