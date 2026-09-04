import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import '@/index.css'
import App from './App'
import { reportRejection } from '@/shared/util/reportRejection'

window.addEventListener('unhandledrejection', reportRejection)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    <Toaster position="bottom-center" />
  </StrictMode>
)
