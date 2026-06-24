import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { AppRouter } from './app/AppRouter'
import { DesktopUpdateProvider } from './hooks/useDesktopUpdate'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DesktopUpdateProvider>
          <AppRouter />
        </DesktopUpdateProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
