import { create } from 'zustand'

const useToastStore = create((set) => ({
  toasts: [],

  addToast: ({ message, type = 'info' }) =>
    set((state) => ({
      toasts: [...state.toasts, { id: Date.now(), message, type }],
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))

export default useToastStore
