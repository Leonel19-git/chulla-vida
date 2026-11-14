import { useEffect, useState } from 'react';
import { emptyWallet, parseWallet, WALLET_KEY, WALLET_LIMIT, isWalletRecord, type WalletRecord, type WalletState } from '../../domain/payments/purchase';

/** Evento que avisa a Mi viaje, a los botones de compra y a la billetera de un cambio. */
export const WALLET_UPDATED = 'cv3:wallet-updated';
/** Evento que abre la billetera (lo escucha `WalletHost`). */
export const WALLET_OPEN = 'cv3:wallet';

let memory: WalletState = emptyWallet();

/** Lee la billetera local versionada. Si el navegador bloquea el almacenamiento, usa la memoria de la sesión. */
export function readWallet(): WalletState {
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    if (raw === null) return memory;
    memory = parseWallet(JSON.parse(raw));
    return memory;
  } catch { return memory; }
}
function write(state: WalletState): boolean {
  memory = state;
  let persisted = true;
  try { localStorage.setItem(WALLET_KEY, JSON.stringify(state)); } catch { persisted = false; }
  window.dispatchEvent(new Event(WALLET_UPDATED));
  return persisted;
}
/** Inserta o reemplaza registros. Rechaza cualquier registro que no supere la validación (p. ej. una cédula sin enmascarar). */
export function upsertRecords(records: WalletRecord[]): boolean {
  if (!records.every(isWalletRecord)) throw new Error('Registro de billetera no válido');
  const current = readWallet().records.filter(item => !records.some(record => record.id === item.id));
  return write({ version: 1, records: [...records, ...current].slice(0, WALLET_LIMIT) });
}
export function updateRecord(id: string, patch: Partial<Pick<WalletRecord, 'status' | 'attempts'>>): boolean {
  const state = readWallet();
  const records = state.records.map(record => record.id === id ? { ...record, ...patch, updatedAt: new Date().toISOString() } : record);
  return write({ version: 1, records });
}
export function removeRecord(id: string): boolean {
  return write({ version: 1, records: readWallet().records.filter(record => record.id !== id) });
}
export function openWallet() { window.dispatchEvent(new Event(WALLET_OPEN)); }

/** Estado vivo de la billetera; se actualiza con cualquier compra hecha desde otra parte de la página. */
export function useWallet(): WalletRecord[] {
  const [records, setRecords] = useState(() => readWallet().records);
  useEffect(() => {
    const refresh = () => setRecords(readWallet().records);
    const storage = (event: StorageEvent) => { if (event.key === WALLET_KEY) refresh(); };
    window.addEventListener(WALLET_UPDATED, refresh); window.addEventListener('storage', storage);
    return () => { window.removeEventListener(WALLET_UPDATED, refresh); window.removeEventListener('storage', storage); };
  }, []);
  return records;
}
/** Solo para pruebas. */
export function resetWalletMemory() { memory = emptyWallet(); }
