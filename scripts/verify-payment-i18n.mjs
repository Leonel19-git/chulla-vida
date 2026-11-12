import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync('src/i18n/payments.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports });
const { paymentTranslations } = module.exports;
const sourceKeys = Object.keys(paymentTranslations.en).sort();
for (const language of ['en', 'fr', 'pt', 'zh']) {
  assert.deepEqual(Object.keys(paymentTranslations[language]).sort(), sourceKeys);
  assert.ok(Object.values(paymentTranslations[language]).every(value => value.trim().length));
  for (const source of sourceKeys) {
    assert.deepEqual((paymentTranslations[language][source].match(/\{\w+\}/g) || []).sort(), (source.match(/\{\w+\}/g) || []).sort(), `${language}: interpolation survives for ${source}`);
  }
}
// A missing label in a decline or receipt should not quietly fall back to Spanish.
for (const source of [
  'Simular pago de {total}', 'Esta experiencia admite de 1 a {max} personas. Ajusta tu grupo.',
  'Transferencia de prueba pendiente', 'COMPROBANTE DE SIMULACIÓN · SIN VALOR DE PAGO',
  'No quedan suficientes cupos para esa fecha.', 'Cancelar solicitud', 'Sí, cancelar solicitud',
  'No acredita un pago ni una reserva real. No se ha cobrado dinero.',
]) assert.ok(source in paymentTranslations.en, source);
console.log(`Payment localization verified: ${sourceKeys.length} messages in English, French, Portuguese and Chinese; interpolation tokens preserved.`);
