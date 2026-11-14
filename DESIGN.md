---
name: CHULLA VIDA
description: Turismo ecuatoriano con paisaje, color de marca, iconos claros y una voz joven ecuatoriana.
colors:
  ink: "#28372d"
  navy: "#28372d"
  teal: "#304a36"
  teal-dark: "#233d2a"
  cream: "#f3efe5"
  paper: "#fffdf8"
  muted: "#5e6658"
  line: "#ddd8cb"
  andes-clay: "#995137"
  andes-clay-dark: "#7f402d"
  andes-maize: "#bf903d"
  andes-maize-ink: "#795c25"
  andes-sage: "#e9eddf"
  andes-linen: "#eee8db"
  andes-clay-wash: "#f3e7df"
  brand-navy: "#103452"
  brand-turquoise: "#079da5"
  brand-maize: "#efb22c"
  brand-red: "#c93143"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "62px"
    fontWeight: 450
    lineHeight: 1.04
    letterSpacing: "-.025em"
  headline:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "42px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-.03em"
  welcome:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(35px, 3.5vw, 49px)"
    fontWeight: 500
    lineHeight: 1.12
    letterSpacing: "-.025em"
  music-heading:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(28px, 2.1vw, 34px)"
    lineHeight: 1.1
  music-title:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "19px"
    fontWeight: 650
    lineHeight: 1.25
  title:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "25px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-.04em"
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "13px"
    lineHeight: 1.8
  label:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 650
rounded:
  photograph: "19px"
  compact-control: "6px"
  control: "11px"
  navigation: "11px"
  card: "19px"
  choice: "15px"
  dialog: "22px"
spacing:
  small: "8px"
  medium: "12px"
  content: "17px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "11px 17px"
  button-primary-hover:
    backgroundColor: "{colors.teal-dark}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 17px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
  experience-card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
---

# Design System: CHULLA VIDA

## Direction and voice

**Páramo, barro y maíz, con el color del logo.** Warm paper and natural landscape photography form the base. Original-logo navy gives headings definition; turquoise supports icons and routes, maize highlights invitations and red marks saved favorites. Páramo green and clay still connect planning and business tools. Newsreader supplies editorial headings and Plus Jakarta Sans keeps operational content clear.

Use short Ecuadorian Spanish: “panas”, “planazo”, “de ley” and “ve pilas” in context. Cards show place, photograph, price and icon facts rather than description paragraphs. Complete information remains available through tabs and disclosures. The audience is wambras; the product is CHULLA VIDA.

## Palette and hierarchy

The frontmatter records the current materials. Base tokens are finalized in finish-theme.css, which also adds the four brand colors; youth-ui.css supplies compact destination detail. Legacy navy and teal names remain green compatibility tokens, while brand-navy and brand-turquoise identify the original-logo accents. Use explicit active, selected and status text alongside color.

Hero headings reach 62px; section headings use 35px Newsreader. The welcome uses 35–49px serif, 35px on mobile and 32px on narrow screens. Functional card titles are 18px (20px on narrow mobile); ordinary copy and controls generally use 12–14px. Avoid canonizing residual tiny ancillary labels as a typography scale. Keep body text readable and move detail behind user-controlled disclosures rather than shrinking it.

## Layout and surfaces

Desktop retains a fixed left rail, 82px top bar and centered workspace. Catalog cards form three columns, two below 960px and one below 700px. Mobile uses a drawer and bottom navigation. Region filters wrap separately from the filter action; the narrowest layout uses a two-column region grid. Shared controls use 10–11px corners, experience cards 19px, and the main hero/dialogs 22px. Borders and pale surfaces provide structure; shadows stay soft.

The intro divides a real landscape selector and logo stage into two columns. Sierra, Costa and Amazonía buttons update the photograph. Below 700px the scene becomes a shallow strip above the logo and manual-entry controls. Logo size responds to viewport height; short screens retain entry and skip actions.

Checkout pairs its form with a 243px summary; below 700px the summary moves above the form and the action row remains visible while scrolling. The offline route uses a full-width schematic, stop selector and expandable practical details; below 600px its actions stack.

## Components and interaction

