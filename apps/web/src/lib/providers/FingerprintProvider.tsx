'use client'

import { Thumbmark } from '@thumbmarkjs/thumbmarkjs'
import { useEffect } from 'react'

export const FingerprintProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const generateAndStoreFingerprint = async () => {
      try {
        const storedFingerprint = sessionStorage.getItem('fingerprint')
        if (!storedFingerprint) {
          const tm = new Thumbmark()
          const fp = await tm.get()
          sessionStorage.setItem('fingerprint', fp)
        }
      } catch (error) {
        console.error('Error generating or storing fingerprint:', error)
      }
    }

    void generateAndStoreFingerprint()
  }, [])

  return <>{children}</>
}
