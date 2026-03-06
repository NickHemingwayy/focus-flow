"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

export interface NoteType {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
interface NotePadState {
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;

  notes: NoteType[];

  // Actions
  createNote: (id: string) => void;
  updateNote: (id: string, content: string) => void;
  deleteNote: (id: string) => void;
  renameNote: (id: string, name: string) => void;
}

export const useNote = create<NotePadState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      // State
      notes: [],
      // Actions
      createNote: (id) =>
        set((state) => {
          const note = {
            id: id,
            name: "Untitled",
            content: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return { notes: [note, ...state.notes] };
        }),
      updateNote: (id, content) =>
        set((state) => {
          return {
            notes: state.notes.map((n) =>
              n.id === id
                ? { ...n, content, updatedAt: new Date().toISOString() }
                : n,
            ),
          };
        }),
      deleteNote: (id) =>
        set((state) => {
          return {
            notes: state.notes.filter((n) => n.id !== id),
          };
        }),
      renameNote: (id, name) =>
        set((state) => {
          return {
            notes: state.notes.map((n) => (n.id === id ? { ...n, name } : n)),
          };
        }),
    }),
    {
      name: "note-storage", // unique name for localStorage
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