- **Logo:** AnimatedLogo clips the unchanged supplied raster into four landscape pieces, sun and wordmark, registered in SVG. The pieces assemble individually; the actual sun rotates. Preserve the original artwork, proportions and seam registration. The supplied raster misspells its tagline («CONSCISTENTE»); AnimatedLogo redraws that single line as live text, «TURISMO SOSTENIBLE Y CONSCIENTE», over a paper band. The PNG file itself stays untouched.
- **Cards:** photograph, province/locality, title, duration/adventure/group icons with text, price and “Conocer”. No description paragraph. Navy headings, turquoise facts and a red saved heart express brand color through useful states.
- **Details:** tabs “Lo esencial”, “Incluye” and “Ve pilas” keep context concise; story, expenses and FAQs expand on request. Keep reference-image and demo-price disclosure.
- **Planner:** eight steps retain checked choices, tabular totals, bounded counters and a desktop recap. Origin offers 28 Ecuadorian cities plus custom input. Group budget starts at $20, with $20/$50/$150/$500 presets in a mobile two-column grid. The catalog has 28 destinations; added ideas carry indicative prices and no fabricated verification or contact details.
- **Offline route:** keyboard-operable SVG nodes select up to three stops. Origin, days, group cost, remaining budget, inclusions and advice remain available in a validated browser snapshot. The network indicator reflects navigator connectivity; the switch previews an offline state. The self-contained downloaded HTML opens from disk without network dependencies. The map is schematic, without GPS or road calculations. The web app has no service worker or guaranteed offline first startup.
- **Payments:** three demo steps cover date/group, method and review. Card uses fixed dummy details and an approval/rejection choice; transfer saves a pending fictitious reference; Deuna QR contains only CHULLA-VIDA:DEMO. Processing, retry and receipt clearly describe simulation. Payment-demo state and business confirmation stay separate in traveler and business views.
- **Memberships:** weekly $2.99 / 7 days, monthly $4.99 / calendar month and annual $49.99 / calendar year. Show period, price and explicit demo activation together. Any active plan unlocks offline routes and Comunidad wambra; only annual unlocks the premium passport. Cancellation retains access until expiry; no real renewal or automatic charge occurs. Expired plans return to the plan prompt. The desktop plan comparison stacks on mobile with wrapping labels and reachable actions. These are browser-local controls, not server-enforced entitlements.
- **Passport:** a free basic passport displays regional stamps for the traveler's visits with a business-recorded arrival. One verified stamp per destination; newly added stamps receive a short stamp impression animation. Test stamps remain separately labeled, editable demonstration state and never assert a verified visit or reward. Annual-active presentation adds premium material and decoration. Preserve stamps when membership expires; remove premium access, not travel history. Motion reduction retains content without impact animation.
- **Business wallet:** “Cobros y retiros” belongs to the selected demo business. Explain traveler payment → arrival validation → business withdrawal through icons and text. Show gross, 10% platform commission, 90% net, retained funds, available funds and requested demo withdrawals with tabular currency. Compute per charge in cents, retaining the exact remainder for the business. Only approved demo payments on accepted requests enter the ledger; pending/cancelled/duplicate payments contribute nothing. Release retained funds after the business validates a confirmed approved-demo visit on or after its Ecuador visit date. The code form uses the full voucher code or exact QR payload, without a simulated scanner claim.
- **Withdrawal:** require a focused native confirmation dialog showing the available amount, fixed fictional account and explicit no-transfer notice. No banking fields, invented fee or minimum threshold. Persist scoped visit allocations once in separate demo withdrawal history. A later cancellation or changed visit produces a review notice, without a negative balance or invented refund. Empty, disabled, stale-balance and storage-error states must remain readable. On mobile the available amount and action lead; movement references wrap instead of widening the page.
- **Music/socials:** the supplied Folklore ecuatoriano playlist is primary, with user-initiated Spotify playback. Instagram, Facebook and TikTok remain simulated buttons with explicit feedback.

## Motion and accessibility

Landscape pieces arrive over 1.55s, the sun over 1.6s and the wordmark over .85s after a .72s delay. The intro sun turns over 24s after a 1.65s delay; compact-logo rotation takes 20s and moves only on hover or keyboard focus. Pause and repeat controls are explicit. Motion pauses outside the viewport or when the page is hidden. Reduced motion is static by default; only an explicit “Reproducir animación” or replay action opts into logo movement.

The welcome appears on each page load and stays until “¡De ley, vamos!” (accessible name “Entrar a CHULLA VIDA”), skip or Escape. Exit fades over 260ms, without a delay for reduced motion. Preserve native dialog focus, scrolling and restoration. The whole image does not spin; the registered sun piece does.

Checkout step entry is 240ms, success stamp 460ms and check drawing 500ms after 120ms. Named local processing phases accompany the spinner and progress track; reduced motion removes effects while preserving text. Route-stop entry is 240ms and removed for reduced motion. Keep visible focus and text equivalents for every informational icon and status.

Offline motion follows selected stops and their regional landscape, with map/node feedback and an explicit simulation of no connection. Do not use animation or an offline badge to imply live GPS, real network access, or that the entire app starts without a connection. The HTML already downloaded remains usable after membership expires.

## Guardrails

