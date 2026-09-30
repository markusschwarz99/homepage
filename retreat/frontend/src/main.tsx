import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initNowOverride } from './lib/agenda'
import { initTokenFromUrl } from './lib/api'
import { RetreatProvider } from './lib/retreat'

// Vor dem ersten Render: ?k=<token> übernehmen
initTokenFromUrl()
initNowOverride()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RetreatProvider>
      <App />
    </RetreatProvider>
  </StrictMode>,
)
