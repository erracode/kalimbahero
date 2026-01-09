import { create } from 'zustand';

interface UIStore {
    isAuthOpen: boolean;
    openAuth: () => void;
    closeAuth: () => void;
    toggleAuth: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
    isAuthOpen: false,
    openAuth: () => set({ isAuthOpen: true }),
    closeAuth: () => set({ isAuthOpen: false }),
    toggleAuth: () => set((state) => ({ isAuthOpen: !state.isAuthOpen })),
}));
