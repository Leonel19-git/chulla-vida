import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerOfflineSupport } from './features/offline/registration';
import './components/chulla/regional-theme.css'

/* Las animaciones solo corren con la pestaña a la vista; oculta o en captura, todo se muestra ya terminado. */
const syncMotion = () => document.documentElement.classList.toggle('cv-motion-ok', document.visibilityState === 'visible');
syncMotion();
document.addEventListener('visibilitychange', syncMotion);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
void registerOfflineSupport();
