import { create } from 'zustand';

interface AdminBranchState {
  branchCount: number | null;
  setBranchCount: (count: number) => void;
  incrementBranchCount: () => void;
}

export const useAdminBranchStore = create<AdminBranchState>((set, get) => ({
  branchCount: null,
  setBranchCount: (count) => set({ branchCount: count }),
  incrementBranchCount: () => {
    const current = get().branchCount;
    if (current !== null) set({ branchCount: current + 1 });
  },
}));
