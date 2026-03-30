import { create } from 'zustand';
import { api } from '../services/api';

interface User {
  user_id: string;
  email: string;
  nickname: string;
  name?: string;
  picture?: string;
  spiritual_interests: string[];
  subscription_status: string;
  has_completed_questionnaire: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, nickname: string, name?: string) => Promise<User>;
  processGoogleAuth: (sessionId: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),

  checkAuth: async () => {
    try {
      await api.init();
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    const { user } = await api.login(email, password);
    set({ user, isAuthenticated: true });
    return user;
  },

  register: async (email, password, nickname, name) => {
    const { user } = await api.register(email, password, nickname, name);
    set({ user, isAuthenticated: true });
    return user;
  },

  processGoogleAuth: async (sessionId) => {
    const { user } = await api.processGoogleSession(sessionId);
    set({ user, isAuthenticated: true });
    return user;
  },

  logout: async () => {
    await api.logout();
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (data) => {
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, ...data } });
    }
  },
}));
