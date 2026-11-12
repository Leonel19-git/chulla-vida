import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cache = new Map();
function load(path) {
  let filename = resolve(root, path);
  if (!existsSync(filename)) filename += '.ts';
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => load(resolve(dirname(filename), id)), Date });
  return module.exports;
}
const { INITIAL_PLACES: places } = load('src/data/mockData.ts');
const { buildOfflineRoute, validateOfflineRoute } = load('src/lib/offline-route.ts');
assert.ok(places.length >= 28);
assert.equal(new Set(places.map(place => place.id)).size, places.length);
const preferences = { pasiones: ['Naturaleza', 'Cultura Viva'], presupuesto_max: 20, tipo_gasto: 'mochilero', dias_disponibles: 1, cantidad_personas: 2, region_preferida: 'Todas', nivel_aventura: 'Moderado', completado: true, origen: 'Cuenca' };
for (const region of ['Sierra', 'Costa', 'Amazonía']) {
  const route = buildOfflineRoute(places, { ...preferences, region_preferida: region });
  assert.ok(route.stops.length > 0, `${region} has a $20 group outing`);
  assert.ok(route.total <= 20);
  assert.ok(validateOfflineRoute(route));
}
for (const place of places.filter(place => place.slug.endsWith('-paseo-local'))) {
  assert.equal(place.duracion_dias, 1);
  assert.ok(place.imagenes.every(image => image.startsWith('/images/')));
  assert.equal(place.sellos.verificado_gad, false);
  assert.equal(place.contacto_whatsapp, '');
  assert.ok(place.que_no_incluye.length >= 3);
}
const islands = places.filter(place => place.slug.endsWith('-paseo-local') && place.region === 'Galápagos');
assert.equal(islands.length, 3);
assert.ok(islands.every(place => place.que_no_incluye.some(item => item.includes('Vuelos'))));
const unaffordable = buildOfflineRoute(places, { ...preferences, region_preferida: 'Galápagos' });
assert.equal(unaffordable.stops.length, 0, '$20 does not imply an affordable Galápagos group trip');
console.log(`Catalog verification passed: ${places.length} destinations, 4 regions, $20 mainland group routes; island exclusions preserved.`);
