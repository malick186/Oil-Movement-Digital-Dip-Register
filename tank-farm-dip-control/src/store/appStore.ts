import { create } from 'zustand';
import type { DashboardStats, Page } from '../types';
import * as api from '../services/api';

interface AppState {
  sidebarCollapsed: boolean;
  currentPage: Page;
  currentShift: string;
  dashboardStats: DashboardStats | null;
  isLoadingStats: boolean;
  toggleSidebar: () => void;
  setPage: (page: Page) => void;
  setCurrentShift: (shift: string) => void;
  loadDashboardStats: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  currentPage: 'dashboard',
  currentShift: '--',
  dashboardStats: null,
  isLoadingStats: false,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setPage: (page: Page) => set({ currentPage: page }),

  setCurrentShift: (shift: string) => set({ currentShift: shift }),

  loadDashboardStats: async () => {
    set({ isLoadingStats: true });
    try {
      const stats = await api.getDashboardStats();
      set({ dashboardStats: stats, isLoadingStats: false });
    } catch {
      set({ isLoadingStats: false });
    }
  },
}));
