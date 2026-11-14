/** Rutas públicas de los PDF generados por scripts/build-legal-pdfs.py y evento que abre el formulario en línea. */
const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
export const PRIVACY_DOCUMENTS = {
  notice: { href: `${base}legal/aviso-proteccion-datos-chulla-vida.pdf`, file: 'aviso-proteccion-datos-chulla-vida.pdf', label: 'Descargar Aviso de Protección de Datos' },
  form: { href: `${base}legal/formulario-derechos-datos-chulla-vida.pdf`, file: 'formulario-derechos-datos-chulla-vida.pdf', label: 'Descargar Formulario de Derechos' },
} as const;
export const PRIVACY_RIGHTS_EVENT = 'cv3:privacy-rights';
export const openRightsForm = () => window.dispatchEvent(new Event(PRIVACY_RIGHTS_EVENT));
