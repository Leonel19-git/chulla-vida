# Reservas, compras, billetera y Mi viaje

Actualizado: 14 de noviembre de 2026. Complementa `PAGOS_ECUADOR.md`.

## Qué es real y qué es prueba

| Pieza | Estado |
| --- | --- |
| Checkout en pasos desde tarjeta, ficha y Mi viaje | Funciona de punta a punta en **modo prueba sin cobro** |
| Cobro con tarjeta | Requiere PayPhone configurado en el servidor y una oferta habilitada; hoy ninguna lo está |
| Reservas conectadas (solicitud, confirmación del anfitrión, pago verificado) | Implementadas en «Reservas y pagos»; requieren Supabase y sesión |
| Billetera de viaje | Funciona en el navegador; lee reservas conectadas cuando hay Supabase y sesión |
| Validación de cédula/pasaporte | Real, de **formato**. No verifica identidad |
| Documento del comprador en servidor | Migración y pruebas listas; sin Supabase alojado todavía |

## Billetera de viaje (`src/features/wallet/`)

No custodial: **no hay saldo, recargas, depósitos ni transferencias**. Muestra compras de prueba, solicitudes de cotización, comprobantes descargables, total de prueba por viaje y el estado de cada movimiento. Con Supabase y sesión, añade las reservas propias (`bookings`) con su estado; solo `paid`/`completed` cuentan como «pago verificado por el servidor».

- Persistencia local versionada en `chullavida:wallet:v1` (`{ version: 1, records }`, máximo 200). Lo que no supera la validación se descarta al leer. Si el navegador bloquea el almacenamiento, se usa memoria de la sesión y se avisa.
- Evento `cv3:wallet-updated` tras cada cambio: Mi viaje, los botones de compra y la billetera abierta se actualizan solos.
- `WalletHost` abre la billetera con el evento `cv3:wallet`. `BookingsPanel` («Mis solicitudes y reservas», evento `cv3:bookings`) es la misma billetera filtrable por `experienceId`.
- Un pago de prueba nunca se convierte en un pago real ni se sube a Supabase.

## Mi viaje + billetera (`PlannerDialog`)

Cada parada muestra su estado: **Sin comprar / Compra de prueba / Pagada / Solicitud**, con «Comprar esta parada» (o «Pedir cotización» si no tiene precio comparable). «Comprar todo mi viaje» abre un solo checkout con las paradas comprables (fecha y personas del borrador) y guarda las demás como solicitud; todas comparten `batchId` y código de comprobante. El total separa **ya comprado**, **por comprar** (mínimo de cada rango en USD) y **sin precio comparable**. «Ver en mi billetera» abre la billetera agrupada por viaje («Mi viaje desde …»).

## Puntos de integración para otros frentes

- Catálogo/ficha: montar `<BuyButton experience={…} variant="card" />` en tarjetas y `variant="detail"` en la ficha. Es autónomo (abre su checkout y la billetera) y detiene la propagación del clic para no abrir la tarjeta.
- Workspace: para un acceso global, añadir `<WalletHost onOpenExperience={…} />` una vez y un botón que emita `cv3:wallet`; montar `BookingsPanel` en `cv3:bookings` si se usa.
- Cuenta: cuando haya Supabase, llamar `rpc('set_buyer_document', { p_type, p_value })` con la cédula del titular; no guardar el número en el cliente.

## Pruebas

`npx vitest run tests/unit/cedula.test.ts tests/unit/cedula-rls.test.ts tests/unit/payments-purchase.test.ts tests/unit/payments-checkout.test.tsx tests/unit/itinerary-wallet.test.tsx`: cédula (cédulas generadas por el algoritmo y errores típicos), RLS del documento, checkout completo, rechazo y reintento, EUR → cotización, rango y tarifa por grupo, compra desde Mi viaje reflejada en la billetera, «Comprar todo», rótulo obligatorio del comprobante y ausencia de la cédula completa en `localStorage`/`sessionStorage`.
