#!/usr/bin/env python3
"""Fotos reales por ficha del catálogo, tomadas de Wikimedia Commons con licencia libre.

Uso (ejecutar siempre con `python -I` desde la raíz del repositorio):

  python -I scripts/fetch-place-images.py search  [--out <ruta.json>]  # candidatos para revisar a mano
  python -I scripts/fetch-place-images.py download                    # descarga SELECTIONS y escribe el registro
  python -I scripts/fetch-place-images.py outputs                     # sin red: regenera place-photos.ts y CREDITS.md
  node scripts/build-catalog-seed.mjs                                 # luego: lleva las fotos amazónicas a data.json

Reglas:
- Solo se aceptan Public domain, CC0, CC BY y CC BY-SA (cualquier versión).
- La elección de cada foto es manual (SELECTIONS) tras revisar título, descripción y categorías:
  si no hay una foto fiable del lugar concreto, la ficha se queda sin foto (mejor ilustración que foto falsa).
- Se guarda <id>-640.webp y <id>-1280.webp (recorte 16:10 centrado, calidad 78) en public/images/places/
  y el registro de autoría y licencia en scripts/place-images.json.
"""
from __future__ import annotations

import html
import io
import json
import re
import sys
import time
from datetime import date
from pathlib import Path

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / 'public' / 'images' / 'places'
REGISTRY = ROOT / 'scripts' / 'place-images.json'
API = 'https://commons.wikimedia.org/w/api.php'
HEADERS = {'User-Agent': 'ChullaVidaCatalog/1.0 (educational project)'}
ALLOWED = re.compile(r'^(public domain|pd|cc0|cc[- ]by(-sa)?( \d(\.\d)?)?( [a-z]{2,3})?)$', re.I)
RATIO = 16 / 10
LF = '\n'  # el repositorio usa finales de línea LF también en Windows
WIDTHS = (640, 1280)
MAX_BYTES = {640: 140_000, 1280: 380_000}

