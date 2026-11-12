import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual TypeScript modules without a browser or an added test dependency.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'chullavida:v1:';
let assertions = 0;
const check = (label, callback) => { callback(); assertions++; };
const same = (actual, expected) => assert.equal(JSON.stringify(actual), JSON.stringify(expected));
const fixedTime = '2026-10-23T02:30:00Z'; // Still October 22 in Ecuador.
class EcuadorBoundaryDate extends Date {
  constructor(value) { super(value === undefined ? fixedTime : value); }
  static now() { return new Date(fixedTime).getTime(); }
}

function harness(entries = new Map()) {
  let cursor = 0;
  const states = [];
  const effects = [];
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: initial => {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], update => { states[index] = typeof update === 'function' ? update(states[index]) : update; }];
    },
    useEffect: effect => { effects.push(effect); },
    useContext: () => null,
  };
  react.useRef = initial => react.useState({ current: initial })[0];
  react.default = react;
  const browser = {
    localStorage: {
      getItem: key => entries.get(key) ?? null,
      setItem: (key, value) => { entries.set(key, value); },
    },
  };
  const modules = new Map();
  function load(relative) {
    let filename = resolve(root, relative);
    if (!existsSync(filename) || !/\.[cm]?[jt]sx?$/.test(filename)) {
      filename = ['.ts', '.tsx', '/index.ts'].map(extension => filename + extension).find(existsSync);
    }
    if (!filename) throw new Error(`Cannot resolve ${relative}`);
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.React },
      fileName: filename,
    });
    vm.runInNewContext(outputText, {
      module, exports: module.exports, window: browser, Date: EcuadorBoundaryDate, Intl,
      crypto: { randomUUID }, console,
      require: id => {
        if (id === 'react') return react;
        if (id.startsWith('.')) return load(resolve(dirname(filename), id));
        throw new Error(`Unexpected import ${id}`);
      },
    }, { filename });
    return module.exports;
  }
  const render = () => {
    cursor = 0;
    const tree = load('src/context/AppContext.tsx').AppProvider({ children: null });
    while (effects.length) effects.shift()();
    return tree.props.value;
  };
  return { entries, browser, load, render };
}

const helpers = harness();
const recommendations = helpers.load('src/lib/recommendations.ts');
const storage = helpers.load('src/lib/storage.ts');
const data = helpers.load('src/data/mockData.ts');
const place = { ...data.INITIAL_PLACES[0], titulo: 'Sendero de montaña', descripcion_corta: 'Una caminata por el paisaje', etiquetas: ['Aventura', 'Fotografía'], que_incluye: ['Guía local'], precio_base_pp: 45, duracion_dias: 2, cupos_disponibles_dia: 8, nivel_aventura: 'Moderado' };
const preferences = { pasiones: ['Fotografía'], presupuesto_max: 90, tipo_gasto: 'equilibrado', dias_disponibles: 2, cantidad_personas: 2, region_preferida: 'Sierra', nivel_aventura: 'Moderado', completado: true, origen: 'Cuenca', distancia_max: 200 };

