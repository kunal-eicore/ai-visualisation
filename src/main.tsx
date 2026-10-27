import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth/useAuth'
import { LoginPage } from './login/LoginPage'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* In production /auth/ is its own build (vite.login.config.ts); the dev
        server has no middleware and falls back to this entry, so render it here. */}
    {window.location.pathname.startsWith('/auth') ? (
      <LoginPage />
    ) : (
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    )}
  </React.StrictMode>,
)
