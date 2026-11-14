import { useLayoutEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { OTP_LENGTH, sanitizeOtp } from './auth-flow';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  labelledBy: string;
  describedBy?: string;
}

/** Six single-digit boxes: paste anywhere, auto-advance, backspace goes back, numeric keypad and one-time-code autofill. */
export function OtpInput({ value, onChange, onComplete, disabled, invalid, labelledBy, describedBy }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  // Focus moves happen before React re-renders: the focus guard must see the value just committed.
  const latest = useRef(value);
  useLayoutEffect(() => { latest.current = value; }, [value]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? '');
  const focus = (index: number) => refs.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))]?.focus();
  const commit = (next: string) => {
    const clean = sanitizeOtp(next);
    latest.current = clean;
    onChange(clean);
    if (clean.length === OTP_LENGTH) onComplete?.(clean);
  };
  const fill = (index: number, text: string) => {
    const incoming = sanitizeOtp(text);
    if (!incoming) return;
    // One digit replaces the box; autofill and paste deliver the whole code at once and start from the first box.
    const next = incoming.length === 1
      ? (value.slice(0, index) + incoming + value.slice(index + 1)).slice(0, OTP_LENGTH)
      : (incoming.length >= OTP_LENGTH ? incoming : value.slice(0, index) + incoming).slice(0, OTP_LENGTH);
    commit(next);
    focus(incoming.length === 1 ? index + 1 : next.length);
  };
  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (digits[index]) commit(value.slice(0, index) + value.slice(index + 1));
      else if (index > 0) { commit(value.slice(0, index - 1) + value.slice(index)); focus(index - 1); }
    } else if (event.key === 'ArrowLeft') { event.preventDefault(); focus(index - 1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); focus(index + 1); }
  };
  const onPaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => { event.preventDefault(); fill(index, event.clipboardData.getData('text')); };
  return <div className="otp-boxes" role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}>
    {digits.map((digit, index) => <input
      key={index}
      ref={element => { refs.current[index] = element; }}
      className="otp-box"
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete={index === 0 ? 'one-time-code' : 'off'}
      enterKeyHint={index === OTP_LENGTH - 1 ? 'done' : 'next'}
      aria-label={`Dígito ${index + 1} de ${OTP_LENGTH}`}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      value={digit}
      // Focus never lands past the first empty box, so the code always fills left to right.
      onFocus={event => { if (index > latest.current.length) focus(latest.current.length); else event.currentTarget.select(); }}
      onChange={event => {
        const text = event.target.value;
        if (!text) return;
        fill(index, digit && text.length === 2 ? (text[0] === digit ? text[1] : text[0]) : text);
      }}
      onKeyDown={event => onKeyDown(index, event)}
      onPaste={event => onPaste(index, event)}
    />)}
  </div>;
}