check('normalizes accents and case', () => assert.equal(recommendations.normalizeText('  CULTÚRA VÍVA  '), 'cultura viva'));
check('complete group experience price does not multiply duration', () => assert.equal(recommendations.getPlaceTotal(place, preferences), 90));
check('exact budget is feasible', () => assert.equal(recommendations.matchesPreferences(place, preferences), true));
for (const [label, change] of [
  ['group budget exceeded', { precio_base_pp: 46 }], ['duration exceeded', { duracion_dias: 3 }],
  ['wrong region', { region: 'Costa' }], ['wrong intensity', { nivel_aventura: 'Adrenalina' }],
  ['insufficient group capacity', { cupos_disponibles_dia: 1 }],
  ['wrong interest', { titulo: 'Encuentro urbano', descripcion_corta: 'Conversación', etiquetas: ['Historia'], que_incluye: ['Café'] }],
]) check(label, () => assert.equal(recommendations.matchesPreferences({ ...place, ...change }, preferences), false));
check('group changes affect budget', () => assert.equal(recommendations.matchesPreferences(place, { ...preferences, cantidad_personas: 3 }), false));
check('all-region and all-intensity choices work', () => assert.equal(recommendations.matchesPreferences({ ...place, region: 'Costa', nivel_aventura: 'Tranqui' }, { ...preferences, region_preferida: 'Todas', nivel_aventura: 'Todas' }), true));
check('interest categories recognize accented words', () => assert.equal(recommendations.matchesInterests({ ...place, etiquetas: ['Cocina de fogón'] }, { ...preferences, pasiones: ['Gastronomía'] }), true));
check('fauna interest recognizes biodiversity', () => assert.equal(recommendations.matchesInterests({ ...place, etiquetas: ['Biodiversidad'] }, { ...preferences, pasiones: ['Fauna Marina'] }), true));
check('compatible experience ranks first without mutating source', () => {
  const original = [{ ...place, id: 'expensive', precio_base_pp: 100 }, { ...place, id: 'long', duracion_dias: 4 }, place];
  assert.equal(recommendations.rankPlaces(original, preferences)[0].id, place.id);
  assert.equal(original[0].id, 'expensive');
});
check('equal scores preserve catalogue order', () => same(recommendations.rankPlaces([{ ...place, id: 'a' }, { ...place, id: 'b' }], preferences).map(item => item.id), ['a', 'b']));
check('actual published catalogue validates', () => assert.equal(storage.isPlaceArray(data.INITIAL_PLACES), true));
check('preferences round trip', () => {
  storage.writeStoredValue('preferences', preferences);
  same(storage.readStoredValue('preferences', {}, storage.isPreferences), preferences);
});
for (const [label, raw] of [
  ['broken JSON', '{oops'], ['wrong version', JSON.stringify({ version: 999, data: preferences })],
  ['wrong shape', JSON.stringify({ version: 1, data: { ...preferences, pasiones: null } })],
  ['fractional group', JSON.stringify({ version: 1, data: { ...preferences, cantidad_personas: 1.5 } })],
  ['negative budget', JSON.stringify({ version: 1, data: { ...preferences, presupuesto_max: -1 } })],
  ['oversized payload', 'x'.repeat(2000001)],
]) check(`storage fallback: ${label}`, () => {
  helpers.entries.set(prefix + 'preferences', raw);
  assert.equal(storage.readStoredValue('preferences', 'fallback', storage.isPreferences), 'fallback');
});
check('invalid nested place is rejected', () => assert.equal(storage.isPlaceArray([{ ...place, sellos: null }]), false));
check('NaN and infinite numeric fields are rejected', () => {
  assert.equal(storage.isPreferences({ ...preferences, presupuesto_max: NaN }), false);
  assert.equal(storage.isPlace({ ...place, precio_base_pp: Infinity }), false);
});
check('private mode storage errors do not escape', () => {
  const original = helpers.browser.localStorage;
  helpers.browser.localStorage = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); } };
  assert.equal(storage.readStoredValue('role', 'turista', storage.isRole), 'turista');
  assert.doesNotThrow(() => storage.writeStoredValue('role', 'local'));
  helpers.browser.localStorage = original;
});

