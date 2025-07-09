'use client'

import { useQuery } from '@tanstack/react-query'
import React, { createContext, useContext } from 'react'
import { getValidCalcomToken } from '~/app/(default)/(dashboard)/scheduling/actions'

interface CalcomContextType {
  accessToken: string | null
  isLoading: boolean
  error: Error | null
}

const CalcomContext = createContext<CalcomContextType>({
  accessToken: null,
  isLoading: false,
  error: null,
})

export const useCalcom = () => useContext(CalcomContext)

interface CalcomProviderProps {
  children: React.ReactNode
  accessToken: string | null
  refreshToken?: string | null
}

export const CalcomProvider = ({ children }: CalcomProviderProps) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['calcom-valid-token'],
    queryFn: getValidCalcomToken,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  })

  const accessToken = data?.success ? (data.accessToken ?? null) : null

  return (
    <CalcomContext.Provider value={{ accessToken, isLoading, error }}>
      {children}
    </CalcomContext.Provider>
  )
}