Preserve the supplied logo and real image credits. Keep demo prices, simulated payment/subscription/withdrawal/social states and offline limitations explicit. Do not imply real banking, live navigation, verified new businesses, external messages or shared reservations. Local profile and plan controls are not authentication or payment security. Vercel project `chulla-vida` is linked; publication of this update remains pending verification and does not add a backend. Add color through hierarchy and state; retain calm backgrounds and readable contrast.

## Regional identity and languages

RegionalSpotlight uses four illustrated, actionable landscapes instead of text-only region filters. Sierra has terracotta terraces and navy peaks; Costa has turquoise waves and sand; Amazonía has canopy greens and a winding river; Galápagos has blue ocean, volcanic islands and a turtle. The same trusted static SVG artwork is reused in RegionalRouteMap and the standalone HTML. Active stops select their actual regional scene; the legend links to stops present in the itinerary. Do not imply cartographic accuracy.

The regional catalog palette is `#a44932`, `#006e82`, `#28623d`, `#244db0` against warm paper. The yellow/navy/red bands on the hero and logo rail intentionally reference Ecuador's flag in response to the user's request; they are identity details, not status indicators. They are deliberate exceptions to the detector's stripe warning. State also has text, check marks and pressed semantics.

LanguageSelector is visible in the intro and header. Preserve native language names and stable Spanish domain values while translating labels; data-region attributes remain untranslated. Long labels wrap, and intermediate-width headers condense business actions. Below 380px the brand wraps onto two lines so it does not collide with language selection. Both Kichwa choices now change visible UI through a shared editorial draft of 644 phrases, including navigation, planner, offline route, memberships, passport and wallet. Do not describe that common draft as two regionally validated dialects. Their unified-draft/review notice lives in the intro's content area and below the header selector, never over region buttons. Remaining long checkout/publication phrases fall back to source Spanish; local catalog prose, proper names and user content also retain their source. See src/i18n/README.md for exact scope and primary sources.

### Pitch refresh, 23 October 2026
The current supplied logo is public/chulla-vida-logo.png, reused untouched with registered landscape clips and a wordmark boundary that preserves its taller lettering. The hero reads «Ecuador te espera. Sal a vivirlo.» Music offers the user-supplied Sierra/folklore, Costa and Oriente playlists, with a matching landscape, translated regional labels and no autoplay. Each selection keeps the correct Spotify link and embed. The five-slide pitch follows the same navy, turquoise, maize and red palette.

### V3 additions, 12 November 2026

The public catalog now opens with «Ecuador se vive. Arma tu próxima historia.» and 33 source-backed records. The original demo remains available through an explicit link. Existing logo and regional illustrations are retained; Galápagos cards use the schematic island illustration rather than mainland coast photography.

New operational views use 16px inputs and body copy, 14px secondary explanations, 18–22px local headings, and Newsreader editorial headings. Fonts are self-hosted under the existing family names. These additions intentionally increase the old 11–13px operational text sizes. Warning materials use warm sand and brown; normal actions retain páramo green, with navy on the MIJIN launcher. Color, radius and type additions were flagged as advisory differences by the mechanical detector; visual verification remains pending.

New surfaces: source-preserving experience detail, budget ideas with unknown costs, Cultura Viva with unconfirmed editions, account/business verification pending configuration, selected downloads, local FAQ/voice/weather controls and legal drafts. External Spotify embeds mount only after media consent and opening the player; revocation removes them.

### Connected payments continuation, 13 November 2026

This narrow extension inherits the existing dialog, account and task flows. Earlier payment, wallet and withdrawal descriptions remain the historical local demo. Source evidence: `src/features/payments/payments.css`, `PaymentsPanel.tsx`, `RefundReview.tsx`, `api.ts`, `reference.ts` and `src/features/workspace/WorkspaceVivo.tsx`. It establishes no replacement visual world or new palette.

The source retains warm paper, navy headings, páramo-green actions and sage availability notices. Newsreader supplies the panel heading; Plus Jakarta Sans remains the operational face. Continue V3's readable operational hierarchy: body and fields (16px), secondary explanations and action labels (14px), local headings (19px), and tabular amounts (22px). These are surface roles, not replacements for the incumbent discovery scale.

**The Verified State Rule.** Show loading, failed consultation and empty results as distinct states. Availability is unknown after a failed configuration request; keep payment disabled until checked. Text describes sandbox, live, pending and review states alongside color. A return reference alone never supplies a success state.

**The Review Before Departure Rule.** Keep the date → host confirmation → PayPhone sequence visible, with reservation amount, environment and cancellation conditions before leaving the application. The local practice action remains a separately labeled section. Refund review is a request with persistent status, not a successful transfer animation.

Live review also includes the published terms version, dates and full text behind a native disclosure. An explicit checkbox and acceptance action precede payment; only server-confirmed acceptance enables the payment action. Loading, missing, changed and failed terms remain readable blocking states. This disclosure extends the existing form language without introducing a new display style.

