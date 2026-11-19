import { StrictMode,lazy,Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { registerOfflineSupport } from './features/offline/registration';
import './components/chulla/regional-theme.css'
import './styles/album/tokens.css'
import './styles/continuity.css'
const StaffApp=lazy(()=>import('./features/admin/StaffApp'));
const App=lazy(()=>import('./App.tsx'));
const staffRoute=/^\/(equipo|administracion)\/?$/.test(window.location.pathname);

/* Las animaciones solo corren con la pestaña a la vista; oculta o en captura, todo se muestra ya terminado. */
const syncMotion = () => document.documentElement.classList.toggle('cv-motion-ok', document.visibilityState === 'visible');
syncMotion();
document.addEventListener('visibilitychange', syncMotion);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<p role="status">Cargando CHULLA VIDA…</p>}>{staffRoute?<StaffApp/>:<App />}</Suspense>
  </StrictMode>,
)
if(!staffRoute)void registerOfflineSupport();
