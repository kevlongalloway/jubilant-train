import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PrecisApp from './App.jsx'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PrecisApp />
  </StrictMode>,
)