The panel uses a centered reading column (maximum 860px), thin separators and the incumbent control language. Long references wrap; amounts use tabular numerals. Controls retain minimum heights (44px buttons, 46px fields) and a visible turquoise focus outline (3px, offset 3px). At the source breakpoint (560px), steps stack and actions fill the available row; the surrounding native dialog retains its existing scrolling and focus behavior. No new shadow or motion vocabulary was added.

Recorded from source only: desktop/mobile rendering and responsive inspection remain unverified because browser access was unavailable. The detector's operational-size advisories are consistent with the existing V3 additions and do not constitute visual approval. Not canonized: residual tiny legacy labels and any unrendered claim of visual correctness; neither earns a future system rule.

## Ecuador Vivo 2026 (13-11-2026)

**Dirección.** La paleta del logo 2026 manda: navy `#012960`, rojo `#c61534`, maíz `#fed65a`, menta `#4cc69f`, petróleo `#1f575a` y papel cálido `#fbf6ea`. Los tokens viven en `src/index.css` (`--cv-*`): colores, color de texto y lavado por región (`--cv-sierra`, `--cv-costa`, `--cv-amazonia`, `--cv-galapagos` y sus `-wash`, todos AA sobre papel), sombras `--cv-shadow-1..3`, radios `--cv-r-s/m/l/xl/pill`, espacios `--cv-space-1..8`, tipos `--cv-text-*` y movimiento `--cv-ease`, `--cv-dur-1..3`. Un elemento con `data-region-tone="sierra|costa|amazonia|galapagos"` expone `--tone` y `--tone-wash` a sus hijos.

**Textil.** `--cv-textile` es una banda propia de rombos y trazos (navy, maíz, rojo, menta), sin reproducir diseños de una comunidad concreta. Se usa solo en bordes: barra lateral, pie y la banda de Cultura Viva (`.cv-textile-edge`). La barra de herramientas lleva una línea de cuatro colores.

**Portada como historia.** Héroe con foto real y las cuatro regiones navegables dentro (al pasar o enfocar una región cambia la foto: foto real grande de una ficha si existe, si no la foto regional con crédito, si no la ilustración propia), «Así funciona» en cuatro pasos ilustrados (es una secuencia real, por eso lleva número), números del catálogo con barras por región, una ficha para empezar en cada región, Amazonía, catálogo, Cultura Viva con próximas fiestas reales del módulo `culture` (fechada u orientativa, dicho así), Pasaporte Guambra, «Viaja con confianza», la sección de protección de datos (`DataProtectionSection`, cargada con respaldo) y el pie en columnas. Las secciones bajo el pliegue están en `src/features/catalog/HomeStory.tsx` y cargan bajo demanda.

**Tarjetas y ficha.** Banda superior del color de la región, zoom suave de la foto y elevación al pasar. Las fotos por ficha usan `srcset` 640/1280 (`/images/places/<id>-640.webp` y `-1280.webp`, o `srcLarge` del registro) y muestran su crédito: `title` en la tarjeta, pie visible en la ficha. Sin foto real, ilustración original rotulada como tal. `BuyButton` se monta en cada tarjeta y en la ficha; el precio siempre se rotula como referencial propuesto y la compra como prueba sin cobro mientras los pagos no estén activos.

**Barra de herramientas.** MIJIN, Mi viaje, Mi billetera y Reservas y pagos a la vista; Sin señal, Mis avisos, Anfitriones y Cuenta en el menú «Más» (teclado: flechas, Inicio/Fin, Escape devuelve el foco). En móvil, cinco botones de icono con etiqueta corta y nombre accesible completo; objetivos de 52 px.

**Movimiento.** Solo `transform` y `opacity`. Entrada escalonada al hacer scroll con `useReveal` (`src/components/common/motion.tsx`; si no hay IntersectionObserver o se pide menos movimiento, todo se ve desde el inicio), contadores (`CountUp`, el valor real siempre está para lectores de pantalla), barras que crecen, transición al cambiar de región, pulso sutil en MIJIN, golpe de sello en el pasaporte, corazón que late al guardar, skeletons con brillo y scroll suave. Todo se apaga con `prefers-reduced-motion`.

**Integración con otros frentes.** Paneles que quizá no existan todavía se cargan con `optionalLazy(import.meta.glob('<ruta>'), '<export>', Respaldo)` (`src/features/workspace/optionalModule.tsx`): si el archivo falta, el build sigue y se ve un respaldo honesto. Eventos nuevos: `cv3:wallet` (billetera) y `cv3:privacy-rights` (ejercicio de derechos). PDF legales enlazados en el pie: `/legal/aviso-proteccion-datos-chulla-vida.pdf` y `/legal/formulario-derechos-datos-chulla-vida.pdf`.
