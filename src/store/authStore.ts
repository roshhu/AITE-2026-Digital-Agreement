import { create } from 'zustand';
import { Volunteer } from '../types';
import { persist } from 'zustand/middleware';

type Language = 'en' | 'te';

interface AuthState {
  volunteer: Volunteer | null;
  isAuthenticated: boolean;
  language: Language;
  setVolunteer: (volunteer: Volunteer) => void;
  setLanguage: (lang: Language) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      volunteer: null,
      isAuthenticated: false,
      language: 'en',
      setVolunteer: (volunteer) => set({ volunteer, isAuthenticated: true }),
      setLanguage: (lang) => set({ language: lang }),
      logout: () => set({ volunteer: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
