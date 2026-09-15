import { create } from "zustand";
import { UserData } from "./auth-service";

interface AuthState {
  user: UserData | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: UserData) => void;
  logout: () => void;
  initialize: () => void;
}

const getStoredAuth = (): { token: string | null; user: UserData | null } => {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return { token: null, user: null };
    }
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    let user: UserData | null = null;
    if (savedToken && savedUser) {
      try {
        user = JSON.parse(savedUser);
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
    return { token: savedToken, user };
  } catch {
    return { token: null, user: null };
  }
};

const initialAuth = getStoredAuth();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialAuth.user,
  token: initialAuth.token,
  isLoading: false,
  login: (token, user) => {
    try {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    } catch (e) {
      console.error("Failed to persist auth to localStorage", e);
    }
    set({ token, user, isLoading: false });
  },
  logout: () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch (e) {
      console.error("Failed to clear auth from localStorage", e);
    }
    set({ token: null, user: null, isLoading: false });
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  },
  initialize: () => {
    const { token, user } = getStoredAuth();
    set({ token, user, isLoading: false });
  },
}));