# Búsquedas para revisar candidatos (fase `search`).
QUERIES: dict[str, list[str]] = {
    'gen-01-saraguro-ancestral': ['Saraguro Ecuador', 'Saraguro Loja plaza'],
    'gen-02-quilotoa-shalala': ['Quilotoa laguna', 'Quilotoa crater lake'],
    'gen-03-yunguilla': ['Yunguilla Calacali', 'Yunguilla Pichincha'],
    'gen-04-salasaca-viva': ['Salasaca Tungurahua', 'Salasaca'],
    'gen-05-oyacachi': ['Oyacachi', 'Oyacachi Napo'],
    'gen-06-valle-de-intag': ['Intag valley', 'Nangulvi', 'Intag Cotacachi'],
    'gen-07-banos-de-agua-santa': ['Pailon del Diablo', 'Baños de Agua Santa'],
    'gen-08-cuenca': ['Cuenca Ecuador catedral Inmaculada', 'Cuenca Ecuador Tomebamba'],
    'gen-09-parque-nacional-cotopaxi': ['Cotopaxi volcano Limpiopungo', 'Cotopaxi volcano'],
    'gen-10-otavalo': ['Plaza de los Ponchos Otavalo', 'Otavalo market'],
    'gen-11-quito': ['Quito centro historico Plaza Grande', 'Basilica del Voto Nacional Quito'],
    'gen-12-loja': ['Loja Ecuador puerta de la ciudad', 'Loja Ecuador city'],
    'gen-13-riobamba': ['Riobamba catedral', 'Riobamba Chimborazo city'],
    'gen-14-mindo': ['Mindo Ecuador cascada', 'Mindo cloud forest'],
    'costa-01-raices-de-manabi': ['Agua Blanca Machalilla laguna'],
    'costa-02-guayaquil-vivo': ['Malecon 2000 Guayaquil', 'Hemiciclo de la Rotonda Guayaquil'],
    'costa-03-pacifico-activo': ['La Chocolatera Salinas', 'Salinas Ecuador playa'],
    'costa-04-sabores-de-manta': ['Playa El Murcielago Manta', 'Manta Ecuador playa'],
    'costa-05-aventura-marina': ['Isla Salango', 'Salango Manabi'],
    'costa-06-expedicion-natural': ['Isla de la Plata Ecuador', 'Isla de la Plata Machalilla'],
    'costa-07-ola-y-manglar': ['Mompiche playa', 'Mompiche'],
    'gal-01-bartolome-bahia-sullivan': ['Pinnacle Rock Bartolome', 'Bartolome Island Galapagos'],
    'gal-02-seymour-norte-las-bachas': ['North Seymour Island', 'Las Bachas Santa Cruz'],
    'gal-03-plaza-sur-punta-carrion': ['South Plaza Island Galapagos', 'Plaza Sur Galapagos'],
    'gal-04-kicker-rock-tour-360': ['Kicker Rock', 'Leon Dormido San Cristobal'],
    'gal-05-san-cristobal-terrestre': ['El Junco lagoon San Cristobal', 'Puerto Chino San Cristobal'],
    'gal-06-los-tuneles-cabo-rosa': ['Los Tuneles Isabela', 'Cabo Rosa Isabela'],
    'gal-07-sierra-negra-volcan-chico': ['Sierra Negra caldera Isabela', 'Volcan Chico Isabela'],
    'gal-08-tintoreras-concha-perla': ['Las Tintoreras Isabela', 'Concha de Perla Isabela'],
    'gal-09-isabela-4-dias': ['Puerto Villamil beach', 'Puerto Villamil Isabela'],
    'gal-10-galapagos-origins-5-dias': ['Tortuga Bay Santa Cruz', 'Tortuga Bay Galapagos'],
    'gal-11-plan-economico-5-dias': ['Puerto Ayora harbour', 'Puerto Ayora Santa Cruz'],
    'gal-12-plan-normal-5-dias': ['Charles Darwin Research Station', 'Estacion Cientifica Charles Darwin'],
    'amz-01-reserva-cuyabeno': ['Cuyabeno', 'Laguna Grande Cuyabeno'],
    'amz-02-laguna-de-limoncocha': ['Limoncocha', 'Laguna de Limoncocha'],
    'amz-03-laguna-panacocha': ['Pañacocha', 'Panacocha'],
    'amz-04-puerto-misahualli': ['Misahualli', 'Puerto Misahualli'],
    'amz-05-cavernas-de-jumandy': ['Jumandy', 'Cavernas de Jumandi'],
    'amz-06-torre-amani': ['Torre Amani'],
    'amz-07-cueva-del-duende': ['Cueva del Duende Tena'],
    'amz-08-parque-nacional-yasuni': ['Yasuni National Park', 'Parque Nacional Yasuni'],
    'amz-09-laguna-taracoa': ['Taracoa'],
    'amz-10-laguna-anango': ['Añangu', 'Anangu laguna'],
    'amz-11-laguna-ila-kucha': ['Ila Kucha'],
    'amz-12-cascada-hola-vida': ['Hola Vida Pastaza', 'Cascada Hola Vida'],
    'amz-13-mirador-de-shinguipata': ['Shinguipata'],
    'amz-14-cueva-de-los-tayos': ['Cueva de los Tayos'],
    'amz-15-macas-y-cascadas-cercanas': ['Macas Ecuador', 'Macas Morona Santiago'],
    'amz-16-reserva-biologica-el-quimi': ['El Quimi Gualaquiza', 'Reserva Biologica El Quimi'],
    'amz-17-parque-nacional-podocarpus-bombuscaro': ['Bombuscaro Podocarpus', 'Bombuscaro'],
    'amz-18-alto-nangaritza': ['Nangaritza', 'Alto Nangaritza'],
}

