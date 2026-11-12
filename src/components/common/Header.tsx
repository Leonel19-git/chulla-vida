import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Role, Language } from '../../types';
import { 
  Compass, 
  Globe, 
  SlidersHorizontal, 
  Bell, 
  UserCheck, 
  Sparkles,
  Layers,
  ChevronDown,
  X
} from 'lucide-react';

const LANGUAGE_OPTIONS: { code: Language; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇪🇨' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'ki', label: 'Kichwa (Runashimi)', flag: '☀️' }
];

const ROLE_OPTIONS: { role: Role; label: string; desc: string; icon: string }[] = [
  { role: 'turista', label: 'Turista (Wambra)', desc: 'Explorar, reservar, QR offline y chat', icon: '🎒' },
  { role: 'local', label: 'Comunidad Anfitriona', desc: 'Ver pagos liquidados y validar QR en sitio', icon: '🏡' },
  { role: 'gestor', label: 'Gestor Local Rural', desc: 'Asistencia y puente de baja conectividad', icon: '📲' },
  { role: 'gad', label: 'GAD Cantonal / Provincial', desc: 'Métricas de turismo rural y calendario Raymis', icon: '🏛️' },
  { role: 'aliado', label: 'Emprendedor Aliado', desc: 'Convenios y descuentos de ruta', icon: '🤝' }
];

export const Header: React.FC = () => {
  const { 
    role, 
    setRole, 
    language, 
    setLanguage, 
    t, 
    setIsOnboardingOpen, 
    notifications,
    dismissNotification 
  } = useApp();

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showAylluModal, setShowAylluModal] = useState(false);

  const currentLang = LANGUAGE_OPTIONS.find(l => l.code === language) || LANGUAGE_OPTIONS[0];
  const currentRoleObj = ROLE_OPTIONS.find(r => r.role === role) || ROLE_OPTIONS[0];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-amber-900/40 text-white">
      {/* Top Andean Ribbon Pattern (Otavalo Indigo, Salasaca Terracotta, Sol Andino) */}
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-600 via-red-600 to-indigo-600"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 text-white shadow-lg shadow-orange-500/20 font-black">
              {/* Stepped Andean Chakana Motif */}
              <span className="text-xl">✦</span>
              <span className="absolute -bottom-1 -right-1 text-[10px] bg-indigo-950 px-1 rounded-full border border-amber-400">EC</span>
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-amber-200 to-orange-300 bg-clip-text text-transparent">
                  {t('app_title')}
                </span>
                <span className="hidden sm:inline-block text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {t('kichwa_greeting')}
                </span>
              </div>
              <p className="text-[11px] text-amber-200/70 hidden sm:block truncate">
                {t('app_subtitle')}
              </p>
            </div>
          </div>

          {/* Mode Switcher: Wambra (Active) vs Ayllú (Future Family Mode) */}
          <div className="hidden lg:flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              className="px-3 py-1.5 rounded-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-sm flex items-center gap-1.5 cursor-default"
              title="Modo activo para mochileros, jóvenes aventureros y grupos de amigos"
            >
              <Compass className="w-3.5 h-3.5 text-yellow-300" />
              <span>{t('mode_guambra_badge')}</span>
            </button>
            <button
              onClick={() => setShowAylluModal(true)}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
              title="Modo familiar para niños y adultos mayores (Próxima actualización)"
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('mode_ayllu_badge')}</span>
            </button>
          </div>

          {/* Right Action Controls: Role, Language, Quiz, Notifications */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Onboarding Button */}
            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all"
              title="Ajustar tus gustos, presupuesto y personas"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t('onboarding_retake')}</span>
            </button>

            {/* Language Selector Dropdown (5 languages) */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsLangOpen(!isLangOpen);
                  setIsRoleOpen(false);
                  setIsNotifOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-colors"
                title="Cambiar idioma (5 idiomas disponibles)"
              >
                <span>{currentLang.flag}</span>
                <span className="hidden sm:inline font-semibold">{currentLang.code.toUpperCase()}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Idiomas / Simikuna
                  </div>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setIsLangOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                        language === lang.code ? 'text-amber-400 font-bold bg-amber-500/10' : 'text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </span>
                      {language === lang.code && <span className="text-amber-400">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Role Switcher Dropdown (5 roles) */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsRoleOpen(!isRoleOpen);
                  setIsLangOpen(false);
                  setIsNotifOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-950/80 hover:bg-indigo-900/90 border border-indigo-500/40 text-indigo-200 transition-colors shadow-sm"
                title="Cambiar rol para probar todas las experiencias"
              >
                <span>{currentRoleObj.icon}</span>
                <span className="hidden sm:inline max-w-[100px] truncate">{currentRoleObj.label}</span>
                <ChevronDown className="w-3 h-3 text-indigo-300" />
              </button>

              {isRoleOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-indigo-500/40 shadow-2xl py-1 z-50">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                      {t('switch_role')}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Explora la plataforma desde los 5 actores clave
                    </p>
                  </div>
                  {ROLE_OPTIONS.map((item) => (
                    <button
                      key={item.role}
                      onClick={() => {
                        setRole(item.role);
                        setIsRoleOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-xs flex items-start gap-2.5 hover:bg-slate-800 transition-colors ${
                        role === item.role ? 'bg-indigo-950 text-indigo-200 border-l-2 border-indigo-400' : 'text-slate-300'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <div className="flex-1">
                        <p className="font-bold flex items-center justify-between">
                          <span>{item.label}</span>
                          {role === item.role && <span className="text-indigo-400 text-xs">Activo</span>}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen);
                  setIsLangOpen(false);
                  setIsRoleOpen(false);
                }}
                className="relative p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
                title="Notificaciones push simuladas"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-600 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-3 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      Notificaciones en Vivo
                    </span>
                    <span className="text-[10px] text-slate-400">{notifications.length} activas</span>
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-800 mt-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No hay notificaciones pendientes</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="py-2 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-amber-300">{n.titulo}</p>
                            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{n.mensaje}</p>
                            <span className="text-[9px] text-slate-500">{n.timestamp}</span>
                          </div>
                          <button
                            onClick={() => dismissNotification(n.id)}
                            className="text-slate-500 hover:text-slate-300 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Modal explicativo: Modo Ayllú (Futura extensión) */}
      {showAylluModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👨‍👩‍👧‍👦</span>
                <h3 className="text-lg font-bold text-white">Modo Ayllú (Familia)</h3>
              </div>
              <button 
                onClick={() => setShowAylluModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="py-4 space-y-3 text-xs text-slate-300">
              <p>
                <strong className="text-amber-400">Arquitectura preparada:</strong> En esta versión MVP, el foco exclusivo es el <strong className="text-white">Modo Wambra</strong> (viajeros jóvenes, mochileros, grupos de amigos y aventura).
              </p>
              <p>
                El <strong className="text-emerald-400">Modo Ayllú</strong> se activará en la Fase 2 para familias con niños y adultos mayores, integrando:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                <li>Rutas accesibles sin escaladas pronunciadas.</li>
                <li>Menús infantiles y dietas blandas tradicionales.</li>
                <li>Hospedajes con habitaciones familiares conectadas.</li>
                <li>Talleres lúdicos para infancias (amasado de barro, cuentacuentos).</li>
              </ul>
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200">
                💡 Todo el código actual está desacoplado para soportar múltiples perfiles de usuario sin tocar el motor central de liquidaciones ni el sistema de sellos 3B+S.
              </div>
            </div>

            <button
              onClick={() => setShowAylluModal(false)}
              className="w-full py-2.5 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-95 transition-opacity"
            >
              Entendido, continuar en Modo Wambra
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
