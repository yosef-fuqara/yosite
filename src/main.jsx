import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import { I18nProvider } from './i18n/I18nContext.jsx'

document.documentElement.classList.remove('yo-built-shared')

const path = window.location.pathname.replace(/\/+$/, "") || "/"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {path === "/privacy-policy" ? (
      <PrivacyPolicy />
    ) : (
      <I18nProvider>
        <App />
      </I18nProvider>
    )}
  </StrictMode>,
)
