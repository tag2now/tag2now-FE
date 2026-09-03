import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import toast, { Toaster } from 'react-hot-toast'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import '@/index.css'
import App from './App'

window.addEventListener('unhandledrejection', (e) => {
  e.preventDefault()
  toast.error(e.reason?.message ?? String(e.reason))
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    <Toaster position="bottom-center" />
  </StrictMode>
)