# Elección revisada a mano: id -> (archivo de Commons, texto alternativo en español).
# Fichas SIN foto a propósito (no hay en Commons una foto libre y fiable del lugar concreto):
#   gen-03 Yunguilla, gal-06 Los Túneles (solo fauna suelta), amz-02 Limoncocha, amz-03 Pañacocha,
#   amz-06 Torre Amani y amz-07 Cueva del Duende (emplazamiento sin verificar), amz-09 Taracoa,
#   amz-11 Ila Kucha, amz-13 Shinguipata, amz-16 El Quimi (solo láminas científicas).
# Tercer elemento opcional: autor, cuando Commons no lo trae en forma legible por máquina.
SELECTIONS: dict[str, tuple[str, ...]] = {
    'gen-01-saraguro-ancestral': ('File:Unterwegs nach Loja Ecuador408.JPG', 'Plaza central de Saraguro, en la provincia de Loja.'),
    'gen-02-quilotoa-shalala': ('File:Quilotoa Laguna Quilotoa seen from Mirador Cristal 1.jpg', 'Laguna verde turquesa del cráter del Quilotoa vista desde un mirador del borde.'),
    'gen-04-salasaca-viva': ('File:Tiendas artesanales, Salasaca - Pelileo.jpg', 'Tiendas de artesanías locales en Salasaca, Pelileo.'),
    'gen-05-oyacachi': ('File:Oyacachi.JPG', 'Páramo húmedo cerca de Oyacachi, en la Reserva Ecológica Cayambe-Coca.'),
    'gen-06-valle-de-intag': ('File:Rio Intag Ecuador 979.jpg', 'Montañas verdes del valle de Íntag, en Cotacachi.'),
    'gen-07-banos-de-agua-santa': ('File:The base of Pailón del Diablo.jpg', 'Base de la cascada del Pailón del Diablo, en la Ruta de las Cascadas de Baños.'),
    'gen-08-cuenca': ('File:Domes of the Catedral de la Immaculada Concepción.jpg', 'Cúpulas de la Catedral de la Inmaculada Concepción, en el centro histórico de Cuenca.'),
    'gen-09-parque-nacional-cotopaxi': ('File:Cotopaxi 01.jpg', 'Volcán Cotopaxi nevado sobre el páramo.'),
    'gen-10-otavalo': ('File:Otavalo Ecuador 866.jpg', 'Mercado artesanal de la Plaza de los Ponchos, en Otavalo, con el Imbabura al fondo.'),
    'gen-11-quito': ('File:Quito as from panecillo Basilica.jpg', 'Centro histórico de Quito visto desde El Panecillo, con la Basílica del Voto Nacional.'),
    'gen-12-loja': ('File:LojaCityGates.JPG', 'Puerta de la Ciudad, en Loja.'),
    'gen-13-riobamba': ('File:Catedral Riobamba.jpg', 'Catedral de Riobamba, en el centro de la ciudad.'),
    'gen-14-mindo': ('File:Mindo-Cloud-Forest-02.jpg', 'Bosque nublado cerca de Mindo.'),
    'costa-01-raices-de-manabi': ('File:Ecuador aguablanca sulfur laguna.jpg', 'Laguna sulfurosa de Agua Blanca, en el Parque Nacional Machalilla.', 'Delphine Ménard (notafish)'),
    'costa-02-guayaquil-vivo': ('File:Malecón 2000 en Guayaquil.jpg', 'Guayaquil vista desde el Malecón 2000, junto al río Guayas.'),
    'costa-03-pacifico-activo': ('File:Salinas panorama gennaio2010.jpg', 'Playa de Salinas vista desde lo alto.'),
    'costa-04-sabores-de-manta': ('File:Manta Ecuador playa Murciélago 02.jpg', 'Playa El Murciélago, en Manta.'),
    'costa-05-aventura-marina': ('File:Isla Salango1.jpg', 'Isla Salango frente a la costa de Manabí.'),
    'costa-06-expedicion-natural': ('File:Isla de la Plata Ecuador458.JPG', 'Paisaje de la Isla de la Plata, en el Parque Nacional Machalilla.'),
    'costa-07-ola-y-manglar': ('File:MOMPICHE ESMERALDAS ECUADOR.JPG', 'Playa de Mompiche, en Esmeraldas.'),
    'gal-01-bartolome-bahia-sullivan': ('File:Bartolomé Island Pinnacle Rock.jpg', 'Roca Pináculo y playas de la isla Bartolomé.'),
    'gal-02-seymour-norte-las-bachas': ('File:Isla Seymour Norte, islas Galápagos, Ecuador, 2015-07-26, DD 92.JPG', 'Isla Seymour Norte, en Galápagos.'),
    'gal-03-plaza-sur-punta-carrion': ('File:South Plaza Island 03.jpg', 'Isla Plaza Sur, en el Parque Nacional Galápagos.'),
    'gal-04-kicker-rock-tour-360': ('File:León Dormido (Kicker Rock).JPG', 'León Dormido (Kicker Rock) en el mar, frente a San Cristóbal.'),
    'gal-05-san-cristobal-terrestre': ('File:El Junco, Galapagos.jpg', 'Laguna El Junco, en las tierras altas de San Cristóbal.'),
    'gal-07-sierra-negra-volcan-chico': ('File:Sierra Negra volcano Isabela Island Galápagos Ecuador DSC00326 ad.JPG', 'Caldera del volcán Sierra Negra, en Isabela.'),
    'gal-08-tintoreras-concha-perla': ('File:Isabela Island, Tintoreras, Galápagos Islands, Ecuador.jpg', 'Islote Las Tintoreras, frente a Puerto Villamil.'),
    'gal-09-isabela-4-dias': ('File:PtoVillamilPlaya1.jpg', 'Playa de Puerto Villamil, en Isabela.'),
    'gal-10-galapagos-origins-5-dias': ('File:Bahía Tortuga, isla Santa Cruz, islas Galápagos, Ecuador, 2015-07-26, DD 26.JPG', 'Playa de arena blanca de Bahía Tortuga, en Santa Cruz.'),
    'gal-11-plan-economico-5-dias': ('File:Puerto Ayora - Harbour.jpg', 'Bahía de Puerto Ayora, en Santa Cruz.'),
    'gal-12-plan-normal-5-dias': ('File:Charles Darwin Research Station.jpg', 'Estación Científica Charles Darwin, en Puerto Ayora.'),
    'amz-01-reserva-cuyabeno': ('File:Macrolobiumbäume in der Laguna Grande, Cuyabeno-Reservat.jpg', 'Árboles que emergen del agua en la Laguna Grande de Cuyabeno.'),
    'amz-04-puerto-misahualli': ('File:Puerto Misahuallí.JPG', 'Botes en la playa de Puerto Misahuallí, en Napo.'),
    'amz-05-cavernas-de-jumandy': ('File:CAVERNAS DE JUMANDY (19971925995).jpg', 'Cavernas de Jumandy, en Archidona.'),
    'amz-08-parque-nacional-yasuni': ('File:Estacion Cientifica Yasuni (ECY) Yasuni Research Station.jpg', 'Río Tiputini y selva en el Parque Nacional Yasuní.'),
    'amz-10-laguna-anango': ('File:Dron de la Laguna Añangu.jpg', 'Laguna Añangu vista desde el aire, rodeada de selva.'),
    'amz-12-cascada-hola-vida': ('File:Cascada Hola Vida.jpg', 'Cascada Hola Vida, en Pomona, Pastaza.'),
    'amz-14-cueva-de-los-tayos': ('File:Corredor - Cueva de los Tayos.JPG', 'Corredor de paredes rectas dentro de la Cueva de los Tayos.'),
    'amz-15-macas-y-cascadas-cercanas': ('File:Centro y norte de Macas.jpg', 'Vista panorámica del centro y norte de Macas.'),
    'amz-17-parque-nacional-podocarpus-bombuscaro': ('File:Río Bombuscaro - Zamora.jpg', 'Río Bombuscaro, en el sector del Parque Nacional Podocarpus cercano a Zamora.'),
    'amz-18-alto-nangaritza': ('File:Río Nangaritza.JPG', 'Río Nangaritza visto desde el puente de Sumayaku, al sur de Guayzimi.'),
}


