import { Languages } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { languageMetadata } from '../../i18n/ui';
import { kichwaReviewNotice } from '../../i18n/kichwa';
import type { Language } from '../../types';
import './language-selector.css';

export function LanguageSelector({ intro = false }: { intro?: boolean }) {
  const { language, setLanguage, t } = useApp();
  const partial = language === 'ki' || language === 'ki-amz';
  return <div className={`language-control ${intro ? 'language-control-intro' : ''}`}>
    <label className="language-select"><Languages size={17} aria-hidden="true" /><span className="sr-only">{t('Idioma')}</span>
      <select aria-label={t('Idioma')} value={language} onChange={event => setLanguage(event.target.value as Language)}>
        {(Object.keys(languageMetadata) as Language[]).map(code => <option key={code} value={code} lang={languageMetadata[code].tag}>{languageMetadata[code].name}</option>)}
      </select>
    </label>
    {partial && !intro && <span className="language-partial" role="status">{kichwaReviewNotice}</span>}
  </div>;
}