const app = harness();
let context = app.render();
check('new traveler history and settlements are empty', () => { assert.equal(context.reservations.length, 0); assert.equal(context.settlements.length, 0); });
check('tourist cannot enter host tab or publish', () => {
  context.setActiveTab('host'); context.publishExperience({ ...place, id: 'unauthorized' });
  context = app.render(); assert.equal(context.activeTab, 'feed'); assert.equal(context.places.some(item => item.id === 'unauthorized'), false);
});
context.setOnboarding(preferences); context.toggleSavedPlace(place.id); context = app.render();
check('preferences and favorites persist across provider reload', () => {
  const reloaded = harness(new Map(app.entries)).render(); same(reloaded.onboarding, preferences); same(reloaded.savedPlaceIds, [place.id]);
});
const request = await context.createReservationAndPay(context.places[0], '2026-10-22', 2, [{ nombre: 'Taller', precio: 5 }, { nombre: 'Equipo', precio: 3 }], 'transferencia');
context = app.render();
check('same-day Ecuador request works after UTC midnight and extras multiply by group', () => {
  assert.equal(request.precio_total, (context.places[0].precio_base_pp + 8) * 2);
  assert.equal(request.estado, 'pendiente'); assert.equal(request.pagado_en, ''); assert.equal(request.notificacion_whatsapp_enviada, false);
  assert.equal(request.monto_comunidad_90 + request.comision_plataforma_10, request.precio_total);
});
await assert.rejects(context.createReservationAndPay(context.places[0], '2026-10-21', 1, [], 'transferencia'), /fecha válida/); assertions++;
await assert.rejects(context.createReservationAndPay(context.places[0], '2026-11-31', 1, [], 'transferencia'), /fecha válida/); assertions++;
check('tourist cannot confirm or fabricate paid status', () => {
  context.setReservationStatus(request.id, 'confirmado'); context.setReservationStatus(request.id, 'pagado'); context = app.render();
  assert.equal(context.reservations[0].estado, 'pendiente');
});
context.setSelectedPlace(context.places[0]); context.setBookingPlace(context.places[0]); context.setRole('local'); context = app.render();
check('role change clears traveler overlays and selects host', () => { assert.equal(context.activeTab, 'host'); assert.equal(context.selectedPlace, null); assert.equal(context.bookingPlace, null); });
check('host role persists across provider reload', () => assert.equal(harness(new Map(app.entries)).render().role, 'local'));
check('pending QR and partial codes cannot be redeemed', () => { assert.equal(context.validateVoucherQr(request.codigo_voucher).success, false); assert.equal(context.validateVoucherQr(request.codigo_voucher.slice(0, 5)).success, false); });
context.setCurrentBusinessId('place-quilotoa'); context = app.render();
check('other business cannot change reservation', () => { context.setReservationStatus(request.id, 'confirmado'); context = app.render(); assert.equal(context.reservations[0].estado, 'pendiente'); });
context.setCurrentBusinessId('place-saraguro'); context = app.render(); context.setReservationStatus(request.id, 'confirmado'); context = app.render();
check('own business confirms without a payment claim', () => { assert.equal(context.reservations[0].estado, 'confirmado'); assert.equal(context.settlements.length, 0); assert.equal(context.reservations[0].pagado_en, ''); });
const published = { ...place, id: 'new-business', slug: 'new-business', imagenes: ['/images/coast.jpg'] };
context.publishExperience(published); context = app.render();
check('publish selects new experience and persists its photo', () => { assert.equal(context.currentBusinessId, published.id); assert.equal(context.places[0].imagenes[0], '/images/coast.jpg'); });
context.updateExperience(published.id, { precio_base_pp: 32, imagenes: ['/images/forest.jpg'] }); context = app.render();
check('business updates price and photo', () => { assert.equal(context.places[0].precio_base_pp, 32); assert.equal(context.places[0].imagenes[0], '/images/forest.jpg'); });
context.setRole('turista'); context = app.render(); context.cancelReservation(request.id); context = app.render();
check('traveler can cancel confirmed request', () => assert.equal(context.reservations.find(item => item.id === request.id).estado, 'cancelado'));
const capacityPlace = context.places.find(item => item.id === 'place-saraguro');
const fullRequest = await context.createReservationAndPay(capacityPlace, '2026-11-01', capacityPlace.cupos_disponibles_dia, [], 'transferencia'); context = app.render();
await assert.rejects(context.createReservationAndPay(capacityPlace, '2026-11-01', 1, [], 'transferencia'), /suficientes cupos/); assertions++;
context.cancelReservation(fullRequest.id); context = app.render();
const reopened = await context.createReservationAndPay(capacityPlace, '2026-11-01', 1, [], 'transferencia'); context = app.render();
check('cancelled requests free date capacity', () => assert.equal(reopened.estado, 'pendiente'));

const paid = { ...request, id: 'paid-example', estado: 'pagado', pagado_en: fixedTime, qr_data: `CHULLA-VIDA|${request.codigo_voucher}|PAID|place-saraguro|2|2026-10-22` };
const qrEntries = new Map([[prefix + 'role', JSON.stringify({ version: 1, data: 'local' })], [prefix + 'reservations', JSON.stringify({ version: 1, data: [paid] })]]);
const qr = harness(qrEntries); let qrContext = qr.render();
check('modified or partial QR cannot pass', () => { assert.equal(qrContext.validateVoucherQr(paid.codigo_voucher.slice(0, -1)).success, false); assert.equal(qrContext.validateVoucherQr(paid.qr_data.replace('PAID', 'PENDING')).success, false); });
check('paid exact QR can be used once', () => { assert.equal(qrContext.validateVoucherQr(paid.qr_data).success, true); qrContext = qr.render(); assert.equal(qrContext.validateVoucherQr(paid.qr_data).success, false); });

