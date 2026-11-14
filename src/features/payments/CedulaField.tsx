import { useId, useState } from 'react';
import { BadgeCheck, CircleAlert, IdCard } from 'lucide-react';
import { maskCedula, validateCedula, validatePassport, type DocumentType } from '../../domain/identity/cedula';
import './checkout.css';

export interface DocumentValue { type: DocumentType; number: string }
export interface DocumentValidity { valid: boolean; masked: string; provinceName: string | null }

/** Estado del documento para el formulario. Nunca guarda el número: solo calcula su validez. */
export function documentValidity(value: DocumentValue): DocumentValidity {
  if (value.type === 'passport') {
    const result = validatePassport(value.number);
    return { valid: result.valid, masked: result.valid ? maskCedula(result.normalized) : '', provinceName: null };
  }
  const result = validateCedula(value.number);
  return { valid: result.valid, masked: result.valid ? maskCedula(result.normalized) : '', provinceName: result.provinceName };
}

/**
 * Campo de cédula ecuatoriana o pasaporte con validación en vivo.
 * Comprueba el FORMATO (provincia, tercer dígito y dígito verificador). No consulta el Registro Civil
 * y no guarda el número en el navegador: quien lo use debe conservar solo `maskCedula(...)`.
 */
export function CedulaField({ value, onChange, disabled = false }: { value: DocumentValue; onChange: (value: DocumentValue) => void; disabled?: boolean }) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const isPassport = value.type === 'passport';
  const cedula = isPassport ? null : validateCedula(value.number);
  const passport = isPassport ? validatePassport(value.number) : null;
  const valid = Boolean(cedula?.valid || passport?.valid);
  const digits = value.number.replace(/\D/g, '').length;
  const reason = cedula?.reason ?? passport?.reason ?? null;
  const incomplete = !isPassport && (cedula?.code === 'incomplete' || cedula?.code === 'empty');
  const state: 'empty' | 'incomplete' | 'invalid' | 'valid' = valid ? 'valid' : !value.number ? 'empty' : incomplete && !touched ? 'incomplete' : 'invalid';
  const setType = (type: DocumentType) => { setTouched(false); onChange({ type, number: '' }); };
  return <fieldset className="cedula-field" data-state={state} disabled={disabled}>
    <legend>Documento de identidad</legend>
    <div className="cedula-switch" role="radiogroup" aria-label="Tipo de documento">
      <label><input type="radio" name={`${id}-type`} checked={!isPassport} onChange={() => setType('cedula')} />Cédula ecuatoriana</label>
      <label><input type="radio" name={`${id}-type`} checked={isPassport} onChange={() => setType('passport')} />Pasaporte (visitantes)</label>
    </div>
    <label className="cedula-input" htmlFor={`${id}-number`}>
      <span>{isPassport ? 'Número de pasaporte' : 'Número de cédula · 10 dígitos'}</span>
      <span className="cedula-box">
        <IdCard size={20} aria-hidden="true" />
        <input id={`${id}-number`} className="field" value={value.number} autoComplete="off" spellCheck={false}
          inputMode={isPassport ? 'text' : 'numeric'} maxLength={isPassport ? 20 : 10} pattern={isPassport ? '[A-Za-z0-9]{5,20}' : '[0-9]{10}'}
          aria-invalid={state === 'invalid'} aria-describedby={`${id}-status ${id}-honesty`}
          onBlur={() => setTouched(true)}
          onChange={event => onChange({ type: value.type, number: isPassport ? event.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20) : event.target.value.replace(/\D/g, '').slice(0, 10) })} />
        {!isPassport && <span className="cedula-count" aria-hidden="true">{digits}/10</span>}
      </span>
    </label>
    <p id={`${id}-status`} className="cedula-status" role="status" aria-live="polite">
      {state === 'valid' ? <><span className="cedula-check" aria-hidden="true"><BadgeCheck size={20} /></span>
        <span className="cedula-card">
          <strong className="cedula-card-title">Formato válido</strong>
          <span className="cedula-card-number">{isPassport ? `Pasaporte ${passport?.normalized ?? ''}` : `Cédula ${cedula?.formatted ?? ''}`}</span>
          <span className="cedula-card-meta">{cedula?.provinceName ? <>Provincia: {cedula.provinceName} · </> : null}se guardará como <span className="cedula-masked">{maskCedula(cedula?.normalized ?? passport?.normalized ?? '')}</span></span>
        </span></>
        : state === 'invalid' ? <><CircleAlert size={18} aria-hidden="true" /><span>{reason}</span></>
          : state === 'incomplete' ? <span>Llevas {digits} de 10 dígitos.</span>
            : <span>{isPassport ? 'Escribe el número tal como aparece en tu pasaporte.' : 'Escribe los 10 números, sin guion.'}</span>}
    </p>
    <p id={`${id}-honesty`} className="cedula-honesty">{isPassport ? 'Solo revisamos que tenga letras y números; no consultamos al país emisor.' : 'Comprobamos el dígito verificador; no consultamos el Registro Civil.'} Guardamos solo los últimos 4 caracteres.</p>
  </fieldset>;
}
