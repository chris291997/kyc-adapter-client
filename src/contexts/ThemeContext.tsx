import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { STORAGE_KEYS } from '../constants'

interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
  setTheme: (isDark: boolean) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME)
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark-theme', 'dark')
    } else {
      root.classList.remove('dark-theme', 'dark')
    }
    localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => setIsDark(!isDark)
  
  const setTheme = (dark: boolean) => setIsDark(dark)

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}


