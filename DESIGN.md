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

- **Logo:** AnimatedLogo clips the unchanged supplied raster into four landscape pieces, sun and wordmark, registered in SVG. The pieces assemble individually; the actual sun rotates. Preserve the original artwork, proportions and seam registration.
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
