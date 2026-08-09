import { create } from 'zustand';
import type { DashboardStats, Page } from '../types';
import * as api from '../services/api';

interface AppState {
  sidebarCollapsed: boolean;
  currentPage: Page;
  currentShift: string;
  dashboardStats: DashboardStats | null;
  isLoadingStats: boolean;
  statsError: string | null;
  pendingTankId: number | null;
  toggleSidebar: () => void;
  setPage: (page: Page) => void;
  navigateToTankTrends: (tankId: number) => void;
  clearPendingTankId: () => void;
  setCurrentShift: (shift: string) => void;
  loadDashboardStats: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  currentPage: 'dashboard',
  currentShift: '--',
  dashboardStats: null,
  isLoadingStats: false,
  statsError: null,
  pendingTankId: null,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setPage: (page: Page) => set({ currentPage: page }),

  navigateToTankTrends: (tankId: number) =>
    set({ pendingTankId: tankId, currentPage: 'tank-trends' }),

  clearPendingTankId: () => set({ pendingTankId: null }),

  setCurrentShift: (shift: string) => set({ currentShift: shift }),

  loadDashboardStats: async () => {
    set({ isLoadingStats: true, statsError: null });
    try {
      const stats = await api.getDashboardStats();
      set({ dashboardStats: stats, isLoadingStats: false });
    } catch (err) {
      set({
        isLoadingStats: false,
        statsError: err instanceof Error ? err.message : 'Failed to load stats',
      });
    }
  },
}));
