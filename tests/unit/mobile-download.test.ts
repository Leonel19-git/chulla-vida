// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BLOB_URL_LIFETIME_MS, IOS_DOWNLOAD_HINT, isIosDevice, saveFile, withIosDownloadHint } from '../../src/components/common/download';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('detección de iPhone y iPad', () => {
  it('reconoce iPhone, y iPad que se presenta como Mac con pantalla táctil', () => {
    expect(isIosDevice({ userAgent: IPHONE })).toBe(true);
    expect(isIosDevice({ userAgent: MAC, platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true);
  });
  it('no confunde Android ni una Mac de escritorio', () => {
    expect(isIosDevice({ userAgent: ANDROID, platform: 'Linux armv8l', maxTouchPoints: 5 })).toBe(false);
    expect(isIosDevice({ userAgent: MAC, platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false);
    expect(isIosDevice(undefined)).toBe(false);
  });
  it('solo añade el aviso de «Guardar en Archivos» en iOS', () => {
    expect(withIosDownloadHint('Archivo listo.', { userAgent: IPHONE })).toBe(`Archivo listo. ${IOS_DOWNLOAD_HINT}`);
    expect(withIosDownloadHint('Archivo listo.', { userAgent: ANDROID })).toBe('Archivo listo.');
    expect(IOS_DOWNLOAD_HINT).toMatch(/Compartir/);
    expect(IOS_DOWNLOAD_HINT).toMatch(/Guardar en Archivos/);
  });
});

describe('saveFile', () => {
  it('añade el enlace al documento, lo pulsa, lo quita y libera la URL un minuto después', () => {
    vi.useFakeTimers();
    const create = vi.fn(() => 'blob:prueba');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const clicks: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(document.body.contains(this)).toBe(true);
      clicks.push(this);
    });

    expect(saveFile('<p>hola</p>', 'ficha.html', 'text/html;charset=utf-8')).toBe(true);
    expect(create).toHaveBeenCalledOnce();
    const blob = (create.mock.calls[0] as unknown as [Blob])[0];
    expect(blob.type).toBe('text/html;charset=utf-8');
    expect(clicks).toHaveLength(1);
    expect(clicks[0].download).toBe('ficha.html');
    expect(document.querySelectorAll('a').length).toBe(0);

    vi.advanceTimersByTime(BLOB_URL_LIFETIME_MS - 1);
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revoke).toHaveBeenCalledWith('blob:prueba');
  });
});
