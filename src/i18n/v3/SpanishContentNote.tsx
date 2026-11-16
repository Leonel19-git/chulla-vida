import { msg, useT, useV3Language } from './index';

/**
 * Aviso breve cuando la interfaz no está en español: el contenido del catálogo, las fiestas,
 * las respuestas de MIJIN y los documentos legales se mantienen en su idioma original.
 */
export function SpanishContentNote({ text = msg('Contenido en español') }: { text?: string }) {
  const language = useV3Language();
  const t = useT();
  if (language === 'es') return null;
  return <p className="cv-lang-note" lang={language === 'zh' ? 'zh-Hans' : language.startsWith('ki') ? 'qu-EC' : language}><span aria-hidden="true">ES · </span>{t(text)}</p>;
}
