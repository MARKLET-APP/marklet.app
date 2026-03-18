import { withApi } from "@/lib/runtimeConfig";

function getToken(): string | null {
  return localStorage.getItem("scm_token");
}

export async function apiRequest<T = unknown>(url: string, method = "GET", body?: unknown): Promise<T> {
  const token = getToken();

  const res = await fetch(withApi(url), {
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
        "/api/auth/me"
      ),
  },

  ads: {
    recordView: (carId: number, userId: number | null) =>
      apiRequest("/api/ad/view", "POST", { car_id: carId, user_id: userId }),
    getViews: (carId: number) =>
      apiRequest<{ views: number; tag: string }>(`/api/ad/${carId}/views`),
  },

  cars: {
    similar: (carId: number) =>
      apiRequest<unknown[]>(`/api/cars/${carId}/similar`),
    markSold: (carId: number) =>
      apiRequest(`/api/cars/${carId}/sold`, "POST"),
    update: (carId: number, data: object) =>
      apiRequest(`/api/cars/${carId}`, "PATCH", data),
  },

  buyRequests: {
    list: () => apiRequest<unknown[]>("/api/buy-requests"),
    create: (data: object) => apiRequest("/api/buy-request", "POST", data),
    delete: (id: number) => apiRequest(`/api/buy-requests/${id}`, "DELETE"),
  },

  carParts: {
    list: (q?: string) =>
      apiRequest<unknown[]>(`/api/car-parts${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    create: (data: object) => apiRequest("/api/car-parts", "POST", data),
    delete: (id: number) => apiRequest(`/api/car-parts/${id}`, "DELETE"),
  },

  junkCars: {
    list: () => apiRequest<unknown[]>("/api/junk-cars"),
    create: (data: object) => apiRequest("/api/junk-cars", "POST", data),
    delete: (id: number) => apiRequest(`/api/junk-cars/${id}`, "DELETE"),
  },

  rentalCars: {
    list: () => apiRequest<unknown[]>("/api/rental-cars"),
    create: (data: object) => apiRequest("/api/rental-cars", "POST", data),
    delete: (id: number) => apiRequest(`/api/rental-cars/${id}`, "DELETE"),
  },

  missingCars: {
    list: () => apiRequest<unknown[]>("/api/missing-cars"),
    create: (data: object) => apiRequest("/api/missing-cars", "POST", data),
    markFound: (id: number) => apiRequest(`/api/missing-cars/${id}/found`, "PATCH"),
    delete: (id: number) => apiRequest(`/api/missing-cars/${id}`, "DELETE"),
  },

  support: {
    send: (data: object) => apiRequest("/api/support", "POST", data),
    feedback: (data: object) => apiRequest("/api/feedback", "POST", data),
  },

  inspections: {
    listCenters: () => apiRequest<unknown[]>("/api/inspection-centers"),
    book: (data: object) => apiRequest("/api/inspections", "POST", data),
  },

  admin: {
    dashboard: () =>
      apiRequest<{ usersCount: number; listingsCount: number; missingCarsCount: number }>(
        "/api/admin/dashboard"
      ),
    pendingCars: () =>
      apiRequest<Array<{
        id: number; brand: string; model: string; year: number; price: number;
        mileage: number | null; fuelType: string | null; transmission: string | null;
        condition: string | null; color: string | null; description: string | null;
        city: string; province: string; saleType: string | null; category: string | null;
        status: string; createdAt: string; sellerName: string; sellerPhone: string | null;
        primaryImage: string | null; images: string[];
      }>>(
        "/api/admin/pending-cars"
      ),
    listCars: () =>
      apiRequest<{
        cars: Array<{
          id: number; brand: string; model: string; year: number; price: number;
          mileage: number | null; fuelType: string | null; transmission: string | null;
          condition: string | null; color: string | null; description: string | null;
          city: string; province: string; saleType: string | null; category: string | null;
          status: string; createdAt: string; sellerName: string; sellerPhone: string | null;
          primaryImage: string | null; images: string[];
        }>;
        total: number;
      }>(
        "/api/admin/cars"
      ),
    updateCarStatus: (id: number, status: "pending" | "approved" | "rejected") =>
      apiRequest(`/api/admin/cars/${id}/status`, "PATCH", { status }),
    deleteCar: (id: number) =>
      apiRequest(`/api/admin/cars/${id}`, "DELETE"),
    listBuyRequests: () =>
      apiRequest<Array<{
        id: number; userId: number; brand: string | null; model: string | null;
        minYear: number | null; maxYear: number | null; maxPrice: number | null;
        currency: string | null; city: string | null; paymentType: string | null;
        description: string | null; status: string; createdAt: string;
        userName: string | null; userPhone: string | null;
      }>>("/api/admin/buy-requests"),
    updateBuyRequestStatus: (id: number, status: "pending" | "approved" | "rejected") =>
      apiRequest(`/api/admin/buy-requests/${id}`, "PATCH", { status }),
    listSupportMessages: () =>
      apiRequest<Array<{
        id: number; userId: number | null; type: string; message: string;
        status: string; createdAt: string; userName: string | null; userPhone: string | null;
      }>>("/api/support"),
    listFeedback: () =>
      apiRequest<Array<{
        id: number; userId: number | null; feedback: string; createdAt: string; userName: string | null;
      }>>("/api/feedback"),
  },

  get: (url: string) => fetch(withApi(url), {
    headers: { "Content-Type": "application/json", ...(localStorage.getItem("scm_token") ? { Authorization: `Bearer ${localStorage.getItem("scm_token")}` } : {}) },
  }),

  post: (url: string, body: unknown) => apiRequest(url, "POST", body),
  patch: (url: string, body: unknown) => apiRequest(url, "PATCH", body),
  delete: (url: string) => apiRequest(url, "DELETE"),
};
