import { create } from "zustand";
import { type User } from "@workspace/api-client-react";

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isHydrated: boolean;
}

// Intercept fetch to automatically add JWT token
const originalFetch = window.fetch;
window.fetch = async (input, init = {}) => {
  const token = localStorage.getItem("scm_token");
  if (token) {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    init.headers = headers;
  }
  return originalFetch(input, init);
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("scm_token"),
  isHydrated: false,
  setAuth: (user, token) => {
    localStorage.setItem("scm_token", token);
    set({ user, token, isHydrated: true });
  },
  logout: () => {
    localStorage.removeItem("scm_token");
    set({ user: null, token: null, isHydrated: true });
    window.location.href = "/login";
  },
}));

// Setup initial hydration
if (typeof window !== "undefined") {
  const token = localStorage.getItem("scm_token");
  if (token) {
    // Optimistic hydration, rely on App layout to validate via /auth/me
    useAuthStore.setState({ token, isHydrated: true });
  } else {
    useAuthStore.setState({ isHydrated: true });
  }
}
