import { useId, useState, type ClipboardEvent, type SyntheticEvent } from 'react';
import { OTP_LENGTH, sanitizeOtp } from './auth-flow';

import { useT } from '../../i18n/v3';
interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  labelledBy: string;
  describedBy?: string;
}

/**
 * UN solo campo real (no seis): así el autocompletado de iOS (Mail y Mensajes) y de Android/Gmail rellena el código
 * completo desde el teclado. Las seis celdas se dibujan debajo y el campo transparente queda encima.
 */
export function OtpInput({ value, onChange, onComplete, disabled, invalid, labelledBy, describedBy }: OtpInputProps) {
  const t = useT();
  const hintId = useId();
  const [focused, setFocused] = useState(false);
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? '');
  const commit = (text: string) => {
    const clean = sanitizeOtp(text);
    if (clean === value) return;
    onChange(clean);
    if (clean.length === OTP_LENGTH) onComplete?.(clean);
  };
  // Pegar «Tu código: 482-913» tiene más de 6 caracteres: se limpia antes de que maxLength lo recorte.
  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => { event.preventDefault(); commit(event.clipboardData.getData('text')); };
  // El cursor siempre queda al final: el código se llena de izquierda a derecha.
  const toEnd = (event: SyntheticEvent<HTMLInputElement>) => {
    const input = event.currentTarget; const end = input.value.length;
    if (input.selectionStart !== end || input.selectionEnd !== end) { try { input.setSelectionRange(end, end); } catch { /* algunos tipos no lo permiten */ } }
  };
  const active = Math.min(value.length, OTP_LENGTH - 1);
  return <div className={`otp-field${invalid ? ' is-invalid' : ''}${disabled ? ' is-disabled' : ''}`}>
    <span id={hintId} className="sr-only">{t("Código de {n} dígitos", { n: OTP_LENGTH })}</span>
    <input
      className="otp-input"
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="one-time-code"
      maxLength={OTP_LENGTH}
      enterKeyHint="done"
      spellCheck={false}
      autoCorrect="off"
      autoCapitalize="off"
      aria-labelledby={`${labelledBy} ${hintId}`}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      value={value}
      onChange={event => commit(event.target.value)}
      onPaste={onPaste}
      onFocus={event => { setFocused(true); toEnd(event); }}
      onBlur={() => setFocused(false)}
      onSelect={toEnd}
    />
    <div className="otp-cells" aria-hidden="true">
      {digits.map((digit, index) => <span key={index} className={`otp-cell${digit ? ' is-filled' : ''}${focused && index === active && value.length < OTP_LENGTH ? ' is-active' : ''}`}>{digit}</span>)}
    </div>
  </div>;
}