# Copias ya presentes en el repositorio del MISMO archivo de Commons (ver public/images/CREDITS.md):
# se reutilizan para no volver a pedir el original a upload.wikimedia.org.
LOCAL_COPIES: dict[str, str] = {
    'File:Ecuador aguablanca sulfur laguna.jpg': 'public/images/coast.jpg',
}


def strip_html(text: str) -> str:
    text = re.sub(r'<[^>]+>', ' ', text or '')
    return re.sub(r'\s+', ' ', html.unescape(text)).strip()


def meta(info: dict, key: str) -> str:
    return strip_html(info.get('extmetadata', {}).get(key, {}).get('value', ''))


def license_ok(name: str) -> bool:
    return bool(ALLOWED.match(name.strip()))


def polite_get(url: str, params: dict | None = None, timeout: int = 60) -> requests.Response:
    """GET con reintentos respetuosos ante 429/503 (Wikimedia limita a clientes automáticos)."""
    for attempt in range(8):
        response = requests.get(url, params=params, headers=HEADERS, timeout=timeout)
        if response.status_code in (429, 503):
            wait = max(int(response.headers.get('Retry-After', '0') or 0), 15 * (attempt + 1))
            print(f'  {response.status_code}: espero {wait}s', file=sys.stderr)
            time.sleep(wait)
            continue
        response.raise_for_status()
        return response
    response.raise_for_status()
    return response


