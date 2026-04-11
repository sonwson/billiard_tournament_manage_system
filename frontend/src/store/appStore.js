import { create } from 'zustand'

const STORAGE_KEY = 'cue-score-auth'
const LOCALE_STORAGE_KEY = 'cue-score-locale'
const ADMIN_ROLES = ['admin', 'super_admin', 'tournament_admin']

function readStoredAuth() {
  const fallback = {
    accessToken: '',
    refreshToken: '',
    user: null,
    isAdmin: false,
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function readStoredLocale() {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY) || 'en'
  } catch {
    return 'en'
  }
}

export const useAppStore = create((set) => ({
  activeEventTab: 'Info',
  auth: readStoredAuth(),
  locale: readStoredLocale(),
  toasts: [],
  setActiveEventTab: (tab) => set({ activeEventTab: tab }),
  setLocale: (locale) =>
    set(() => {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale)
      return { locale }
    }),
  setAuth: (payload) =>
    set(() => {
      const nextAuth = {
        accessToken: payload.accessToken || '',
        refreshToken: payload.refreshToken || '',
        user: payload.user || null,
        isAdmin: ADMIN_ROLES.includes(payload.user?.role),
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth))
      return { auth: nextAuth }
    }),
  mergeAuth: (partial) =>
    set((state) => {
      const mergedUser = partial.user ? { ...(state.auth.user || {}), ...partial.user } : state.auth.user
      const nextAuth = {
        ...state.auth,
        ...partial,
        user: mergedUser,
        isAdmin: ADMIN_ROLES.includes(mergedUser?.role),
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth))
      return { auth: nextAuth }
    }),
  clearAuth: () =>
    set(() => {
      localStorage.removeItem(STORAGE_KEY)
      return {
        auth: {
          accessToken: '',
          refreshToken: '',
          user: null,
          isAdmin: false,
        },
      }
    }),
  pushToast: (toast) => {
    const id = toast.id || crypto.randomUUID()
    const duration = toast.duration ?? 3200
    set((state) => ({
      toasts: [...state.toasts, { id, type: toast.type || 'info', title: toast.title || '', message: toast.message || '', duration }],
    }))

    if (duration > 0) {
      window.setTimeout(() => {
        useAppStore.getState().removeToast(id)
      }, duration)
    }

    return id
  },
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((toast) => toast.id !== id),
  })),
}))
