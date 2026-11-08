import { createContext, useContext } from 'react'

export const AppStateContext = createContext(null)

export function useAppState() {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState debe usarse dentro de AppStateContext.')
  }
  return context
}
