'use client'
import { createContext, useContext } from 'react'

export const PermissionsContext = createContext<string[]>([])

export function usePermissions(): string[] {
  return useContext(PermissionsContext)
}
