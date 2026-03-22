import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PrecisApp from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PrecisApp />
  </StrictMode>,
)
