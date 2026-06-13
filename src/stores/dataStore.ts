import { create } from 'zustand';
import { api, Manuscript, Correction, HistoryRecord } from '../services/api';

interface DataState {
  manuscripts: Manuscript[];
  corrections: Correction[];
  history: HistoryRecord[];
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  fetchManuscripts: () => Promise<void>;
  fetchCorrections: (status?: string) => Promise<void>;
  fetchHistory: (params?: { manuscriptId?: string; correctionId?: string }) => Promise<void>;
  createManuscript: (data: Partial<Manuscript>) => Promise<boolean>;
  updateManuscript: (id: string, data: Partial<Manuscript>) => Promise<boolean>;
  deleteManuscript: (id: string) => Promise<boolean>;
  createCorrection: (data: Partial<Correction>) => Promise<Correction | null>;
  updateCorrection: (id: string, data: Partial<Correction>) => Promise<boolean>;
  submitCorrection: (id: string, comment?: string) => Promise<boolean>;
  reviewCorrection: (id: string, action: 'pass' | 'reject', comment?: string) => Promise<boolean>;
  legalConfirmCorrection: (id: string, action: 'confirm' | 'reject', comment?: string) => Promise<boolean>;
  publishCorrection: (id: string, comment?: string) => Promise<boolean>;
  revokeCorrection: (id: string, comment?: string) => Promise<boolean>;
}

export const useDataStore = create<DataState>((set, get) => ({
  manuscripts: [],
  corrections: [],
  history: [],
  isLoading: false,
  error: null,
  setError: (error) => set({ error }),

  fetchManuscripts: async () => {
    set({ isLoading: true, error: null });
    const response = await api.manuscripts.list();
    if (response.success && response.data) {
      set({ manuscripts: response.data as Manuscript[], isLoading: false });
    } else {
      set({ error: response.error?.message || '获取稿件失败', isLoading: false });
    }
  },

  fetchCorrections: async (status?: string) => {
    set({ isLoading: true, error: null });
    const response = await api.corrections.list(status);
    if (response.success && response.data) {
      set({ corrections: response.data as Correction[], isLoading: false });
    } else {
      set({ error: response.error?.message || '获取更正单失败', isLoading: false });
    }
  },

  fetchHistory: async (params) => {
    set({ isLoading: true, error: null });
    const response = await api.history.list(params);
    if (response.success && response.data) {
      set({ history: response.data as HistoryRecord[], isLoading: false });
    } else {
      set({ error: response.error?.message || '获取历史记录失败', isLoading: false });
    }
  },

  createManuscript: async (data) => {
    set({ isLoading: true, error: null });
    const response = await api.manuscripts.create(data);
    if (response.success && response.data) {
      await get().fetchManuscripts();
      set({ isLoading: false });
      return true;
    } else {
      set({ error: response.error?.message || '创建稿件失败', isLoading: false });
      return false;
    }
  },

  updateManuscript: async (id, data) => {
    set({ isLoading: true, error: null });
    const response = await api.manuscripts.update(id, data);
    if (response.success) {
      await get().fetchManuscripts();
      set({ isLoading: false });
      return true;
    } else {
      set({ error: response.error?.message || '更新稿件失败', isLoading: false });
      return false;
    }
  },

  deleteManuscript: async (id) => {
    set({ isLoading: true, error: null });
    const response = await api.manuscripts.delete(id);
    if (response.success) {
      await get().fetchManuscripts();
      set({ isLoading: false });
      return true;
    } else {
      set({ error: response.error?.message || '删除稿件失败', isLoading: false });
      return false;
    }
  },

  createCorrection: async (data) => {
    set({ isLoading: true, error: null });
    const response = await api.corrections.create(data);
    if (response.success && response.data) {
      await get().fetchCorrections();
      set({ isLoading: false });
      return response.data as Correction;
    } else {
      set({ error: response.error?.message || '创建更正单失败', isLoading: false });
      return null;
    }
  },

  updateCorrection: async (id, data) => {
    set({ isLoading: true, error: null });
    const response = await api.corrections.update(id, data);
    if (response.success) {
      await get().fetchCorrections();
      set({ isLoading: false });
      return true;
    } else {
      set({ error: response.error?.message || '更新更正单失败', isLoading: false });
      return false;
    }
  },

  submitCorrection: async (id, comment) => {
    set({ isLoading: true, error: null });
    const response = await api.corrections.submit(id, comment);
    if (response.success && response.data) {
      set((state) => ({
        corrections: state.corrections.map((c) =>
          c.id === id ? response.data as Correction : c
        ),
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: response.error?.message || '提交失败', isLoading: false });
      return false;
    }
  },

  reviewCorrection: async (id, action, comment) => {
    set({ isLoading: true, error: null });
    const response = await api.corrections.review(id, action, comment);
    if (response.success && response.data) {
      set((state) => ({
        corrections: state.corrections.map((c) =>
          c.id === id ? response.data as Correction : c
        ),
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: response.error?.message || '复核失败', isLoading: false });
      return false;
    }
  },

  legalConfirmCorrection: async (id, action, comment) => {
    set({ isLoading: true, error: null });
    const response = await api.corrections.legal(id, action, comment);
    if (response.success && response.data) {
      set((state) => ({
        corrections: state.corrections.map((c) =>
          c.id === id ? response.data as Correction : c
        ),
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: response.error?.message || '法务确认失败', isLoading: false });
      return false;
    }
  },

  publishCorrection: async (id, comment) => {
    set({ isLoading: true, error: null });
    const response = await api.corrections.publish(id, comment);
    if (response.success && response.data) {
      set((state) => ({
        corrections: state.corrections.map((c) =>
          c.id === id ? response.data as Correction : c
        ),
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: response.error?.message || '发布失败', isLoading: false });
      return false;
    }
  },

  revokeCorrection: async (id, comment) => {
    set({ isLoading: true, error: null });
    const response = await api.corrections.revoke(id, comment);
    if (response.success && response.data) {
      set((state) => ({
        corrections: state.corrections.map((c) =>
          c.id === id ? response.data as Correction : c
        ),
        isLoading: false,
      }));
      return true;
    } else {
      set({ error: response.error?.message || '撤销失败', isLoading: false });
      return false;
    }
  },
}));
