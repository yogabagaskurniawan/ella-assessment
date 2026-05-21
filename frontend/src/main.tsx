import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        success: {
          style: {
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
          },
        },
        error: {
          style: {
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
          },
        },
      }}
    />
  </StrictMode>,
)
