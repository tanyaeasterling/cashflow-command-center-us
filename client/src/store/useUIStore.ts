import { create } from "zustand";

export type TabId =
  | 'overview'
  | 'cash'
  | 'profit-first'
  | 'ar-aging'
  | 'ap-aging'
  | 'sales-tax'
  | 'inventory'
  | 'real-revenue'
  | 'debt-service'
  | 'stress-test'
  | 'alerts'
  | 'reports'
  | 'settings';

interface UIStore {
  activeTab: TabId;
  isUploading: boolean;
  uploadProgress: number;
  sidebarOpen: boolean;

  setActiveTab: (tab: TabId) => void;
  setUploading: (uploading: boolean, progress?: number) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeTab: 'overview',
  isUploading: false,
  uploadProgress: 0,
  sidebarOpen: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setUploading: (uploading, progress = 0) => set({ isUploading: uploading, uploadProgress: progress }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
