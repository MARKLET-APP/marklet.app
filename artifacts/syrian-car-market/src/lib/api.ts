function getToken(): string | null {
  return localStorage.getItem("scm_token");
}

export async function apiRequest<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
  const token = getToken();

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw Object.assign(new Error(data?.error ?? `HTTP ${res.status}`), {
      status: res.status,
      data,
    });
  }

  return data as T;
}

export const api = {
  auth: {
    me: () =>
      apiRequest<{ id: number; name: string; email: string; role: string; profilePhoto?: string }>(
        "GET",
        "/api/auth/me"
      ),
  },

  ads: {
    recordView: (carId: number, userId: number | null) =>
      apiRequest("POST", "/api/ad/view", { car_id: carId, user_id: userId }),
    getViews: (carId: number) =>
      apiRequest<{ views: number; tag: string }>("GET", `/api/ad/${carId}/views`),
  },

  cars: {
    similar: (carId: number) =>
      apiRequest<unknown[]>("GET", `/api/cars/${carId}/similar`),
  },

  buyRequests: {
    list: () => apiRequest<unknown[]>("GET", "/api/buy-requests"),
    create: (data: object) => apiRequest("POST", "/api/buy-request", data),
    delete: (id: number) => apiRequest("DELETE", `/api/buy-requests/${id}`),
  },

  carParts: {
    list: (q?: string) =>
      apiRequest<unknown[]>("GET", `/api/car-parts${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    create: (data: object) => apiRequest("POST", "/api/car-parts", data),
    delete: (id: number) => apiRequest("DELETE", `/api/car-parts/${id}`),
  },

  junkCars: {
    list: () => apiRequest<unknown[]>("GET", "/api/junk-cars"),
    create: (data: object) => apiRequest("POST", "/api/junk-cars", data),
    delete: (id: number) => apiRequest("DELETE", `/api/junk-cars/${id}`),
  },

  missingCars: {
    list: () => apiRequest<unknown[]>("GET", "/api/missing-cars"),
    create: (data: object) => apiRequest("POST", "/api/missing-cars", data),
    markFound: (id: number) => apiRequest("PATCH", `/api/missing-cars/${id}/found`),
    delete: (id: number) => apiRequest("DELETE", `/api/missing-cars/${id}`),
  },

  support: {
    send: (data: object) => apiRequest("POST", "/api/support", data),
    feedback: (data: object) => apiRequest("POST", "/api/feedback", data),
  },

  inspections: {
    listCenters: () => apiRequest<unknown[]>("GET", "/api/inspection-centers"),
    book: (data: object) => apiRequest("POST", "/api/inspections", data),
  },

  admin: {
    dashboard: () =>
      apiRequest<{ usersCount: number; listingsCount: number; missingCarsCount: number }>(
        "GET",
        "/api/admin/dashboard"
      ),
  },
};