def api(params: dict) -> dict:
    return polite_get(API, {'format': 'json', 'formatversion': '2', **params}, timeout=40).json()


def search(out: Path) -> None:
    result: dict[str, list[dict]] = json.loads(out.read_text(encoding='utf-8')) if out.exists() else {}
    for place_id, queries in QUERIES.items():
        if place_id in result:
            continue
        seen: dict[str, dict] = {}
        for query in queries:
            data = api({'action': 'query', 'generator': 'search', 'gsrnamespace': '6', 'gsrsearch': query,
                        'gsrlimit': '12', 'prop': 'imageinfo|categories', 'cllimit': '30',
                        'iiprop': 'url|extmetadata|size|mime', 'iiurlwidth': '1280'})
            for page in data.get('query', {}).get('pages', []):
                info = (page.get('imageinfo') or [{}])[0]
                if info.get('mime') not in ('image/jpeg', 'image/png', 'image/webp'):
                    continue
                lic = meta(info, 'LicenseShortName')
                seen[page['title']] = {
                    'title': page['title'], 'license': lic, 'allowed': license_ok(lic),
                    'size': [info.get('width'), info.get('height')],
                    'desc': meta(info, 'ImageDescription')[:220],
                    'cats': [c['title'].replace('Category:', '') for c in page.get('categories', [])][:12],
                    'artist': meta(info, 'Artist')[:80],
                }
            time.sleep(2)
        result[place_id] = list(seen.values())
        out.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding='utf-8', newline=LF)
        print(f'{place_id}: {len(seen)} candidatos', file=sys.stderr)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding='utf-8', newline=LF)


def crop_16_10(image: Image.Image) -> Image.Image:
    w, h = image.size
    if w / h > RATIO:
        nw = round(h * RATIO)
        left = (w - nw) // 2
        return image.crop((left, 0, left + nw, h))
    nh = round(w / RATIO)
    top = (h - nh) // 2
    return image.crop((0, top, w, top + nh))