const demoVisit = { ...paid, id: 'demo-arrival', estado: 'confirmado', fecha_tour: '2026-10-22', pagado_en: '', pago_demo: { estado: 'aprobado', referencia: 'DEMO-ARRIVAL-12345678', creado_en: new Date(fixedTime).toISOString() } };
const demoVisitHarness = (overrides = {}) => harness(new Map([[prefix + 'role', JSON.stringify({ version: 1, data: 'local' })], [prefix + 'reservations', JSON.stringify({ version: 1, data: [{ ...demoVisit, ...overrides }] })]]));
const arrivals = demoVisitHarness(); let arrivalContext = arrivals.render();
check('confirmed approved demo arrival validates on its date', () => assert.equal(arrivalContext.validateVoucherQr(demoVisit.codigo_voucher).success, true));
arrivalContext = arrivals.render();
check('demo arrival creates stamp evidence without a real payment', () => { assert.equal(arrivalContext.reservations[0].estado, 'validado_en_sitio'); assert.equal(arrivalContext.reservations[0].validado_en, new Date(fixedTime).toISOString()); assert.equal(arrivalContext.reservations[0].pagado_en, ''); assert.equal(arrivalContext.settlements.length, 0); });
check('demo arrival cannot validate twice', () => assert.equal(arrivalContext.validateVoucherQr(demoVisit.codigo_voucher).success, false));
check('future demo arrival remains withheld', () => assert.equal(demoVisitHarness({ fecha_tour: '2030-01-01' }).render().validateVoucherQr(demoVisit.codigo_voucher).success, false));
check('unconfirmed demo arrival is blocked', () => assert.equal(demoVisitHarness({ estado: 'pendiente' }).render().validateVoucherQr(demoVisit.codigo_voucher).success, false));
check('unpaid demo arrival is blocked', () => assert.equal(demoVisitHarness({ pago_demo: { ...demoVisit.pago_demo, estado: 'pendiente' } }).render().validateVoucherQr(demoVisit.codigo_voucher).success, false));

