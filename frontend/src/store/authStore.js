import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// FIX #14: avoid circular dep with api.js by using fetch directly here.
// The httpOnly cookies are sent automatically with credentials:'include'.
async function fetchMe() {
  const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' })
  if (!res.ok) return null
  const data = await res.json()
  return data.user
}

async function tryRefresh() {
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
  return res.ok
}

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      // token is no longer stored here — it lives in an httpOnly cookie
      login: (user) => set({ user, isAuthenticated: true }),

      logout: () => set({ user: null, isAuthenticated: false }),

      updateUser: (updates) =>
        set((state) => ({ user: { ...state.user, ...updates } })),

      // FIX #14: call this on app mount when isAuthenticated=true but user=null
      // (happens after page refresh since user is no longer persisted to localStorage).
      checkAuth: async () => {
        const { isAuthenticated } = get()
        if (!isAuthenticated) return

        let user = await fetchMe()
        if (!user) {
          // Access token expired — try refresh then retry
          const refreshed = await tryRefresh()
          if (refreshed) user = await fetchMe()
        }

        if (user) {
          set({ user, isAuthenticated: true })
        } else {
          set({ user: null, isAuthenticated: false })
        }
      },
    }),
    {
      name: 'sd-auth',
      // FIX #14: only persist the boolean flag, never the user object.
      // email, name, role are no longer written to localStorage (XSS mitigation).
      // user is re-fetched from /api/auth/me on each page load via checkAuth().
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated }),
    }
  )
)

export default useAuthStore
