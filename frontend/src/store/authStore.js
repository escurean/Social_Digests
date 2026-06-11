import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// FIX #14: avoid circular dep with api.js by using fetch directly here.
// Authorization header is included when an in-memory token is available so
// that auth works even when cross-origin cookies are blocked.
async function fetchMe(token) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include', headers })
  if (!res.ok) return null
  const data = await res.json()
  return data.user
}

async function tryRefresh() {
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) return null
  const data = await res.json().catch(() => ({}))
  return data.accessToken || null
}

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      accessToken: null,

      // token is no longer stored here — it lives in an httpOnly cookie.
      // accessToken is also kept in memory so it can be sent as a Bearer header
      // when cross-origin cookies are unavailable (Railway deployment).
      login: (user, token) => set({ user, isAuthenticated: true, accessToken: token || null }),

      logout: () => set({ user: null, isAuthenticated: false, accessToken: null }),

      updateUser: (updates) =>
        set((state) => ({ user: { ...state.user, ...updates } })),

      setToken: (token) => set({ accessToken: token }),

      // FIX #14: call this on app mount when isAuthenticated=true but user=null
      // (happens after page refresh since user is no longer persisted to localStorage).
      checkAuth: async () => {
        const { isAuthenticated, accessToken } = get()
        if (!isAuthenticated) return

        let token = accessToken
        let user = await fetchMe(token)
        if (!user) {
          // Access token expired or missing — try to refresh
          token = await tryRefresh()
          if (token) {
            set({ accessToken: token })
            user = await fetchMe(token)
          }
        }

        if (user) {
          set({ user, isAuthenticated: true })
        } else {
          set({ user: null, isAuthenticated: false, accessToken: null })
        }
      },
    }),
    {
      name: 'sd-auth',
      // FIX #14: only persist the boolean flag, never the user object or token.
      // email, name, role are no longer written to localStorage (XSS mitigation).
      // user is re-fetched from /api/auth/me on each page load via checkAuth().
      // accessToken is in-memory only — lost on page refresh, recovered via checkAuth().
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated }),
    }
  )
)

export default useAuthStore