const payments = harness(); let paymentContext = payments.render();
const paymentPlace = paymentContext.places[0];
check('legacy request has no demo payment and remains readable', () => {
  assert.equal(request.pago_demo, undefined); assert.equal(storage.isReservation(request), true);
});
for (const [label, method, status] of [
  ['unknown payment method', 'efectivo', 'aprobado'], ['null payment method', null, 'pendiente'],
  ['unknown demo status', 'tarjeta', 'pagado'], ['null demo status', 'deuna', null],
]) {
  await assert.rejects(paymentContext.createReservationAndPay(paymentPlace, '2026-11-10', 1, [], method, status), /método de pago|estado del pago/);
  check(`${label} cannot create a request`, () => { paymentContext = payments.render(); assert.equal(paymentContext.reservations.length, 0); });
}
const demoApproved = await paymentContext.createReservationAndPay(paymentPlace, '2026-11-10', 1, [], 'tarjeta', 'aprobado');
paymentContext = payments.render();
check('approved demo is stored atomically without real payment or settlement', () => {
  assert.equal(demoApproved.pago_demo.estado, 'aprobado'); assert.match(demoApproved.pago_demo.referencia, /^DEMO-[A-Z0-9-]+$/);
  assert.equal(demoApproved.pago_demo.creado_en, new Date(fixedTime).toISOString());
  assert.equal(demoApproved.estado, 'pendiente'); assert.equal(demoApproved.pagado_en, ''); assert.equal(paymentContext.settlements.length, 0);
  same(Object.keys(demoApproved.pago_demo).sort(), ['creado_en', 'estado', 'referencia']);
});
check('demo metadata survives reload with no real payment claim', () => {
  const reloaded = harness(new Map(payments.entries)).render(); same(reloaded.reservations[0], demoApproved); assert.equal(reloaded.settlements.length, 0);
});
check('approved demo cannot be completed again', () => assert.equal(paymentContext.completeDemoPayment(demoApproved.id), false));
const demoPending = await paymentContext.createReservationAndPay(paymentPlace, '2026-11-11', 1, [], 'transferencia', 'pendiente');
paymentContext = payments.render(); paymentContext.setRole('local'); paymentContext = payments.render();
check('business cannot approve a traveler demo payment', () => { assert.equal(paymentContext.completeDemoPayment(demoPending.id), false); paymentContext = payments.render(); assert.equal(paymentContext.reservations[0].pago_demo.estado, 'pendiente'); });
paymentContext.setRole('turista'); paymentContext = payments.render(); paymentContext.setActiveVoucher(demoPending); paymentContext = payments.render();
check('traveler completes pending demo once even before rerender', () => {
  assert.equal(paymentContext.completeDemoPayment(demoPending.id), true); assert.equal(paymentContext.completeDemoPayment(demoPending.id), false);
  paymentContext = payments.render();
  assert.equal(paymentContext.reservations[0].pago_demo.estado, 'aprobado'); assert.equal(paymentContext.activeVoucher.pago_demo.estado, 'aprobado');
  assert.equal(paymentContext.reservations[0].estado, 'pendiente'); assert.equal(paymentContext.reservations[0].pagado_en, '');
  assert.equal(paymentContext.reservations[0].pago_demo.referencia, demoPending.pago_demo.referencia);
  assert.equal(paymentContext.reservations[0].pago_demo.creado_en, demoPending.pago_demo.creado_en);
});
check('completed demo approval persists across reload', () => assert.equal(harness(new Map(payments.entries)).render().reservations[0].pago_demo.estado, 'aprobado'));
const canceledDemo = await paymentContext.createReservationAndPay(paymentPlace, '2026-11-12', 1, [], 'deuna', 'pendiente'); paymentContext = payments.render();
check('canceled request cannot complete demo even before rerender', () => {
  paymentContext.cancelReservation(canceledDemo.id); assert.equal(paymentContext.completeDemoPayment(canceledDemo.id), false); paymentContext = payments.render();
  assert.equal(paymentContext.reservations[0].estado, 'cancelado'); assert.equal(paymentContext.reservations[0].pago_demo.estado, 'pendiente');
});
const confirmedDemo = await paymentContext.createReservationAndPay(paymentPlace, '2026-11-13', 1, [], 'transferencia', 'pendiente'); paymentContext = payments.render();
paymentContext.setRole('local'); paymentContext = payments.render(); paymentContext.setCurrentBusinessId(paymentPlace.id); paymentContext = payments.render();
paymentContext.setReservationStatus(confirmedDemo.id, 'confirmado'); paymentContext = payments.render(); paymentContext.setRole('turista'); paymentContext = payments.render();
check('confirmed request can complete demo without changing business status', () => {
  assert.equal(paymentContext.completeDemoPayment(confirmedDemo.id), true); paymentContext = payments.render();
  assert.equal(paymentContext.reservations[0].estado, 'confirmado'); assert.equal(paymentContext.reservations[0].pago_demo.estado, 'aprobado');
});
for (const [label, change] of [
  ['other traveler', { turista_email: 'otra-persona@example.test' }], ['completed experience', { estado: 'completado' }],
  ['legacy request without demo', { pago_demo: undefined }],
]) check(`cannot complete ${label}`, () => {
  const testReservation = { ...demoPending, ...change };
  const isolated = harness(new Map([[prefix + 'reservations', JSON.stringify({ version: 1, data: [testReservation] })]]));
  assert.equal(isolated.render().completeDemoPayment(testReservation.id), false);
});
for (const [label, metadata] of [
  ['null metadata', null], ['unknown state', { ...demoPending.pago_demo, estado: 'pagado' }],
  ['missing reference', { estado: 'pendiente', creado_en: demoPending.pago_demo.creado_en }],
  ['non-demo reference', { ...demoPending.pago_demo, referencia: 'REAL-12345' }],
  ['invalid creation time', { ...demoPending.pago_demo, creado_en: 'not-a-date' }],
  ['non-canonical creation time', { ...demoPending.pago_demo, creado_en: '2026-10-22T21:30:00-05:00' }],
  ['unexpected sensitive field', { ...demoPending.pago_demo, numero_tarjeta: 'test-only' }],
]) check(`rejects malformed stored payment: ${label}`, () => {
  const malformed = { ...demoPending, pago_demo: metadata }; assert.equal(storage.isReservation(malformed), false);
  helpers.entries.set(prefix + 'reservations', JSON.stringify({ version: 1, data: [malformed] }));
  assert.equal(storage.readStoredValue('reservations', 'fallback', storage.isReservationArray), 'fallback');
});
check('stored demo cannot claim real paid status or timestamp', () => {
  assert.equal(storage.isReservation({ ...demoApproved, estado: 'pagado' }), false);
  assert.equal(storage.isReservation({ ...demoApproved, pagado_en: demoApproved.pago_demo.creado_en }), false);
});
check('all demo flows leave real settlements and paid timestamps empty', () => {
  assert.equal(paymentContext.settlements.length, 0); assert.equal(paymentContext.reservations.every(item => item.pagado_en === ''), true);
  assert.equal(paymentContext.reservations.some(item => ['pagado', 'liquidado_al_local'].includes(item.estado)), false);
});

console.log(`Passed ${assertions} domain assertions: recommendations, storage validation, role guards, requests, Ecuador dates, capacity, publication, exact QR redemption and local demo payments.`);
