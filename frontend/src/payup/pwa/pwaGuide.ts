import { useState } from 'react'

export function isRunningStandalone(): boolean {
  const standaloneMq = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return standaloneMq || iosStandalone
}

function isMobileDevice(): boolean {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768
  )
}

export function useShouldShowPWAGuide(): boolean {
  // Compute once per page load; sessionStorage is the source of truth.
  const [shouldShow] = useState<boolean>(() => {
    // Only show on mobile, and if not already installed or dismissed
    const isMobile = isMobileDevice()
    const isStandalone = isRunningStandalone()
    const hasSeenGuide = sessionStorage.getItem('pwaGuideShown') === 'true'
    return isMobile && !isStandalone && !hasSeenGuide
  })

  return shouldShow
}

export function markPWAGuideAsShown() {
  sessionStorage.setItem('pwaGuideShown', 'true')
}











