import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import toast, { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App'

window.addEventListener('unhandledrejection', (e) => {
  e.preventDefault()
  toast.error(e.reason?.message ?? String(e.reason))
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster position="bottom-center" />
  </StrictMode>
)
