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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  login: (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ token, user, isLoading: false });
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, user: null, isLoading: false });
  },
  initialize: () => {
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
    set({ token: savedToken, user, isLoading: false });
  },
}));
