import { create } from 'zustand';
import type { AttentionItem, DashboardStats, Page } from '../types';
import * as api from '../services/api';

interface AppState {
  sidebarCollapsed: boolean;
  currentPage: Page;
  currentShift: string;
  dashboardStats: DashboardStats | null;
  isLoadingStats: boolean;
  statsError: string | null;
  attentionList: AttentionItem[];
  isLoadingAttention: boolean;
  attentionError: string | null;
  pendingTankId: number | null;
  editDipRecordId: number | null;
  toggleSidebar: () => void;
  setPage: (page: Page) => void;
  navigateToTankTrends: (tankId: number) => void;
  clearPendingTankId: () => void;
  setCurrentShift: (shift: string) => void;
  startEditDip: (id: number) => void;
  clearEditDip: () => void;
  loadDashboardStats: () => Promise<void>;
  loadAttentionList: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  currentPage: 'dashboard',
  currentShift: '--',
  dashboardStats: null,
  isLoadingStats: false,
  statsError: null,
  attentionList: [],
  isLoadingAttention: false,
  attentionError: null,
  pendingTankId: null,
  editDipRecordId: null,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setPage: (page: Page) => set({ currentPage: page }),

  navigateToTankTrends: (tankId: number) =>
    set({ pendingTankId: tankId, currentPage: 'tank-trends' }),

  clearPendingTankId: () => set({ pendingTankId: null }),

  startEditDip: (id: number) => set({ editDipRecordId: id, currentPage: 'new-dip' }),

  clearEditDip: () => set({ editDipRecordId: null }),

  setCurrentShift: (shift: string) => set({ currentShift: shift }),

  loadDashboardStats: async () => {
    set({ isLoadingStats: true, statsError: null });
    try {
      const stats = await api.getDashboardStats();
      set({
        dashboardStats: stats,
        currentShift: stats.current_shift?.shift_name ?? '--',
        isLoadingStats: false,
      });
    } catch (err) {
      set({
        isLoadingStats: false,
        statsError: err instanceof Error ? err.message : 'Failed to load stats',
      });
    }
  },

  loadAttentionList: async () => {
    set({ isLoadingAttention: true, attentionError: null });
    try {
      const list = await api.getAttentionList();
      set({ attentionList: list, isLoadingAttention: false });
    } catch (err) {
      set({
        isLoadingAttention: false,
        attentionError: err instanceof Error ? err.message : 'Failed to load attention items',
      });
    }
  },
}));
