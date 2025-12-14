import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './payup/auth/AuthProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 30 seconds before marking as stale
      staleTime: 30 * 1000,
      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Don't refetch on window focus (reduces unnecessary API calls)
      refetchOnWindowFocus: false,
      // Retry failed requests once
      retry: 1,
    },
  },
})

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Check for updates every hour
        window.setInterval(() => {
          void registration.update()
        }, 60 * 60 * 1000)
      })
      .catch(() => {
        // Ignore SW errors (e.g. unsupported browsers)
      })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
