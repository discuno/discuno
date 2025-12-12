'use client'

/**
 * Opens a centered popup window for authentication
 */
export const openCenteredWindow = (url: string, title: string, width: number, height: number) => {
  if (typeof window === 'undefined' || !window.top) return null

  const x = window.top.outerWidth / 2 + window.top.screenX - width / 2
  const y = window.top.outerHeight / 2 + window.top.screenY - height / 2

  return window.open(
    url,
    title,
    `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${y}, left=${x}`
  )
}

/**
 * Manages the OAuth popup authentication flow
 */
export const openAuthWindow = (authUrl: string): Promise<'success'> => {
  return new Promise((resolve, reject) => {
    const authWindow = openCenteredWindow(authUrl, 'Discuno Sign In', 600, 700)

    if (!authWindow) {
      // Fallback if popup is blocked
      window.location.href = authUrl
      return
    }

    const cleanup = () => {
      window.removeEventListener('message', handleMessage)
      clearInterval(checkTimer)
    }

    const handleMessage = (event: MessageEvent) => {
      // Security check: ensure message is from our own origin
      if (event.origin !== window.location.origin) return

      if (event.data === 'oauth-success') {
        cleanup()
        authWindow.close()
        resolve('success')
      }
    }

    window.addEventListener('message', handleMessage)

    // Check if window was closed manually by user
    const checkTimer = setInterval(() => {
      if (authWindow.closed) {
        cleanup()
        // If closed without success message, it's a cancellation
        reject(new Error('Auth window closed by user'))
      }
    }, 500)
  })
}
