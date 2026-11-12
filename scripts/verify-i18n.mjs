import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modules = new Map();
function load(file) {
  const filename = resolve(root, file.endsWith('.ts') ? file : `${file}.ts`);
  if (modules.has(filename)) return modules.get(filename);
  const module = { exports: {} };
  modules.set(filename, module.exports);
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const require = name => load(resolve(dirname(filename), name));
  vm.runInNewContext(source, { module, exports: module.exports, require }, { filename });
  return module.exports;
}

const { translate } = load('src/i18n/ui.ts');
const { translateOffline } = load('src/i18n/offline.ts');
const { kichwaTranslations } = load('src/i18n/kichwa.ts');
if (process.argv.includes('--gaps')) {
  const ui = readFileSync(resolve(root, 'src/i18n/ui.ts'), 'utf8').split('`')[1].trim().split('\n').map(row => row.split('|')[0]);
  console.log(ui.filter(key => !kichwaTranslations[key]).join('\n'));
  process.exit(0);
}
const critical = ['Idioma', 'Explorar Ecuador', 'Planificar mi viaje', 'Ruta sin internet', 'Mis guardados', 'Mis viajes y pagos', 'Cultura y Raymis', 'Comunidad wambra', 'Mi negocio', 'Saltar intro', 'Tu gente.', 'Tu país. Tu plan.', 'Entrar a CHULLA VIDA', '¡De ley, vamos!', 'Sierra', 'Costa', 'Amazonía', 'Todo Ecuador', 'Arma un planazo', '¿A dónde nos vamos?', 'Filtros', 'Buscar experiencias', 'Menor precio', 'por persona', 'Conocer', 'Guardar', 'Continuar', 'Atrás', '¿Qué te mueve?', '¿Cuál es tu presupuesto total?', '¿Cuántos días tienes?', '¿Cuántos van?', '¿Qué región te late?', '¿Cuánta aventura?', '¿De dónde arrancas?', '¿Cerca o más lejitos?', 'Buscar tu ciudad', '¡De una, ver mi ruta!'];
let assertions = 0;
for (const language of ['en', 'fr', 'pt', 'zh', 'ki', 'ki-amz']) {
  for (const key of critical) {
    const output = translate(language, key);
    assert.equal(typeof output, 'string');
    assert.ok(output.trim(), `${language}: empty ${key}`);
    // Shared spelling in closely related languages (Filtros, Costa...) is valid.
    if (language.startsWith('ki')) assert.notEqual(output, key, `${language}: untranslated ${key}`);
    assertions++;
  }
  assert.ok(translate(language, 'Conocer {place}', { place: 'Cuenca' }).includes('Cuenca'));
  assert.ok(!translate(language, '{count} experiencias para descubrir', { count: 28 }).includes('{count}'));
  assert.ok(!translateOffline(language, 'Desde {origin} · {people} personas · hasta {days} días', { origin: 'Cuenca', people: 2, days: 4 }).match(/\{\w+\}/));
  assertions += 3;
}
for (const [key, text] of Object.entries(kichwaTranslations)) {
  assert.ok(text.trim() && text !== 'undefined');
  const parameters = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  assert.deepEqual(parameters(text), parameters(key), `Kichwa variable mismatch: ${key}`);
  assertions++;
}
const offlineSource = readFileSync(resolve(root, 'src/i18n/offline.ts'), 'utf8');
const offlineKeys = [...offlineSource.matchAll(/^\s*\['([^']+)',/gm)].map(match => match[1]);
for (const language of ['ki', 'ki-amz']) for (const key of offlineKeys) {
  assert.notEqual(translateOffline(language, key), key, `${language}: missing offline ${key}`);
  assertions++;
}
const walletSource = resolve(root, 'src/i18n/wallet.ts');
if (existsSync(walletSource)) {
  const rows = readFileSync(walletSource, 'utf8').split('`')[1].trim().split('\n');
  for (const row of rows) {
    const key = row.split('|')[0];
    assert.notEqual(translate('ki', key), key, `Missing wallet Kichwa: ${key}`);
    assertions++;
  }
}
for (const file of ['ui', 'host', 'payments', 'wallet', 'premium']) {
  const filename = resolve(root, `src/i18n/${file}.ts`);
  if (!existsSync(filename)) continue;
  const rows = readFileSync(filename, 'utf8').split('`')[1].trim().split('\n');
  for (const row of rows) {
    const [source, ...values] = row.split('|');
    for (const [index, language] of ['en', 'fr', 'pt', 'zh'].entries()) {
      assert.ok(values[index]?.trim(), `${file}: ${language} empty ${source}`);
      const variables = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
      assert.deepEqual(variables(values[index]), variables(source), `${file}: ${language} variables ${source}`);
      assertions++;
    }
  }
}
console.log(`PASS: ${assertions} interface translation checks; ${Object.keys(kichwaTranslations).length} Kichwa literals. Regional phrases remain a unified editorial draft pending community review.`);