def image_info(title: str, width: int) -> dict:
    data = api({'action': 'query', 'titles': title, 'prop': 'imageinfo',
                'iiprop': 'url|extmetadata|size|mime', 'iiurlwidth': str(width)})
    page = data['query']['pages'][0]
    if page.get('missing'):
        raise SystemExit(f'No existe {title}')
    return page['imageinfo'][0]


def download() -> None:
    only = set(sys.argv[2:])
    previous = {r['id']: r for r in json.loads(REGISTRY.read_text(encoding='utf-8'))} if REGISTRY.exists() else {}
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    registry = []
    for place_id, (title, alt, *override) in SELECTIONS.items():
        # Lo ya descargado (mismo archivo de Commons y webp presentes) se conserva; los ids pasados
        # como argumentos se vuelven a descargar.
        kept = previous.get(place_id)
        if kept and place_id not in only and kept['file'] == title and (ROOT / 'public' / kept['src'].lstrip('/')).exists():
            registry.append({**kept, 'alt': alt})
            continue
        info = image_info(title, 1600)
        # Panorámicas muy anchas: hace falta una miniatura más ancha para que el recorte 16:10 llegue a 1280 px.
        wide = -(-800 * info['width'] // info['height'])
        if wide > 1600 and info['width'] > wide:
            info = image_info(title, wide)
        # Se pide siempre una miniatura real (más estrecha que el original): Wikimedia limita mucho
        # la descarga de originales a clientes automáticos.
        # Un ancho mayor o igual al original devuelve el original («thumbnail_unscaled»), que es justo
        # lo que se limita; por eso se pide al menos un píxel menos que el original.
        if info['width'] <= 1600:
            info = image_info(title, min(1280, info['width'] - 1))
        lic = meta(info, 'LicenseShortName')
        if not license_ok(lic):
            raise SystemExit(f'{place_id}: licencia no permitida {lic!r} en {title}')
        artist = override[0] if override else (meta(info, 'Artist') or meta(info, 'Credit') or 'Autor desconocido')
        artist = re.sub(r'\s*\(talk\)|\s*\(discusión\)', '', artist).strip()
        local = LOCAL_COPIES.get(title)
        if local and (ROOT / local).exists():
            image = Image.open(ROOT / local)
        else:
            source_url = info.get('thumburl') or info['url']
            image = Image.open(io.BytesIO(polite_get(source_url, timeout=90).content))
        image = image.convert('RGB')
        image = crop_16_10(image)
        files = {}
        for width in WIDTHS:
            if image.width < width and width != WIDTHS[0]:
                continue
            target = image.resize((width, round(width / RATIO)), Image.LANCZOS) if image.width >= width else image
            path = OUT_DIR / f'{place_id}-{width}.webp'
            # Calidad 78; si una foto muy detallada (follaje) pasa del presupuesto, se baja un poco.
            for quality in (78, 72, 66):
                target.save(path, 'WEBP', quality=quality, method=6)
                if path.stat().st_size <= MAX_BYTES[width]:
                    break
            files[str(width)] = f'/images/places/{path.name}'
        registry.append({
            'id': place_id,
            'file': title,
            'pageUrl': info.get('descriptionurl') or f"https://commons.wikimedia.org/wiki/{title.replace(' ', '_')}",
            'author': artist,
            'license': lic,
            'licenseUrl': meta(info, 'LicenseUrl') or None,
            'alt': alt,
            'src': files['640'],
            'srcLarge': files.get('1280'),
            'retrievedAt': date.today().isoformat(),
        })
        print(f'{place_id}: {title} · {lic} · {artist}', file=sys.stderr)
        REGISTRY.write_text(json.dumps(registry + [r for k, r in previous.items() if k not in {x['id'] for x in registry}],
                                       ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline=LF)
        time.sleep(3)
    for stale in set(previous) - set(SELECTIONS):
        for width in WIDTHS:
            (OUT_DIR / f'{stale}-{width}.webp').unlink(missing_ok=True)
    REGISTRY.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline=LF)
    print(f'{len(registry)} fotos registradas en {REGISTRY.relative_to(ROOT)}', file=sys.stderr)
    write_outputs(registry)


TS_OUT = ROOT / 'src' / 'domain' / 'catalog' / 'data' / 'place-photos.ts'
CREDITS_MD = ROOT / 'public' / 'images' / 'CREDITS.md'
CREDITS_START = '<!-- fotos-por-ficha:inicio -->'
CREDITS_END = '<!-- fotos-por-ficha:fin -->'


def ts_string(value: str) -> str:
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"


def credits_block(registry: list[dict]) -> str:
    lines = [CREDITS_START, '', '## Fotos por ficha del catálogo (Wikimedia Commons)', '',
             'Generado por `scripts/fetch-place-images.py` desde `scripts/place-images.json`. Recorte 16:10 centrado y',
             'conversión a WebP (640 y 1280 px): son obras derivadas; las CC BY-SA se comparten bajo la misma licencia.', '']
    for r in sorted(registry, key=lambda x: x['id']):
        lic = r['license'] + (f" ({r['licenseUrl']})" if r.get('licenseUrl') else '')
        files = ', '.join(f"`{Path(p).name}`" for p in dict.fromkeys([r['src'], r.get('srcLarge') or r['src']]))
        lines.append(f"- {files}: «{r['file'].removeprefix('File:')}» — {r['author']}. {lic}. {r['pageUrl']}")
    lines += ['', CREDITS_END]
    return '\n'.join(lines)


RIGHTS_MD = ROOT / 'docs' / 'CONTENIDO_Y_DERECHOS.md'
NO_PHOTO_REASONS: dict[str, str] = {
    'gen-03-yunguilla': 'no hay en Commons una foto libre que muestre con certeza la comunidad de Yunguilla',
    'gal-06-los-tuneles-cabo-rosa': 'solo hay fotos de fauna suelta, sin el paisaje de los túneles de lava',
    'amz-02-laguna-de-limoncocha': 'sin foto libre fiable de la laguna',
    'amz-03-laguna-panacocha': 'sin foto libre fiable de la laguna',
    'amz-06-torre-amani': 'la fuente no ubica el lugar; no se puede comprobar ninguna foto',
    'amz-07-cueva-del-duende': 'la fuente no ubica el lugar; no se puede comprobar ninguna foto',
    'amz-09-laguna-taracoa': 'sin foto libre fiable de la laguna',
    'amz-11-laguna-ila-kucha': 'sin foto libre fiable de la laguna',
    'amz-13-mirador-de-shinguipata': 'sin foto libre del mirador',
    'amz-16-reserva-biologica-el-quimi': 'en Commons solo hay láminas científicas, no paisaje del área',
}


def rights_block(registry: list[dict]) -> str:
    lines = [CREDITS_START, '', '## Fotos reales por ficha', '',
             f'{len(registry)} de 51 fichas muestran una fotografía real del lugar o de su atractivo principal, tomada de',
             'Wikimedia Commons y aceptada solo con licencia de dominio público, CC0, CC BY o CC BY-SA, tras revisar',
             'título, descripción y categorías. Cada archivo es una obra derivada (recorte 16:10 centrado, WebP de 640 y',
             '1280 px); las fotos CC BY-SA se comparten bajo la misma licencia. La tarjeta muestra autor y licencia y',
             'enlaza a la página original. Registro completo: `scripts/place-images.json`; regeneración:',
             '`python -I scripts/fetch-place-images.py download` y después `node scripts/build-catalog-seed.mjs`.', '',
             'Una foto con licencia libre no implica aval del autor ni de las personas o comunidades que aparezcan.', '',
             '| Ficha | Obra en Commons | Autor | Licencia |', '| --- | --- | --- | --- |']
    for r in sorted(registry, key=lambda x: x['id']):
        lic = f"[{r['license']}]({r['licenseUrl']})" if r.get('licenseUrl') else r['license']
        title = r['file'].removeprefix('File:').replace('|', '\\|')
        lines.append(f"| `{r['id']}` | [{title}]({r['pageUrl']}) | {r['author']} | {lic} |")
    missing = [i for i in NO_PHOTO_REASONS if i not in {r['id'] for r in registry}]
    if missing:
        lines += ['', 'Fichas sin foto a propósito (siguen con la ilustración propia, rotulada como tal):', '']
        lines += [f'- `{i}`: {NO_PHOTO_REASONS[i]}.' for i in missing]
    lines += ['', CREDITS_END]
    return '\n'.join(lines)


def write_outputs(registry: list[dict]) -> None:
    """Escribe el módulo TS que usan las fichas y el bloque de créditos; no usa la red."""
    rows = []
    for r in sorted(registry, key=lambda x: x['id']):
        rows.append(
            f"  {ts_string(r['id'])}: {{\n"
            f"    src: {ts_string(r['src'])},\n"
            f"    srcLarge: {ts_string(r.get('srcLarge') or r['src'])},\n"
            f"    alt: {ts_string(r['alt'])},\n"
            f"    credit: {ts_string(r['author'] + ' · Wikimedia Commons')},\n"
            f"    license: {ts_string(r['license'])},\n"
            f"    pageUrl: {ts_string(r['pageUrl'])},\n"
            f"    depictsThisPlace: true,\n"
            f"  }},")
    TS_OUT.write_text(
        '/* Generado por scripts/fetch-place-images.py desde scripts/place-images.json. No editar a mano. */\n'
        "import type { ExperienceMedia } from '../types';\n\n"
        '/** Foto real del lugar (Wikimedia Commons, licencia libre). `srcLarge` y `pageUrl` son extras opcionales. */\n'
        'export type PlacePhoto = ExperienceMedia & { srcLarge: string; pageUrl: string };\n\n'
        'export const PLACE_PHOTOS: Readonly<Record<string, PlacePhoto>> = {\n' + '\n'.join(rows) + '\n};\n\n'
        '/** Media de una ficha: su foto real si existe; si no, vacío (la tarjeta usa la ilustración propia). */\n'
        'export const placeMedia = (id: string): ExperienceMedia[] => {\n'
        '  const photo = PLACE_PHOTOS[id];\n'
        '  return photo ? [photo] : [];\n'
        '};\n',
        encoding='utf-8', newline=LF)
    current = CREDITS_MD.read_text(encoding='utf-8')
    block = credits_block(registry)
    if CREDITS_START in current:
        head, rest = current.split(CREDITS_START, 1)
        tail = rest.split(CREDITS_END, 1)[1]
        current = head + block + tail
    else:
        current = current.rstrip('\n') + '\n\n' + block + '\n'
    CREDITS_MD.write_text(current, encoding='utf-8', newline=LF)
    rights = RIGHTS_MD.read_text(encoding='utf-8')
    if CREDITS_START in rights:
        head, rest = rights.split(CREDITS_START, 1)
        rights = head + rights_block(registry) + rest.split(CREDITS_END, 1)[1]
    else:
        rights = rights.rstrip('\n') + '\n\n' + rights_block(registry) + '\n'
    RIGHTS_MD.write_text(rights, encoding='utf-8', newline=LF)
    print(f'Escrito {TS_OUT.relative_to(ROOT)} y créditos en {CREDITS_MD.relative_to(ROOT)}', file=sys.stderr)


if __name__ == '__main__':
    command = sys.argv[1] if len(sys.argv) > 1 else ''
    if command == 'search':
        out = Path(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else ROOT / 'place-candidates.json'
        search(out)
    elif command == 'download':
        download()
    elif command == 'outputs':
        write_outputs(json.loads(REGISTRY.read_text(encoding='utf-8')))
    else:
        raise SystemExit(__doc__)
