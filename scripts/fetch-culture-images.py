#!/usr/bin/env python3
"""Fotos reales de las fiestas de Cultura Viva, tomadas de Wikimedia Commons con licencia libre.

Modelo: scripts/fetch-place-images.py. Uso (siempre con `python -I` desde la raíz del repositorio):

  python -I scripts/fetch-culture-images.py search  [--out <ruta.json>]  # candidatos para revisar a mano
  python -I scripts/fetch-culture-images.py download                    # descarga SELECTIONS y escribe el registro
  python -I scripts/fetch-culture-images.py outputs                     # sin red: regenera photos.ts y CREDITS.md

Reglas:
- Solo Public domain, CC0, CC BY y CC BY-SA (cualquier versión).
- Elección manual (SELECTIONS) tras revisar título, descripción y categorías: la foto debe mostrar ESA
  celebración (o su lugar y su símbolo, dicho en el texto alternativo). Sin foto fiable → la carta usa
  una ilustración propia rotulada como tal.
- Ceremonias comunitarias o cerradas (Kasama, Uwi/Chonta, Niño Jista) NO llevan foto: no se publican
  imágenes de rituales sin el consentimiento de la comunidad.
- Se guarda <id>-640.webp y <id>-1280.webp (recorte 4:5 centrado, vertical para las cartas) en
  public/images/culture/ y el registro de autoría y licencia en scripts/culture-images.json.
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
OUT_DIR = ROOT / 'public' / 'images' / 'culture'
REGISTRY = ROOT / 'scripts' / 'culture-images.json'
TS_OUT = ROOT / 'src' / 'domain' / 'culture' / 'photos.ts'
CREDITS_MD = ROOT / 'public' / 'images' / 'CREDITS.md'
CREDITS_START = '<!-- cultura-viva:inicio -->'
CREDITS_END = '<!-- cultura-viva:fin -->'
API = 'https://commons.wikimedia.org/w/api.php'
HEADERS = {'User-Agent': 'ChullaVidaCatalog/1.0 (educational project)'}
ALLOWED = re.compile(r'^(public domain|pd|cc0|cc[- ]by(-sa)?( \d(\.\d)?)?( [a-z]{2,3})?)$', re.I)
RATIO = 4 / 5  # ancho / alto: carta vertical
LF = '\n'
WIDTHS = (640, 1280)
MAX_BYTES = {640: 150_000, 1280: 420_000}

# Ceremonias sin foto a propósito.
NO_PHOTO = {
    'kasama': 'ceremonia del pueblo Tsáchila: no se publican fotos sin consentimiento de la comunidad',
    'fiesta-chonta': 'celebración comunitaria Shuar y Achuar: no se publican fotos sin consentimiento',
    'nino-jista': 'celebración comunitaria kichwa amazónica: no se publican fotos sin consentimiento',
}

QUERIES: dict[str, list[str]] = {
    'inti-raymi': ['Inti Raymi Otavalo', 'Inti Raymi Cotacachi', 'Inti Raymi Ecuador'],
    'mama-negra': ['Mama Negra Latacunga', 'Fiesta de la Mama Negra'],
    'fruta-flores': ['Fiesta de la Fruta y de las Flores Ambato', 'Ambato desfile flores'],
    'diablada-pillaro': ['Diablada Pillareña', 'Diablada Pillaro'],
    'artes-vivas-loja': ['Loja Ecuador teatro', 'Loja Ecuador Teatro Bolívar', 'Festival Artes Vivas Loja'],
    'rodeo-montuvio': ['Rodeo montubio', 'Montubio Ecuador caballo'],
    'san-pedro-san-pablo': ['San Pedro y San Pablo Manabí', 'Procesión marítima Manabí', 'Jaramijó pescadores'],
    'provincializacion-galapagos': ['Puerto Baquerizo Moreno malecón', 'Puerto Baquerizo Moreno'],
    'carnaval-guaranda': ['Carnaval de Guaranda', 'Guaranda carnaval'],
    'corpus-christi-pujili': ['Danzante de Pujilí', 'Corpus Christi Pujilí', 'Danzante Pujili'],
    'yamor': ['Fiesta del Yamor Otavalo', 'Yamor Otavalo', 'chicha de yamor'],
    'pase-nino-viajero': ['Pase del Niño Viajero Cuenca', 'Pase del Niño Cuenca'],
    'fiestas-quito': ['Fiestas de Quito chiva', 'chiva Quito fiestas', 'Fiestas de Quito'],
    'virgen-del-cisne': ['Virgen del Cisne romería', 'Santuario El Cisne Loja', 'Basílica El Cisne'],
    'jesus-gran-poder': ['Jesús del Gran Poder procesión Quito', 'cucuruchos Quito', 'Semana Santa Quito procesión'],
    'pawkar-raymi': ['Pawkar Raymi', 'Pawkar Raymi Peguche'],
    'kulla-raymi': ['Kulla Raymi', 'Killa Raymi'],
    'kapak-raymi': ['Kapak Raymi', 'Capac Raymi'],
    'dia-difuntos': ['colada morada guaguas de pan', 'guagua de pan', 'colada morada'],
    'maiz-sangolqui': ['Paseo del Chagra Sangolquí', 'Sangolquí', 'chagra Ecuador'],
    'virgen-quinche': ['Santuario El Quinche', 'El Quinche basilica', 'Virgen del Quinche'],
    'ano-viejo': ['Año Viejo Ecuador monigote', 'Años viejos Guayaquil', 'monigotes Ecuador'],
    'fundacion-guayaquil': ['Fundación de Guayaquil desfile', 'Guayaquil Las Peñas', 'Barrio Las Peñas Guayaquil'],
    'independencia-guayaquil': ['Columna de los Próceres Guayaquil', 'Plaza del Centenario Guayaquil'],
    'marimba-esmeraldas': ['marimba Esmeraldas', 'marimba Ecuador', 'marimba esmeraldeña'],
    'puyo-nacionalidades': ['Puyo Pastaza', 'Puyo Ecuador', 'Puyo malecón'],
    'cantonizacion-isabela': ['Puerto Villamil Isabela', 'Puerto Villamil'],
    'fiestas-cuenca': ['Cuenca Ecuador desfile', 'Parque Calderón Cuenca', 'Cuenca Ecuador fiestas'],
}

# Elección manual tras revisar candidatos (título, descripción y categorías en Commons):
# (archivo, texto alternativo, qué muestra[, autor legible]).
# «fiesta»: la foto es de esa celebración. «lugar»: no hay foto libre de la celebración y se muestra el lugar
# o el monumento donde ocurre; la carta lo rotula como «Foto del lugar».
# Sin foto (ilustración rotulada): san-pedro-san-pablo, yamor, fiestas-quito y maiz-sangolqui (no hay en Commons
# una foto libre fiable de la celebración), más las ceremonias de NO_PHOTO.
SELECTIONS: dict[str, tuple[str, ...]] = {
    'inti-raymi': ('File:Inti Raymi Otavalo Ecuador 1685.jpg', 'Celebración del Inti Raymi en Otavalo.', 'fiesta'),
    'mama-negra': ('File:FIESTA DE LA MAMA NEGRA (38115162706).jpg', 'Comparsa de la Mama Negra en Latacunga, noviembre de 2017.', 'fiesta'),
    'fruta-flores': ('File:Desfile de Carnaval, Ambato, Ecuador (6816467590).jpg', 'Desfile de las fiestas de Carnaval en Ambato.', 'fiesta'),
    'diablada-pillaro': ('File:Diablada-ecuador.jpg', 'Danzante de la Diablada Pillareña con su máscara de diablo.', 'fiesta'),
    'artes-vivas-loja': ('File:Children drawing with chalk on a decorated street in Loja during the arts festival.jpg', 'Calle de Loja decorada durante el Festival de Artes Vivas 2025; dos niños dibujan con tiza.', 'fiesta'),
    'rodeo-montuvio': ('File:Rodeos.jpg', 'Rodeo montubio en el cantón Colimes, Guayas.', 'fiesta'),
    'provincializacion-galapagos': ('File:Sea lions on town bench in Puerto Baquerizo Moreno, Galapagos Islands.JPG', 'Lobos marinos sobre una banca en Puerto Baquerizo Moreno, capital de Galápagos.', 'lugar'),
    'carnaval-guaranda': ('File:Carnaval de Guaranda 2019.jpg', 'Desfile de inicio del Carnaval de Guaranda con el Taita Carnaval, 2019.', 'fiesta'),
    'corpus-christi-pujili': ('File:Danzantes del Corpus Christi, Pujilí.jpg', 'Danzantes del Corpus Christi en Pujilí.', 'fiesta'),
    'pase-nino-viajero': ('File:Cuenca Pase del Niño.jpg', 'Pase del Niño, desfile tradicional en Cuenca.', 'fiesta'),
    'virgen-del-cisne': ('File:Romería de la Virgen de El Cisne 19,20 de agosto 2016 920 (29179469205).jpg', 'Romería de la Virgen de El Cisne, agosto de 2016.', 'fiesta'),
    'jesus-gran-poder': ('File:Quito Proc del Jesus del Gran Poder 2010 a.jpg', 'Procesión de Jesús del Gran Poder en Quito, Viernes Santo de 2010.', 'fiesta'),
    'pawkar-raymi': ('File:Indigenous Pawkar Raymi Festival Guaranda Ecuador 1.jpg', 'Celebración del Pawkar Raymi en Guaranda.', 'fiesta'),
    'kulla-raymi': ('File:Batea con mazorcas de maíz.jpg', 'Batea con mazorcas de maíz, ofrenda del Kulla Raymi.', 'fiesta'),
    'kapak-raymi': ('File:Wikis of the Kapak Raymi Ceremony.jpg', 'Personajes «wikis» de una celebración del Kapak Raymi.', 'fiesta'),
    'dia-difuntos': ('File:Colada morada with guagua de pan from Cyrano bakery in Quito.jpg', 'Taza de colada morada con una guagua de pan.', 'fiesta'),
    'virgen-quinche': ('File:Santuario de El Quinche, El Quinche, Ecuador, 2015-07-21, DD 08.JPG', 'Santuario de El Quinche, destino de la romería.', 'lugar'),
    'ano-viejo': ('File:Monigotes (15954812490).jpg', 'Monigotes de Año Viejo a la venta en Guayaquil, diciembre de 2014.', 'fiesta'),
    'fundacion-guayaquil': ('File:Callecita Barrio Las Peñas, Guayaquil, Ecuador.jpg', 'Barrio Las Peñas, el más antiguo de Guayaquil.', 'lugar'),
    'independencia-guayaquil': ('File:Parque Centenario Monumento.jpg', 'Columna a los Próceres del 9 de Octubre, en Guayaquil.', 'lugar'),
    'marimba-esmeraldas': ('File:AFROECUATORIANO - La Marimba Esmeraldas.jpg', 'Marimba de Esmeraldas.', 'fiesta'),
    'puyo-nacionalidades': ('File:Puyo Ecuador.jpg', 'Vista de Puyo desde el mirador del Paseo Turístico.', 'lugar'),
    'cantonizacion-isabela': ('File:Parque Central de Puerto Villamil.jpg', 'Parque central de Puerto Villamil, en Isabela.', 'lugar'),
    'fiestas-cuenca': ('File:Ecuador, Cuenca - Plaza del Carmen.jpg', 'Plaza del Carmen durante las fiestas de Cuenca, 3 de noviembre de 2009.', 'fiesta'),
}


def strip_html(text: str) -> str:
    text = re.sub(r'<[^>]+>', ' ', text or '')
    return re.sub(r'\s+', ' ', html.unescape(text)).strip()


def meta(info: dict, key: str) -> str:
    return strip_html(info.get('extmetadata', {}).get(key, {}).get('value', ''))


def license_ok(name: str) -> bool:
    return bool(ALLOWED.match(name.strip()))


def polite_get(url: str, params: dict | None = None, timeout: int = 60) -> requests.Response:
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
    for event_id, queries in QUERIES.items():
        if event_id in result:
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
        result[event_id] = list(seen.values())
        out.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding='utf-8', newline=LF)
        print(f'{event_id}: {len(seen)} candidatos', file=sys.stderr)


def crop_ratio(image: Image.Image) -> Image.Image:
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
    for event_id, (title, alt, depicts, *override) in SELECTIONS.items():
        if event_id in NO_PHOTO:
            raise SystemExit(f'{event_id} no debe llevar foto: {NO_PHOTO[event_id]}')
        kept = previous.get(event_id)
        if kept and event_id not in only and kept['file'] == title and (ROOT / 'public' / kept['src'].lstrip('/')).exists():
            registry.append({**kept, 'alt': alt, 'depicts': depicts})
            continue
        # Para un recorte vertical 4:5 de 1280 px de ancho hace falta una altura de 1600 px.
        info = image_info(title, 2000)
        needed = -(-1600 * info['width'] // info['height'])
        width = min(max(1280, needed), info['width'] - 1)
        info = image_info(title, width)
        lic = meta(info, 'LicenseShortName')
        if not license_ok(lic):
            raise SystemExit(f'{event_id}: licencia no permitida {lic!r} en {title}')
        artist = override[0] if override else (meta(info, 'Artist') or meta(info, 'Credit') or 'Autor desconocido')
        artist = re.sub(r'\s*\(talk\)|\s*\(discusión\)', '', artist).strip()
        image = Image.open(io.BytesIO(polite_get(info.get('thumburl') or info['url'], timeout=90).content))
        image = crop_ratio(image.convert('RGB'))
        files = {}
        for target_width in WIDTHS:
            if image.width < target_width and target_width != WIDTHS[0]:
                continue
            size = (target_width, round(target_width / RATIO))
            target = image.resize(size, Image.LANCZOS) if image.width >= target_width else image
            path = OUT_DIR / f'{event_id}-{target_width}.webp'
            for quality in (78, 72, 66, 60):
                target.save(path, 'WEBP', quality=quality, method=6)
                if path.stat().st_size <= MAX_BYTES[target_width]:
                    break
            files[str(target_width)] = f'/images/culture/{path.name}'
        registry.append({
            'id': event_id,
            'file': title,
            'pageUrl': info.get('descriptionurl') or f"https://commons.wikimedia.org/wiki/{title.replace(' ', '_')}",
            'author': artist,
            'license': lic,
            'licenseUrl': meta(info, 'LicenseUrl') or None,
            'alt': alt,
            'depicts': depicts,
            'src': files['640'],
            'srcLarge': files.get('1280') or files['640'],
            'retrievedAt': date.today().isoformat(),
        })
        print(f'{event_id}: {title} · {lic} · {artist}', file=sys.stderr)
        REGISTRY.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline=LF)
        time.sleep(3)
    for stale in set(previous) - set(SELECTIONS):
        for target_width in WIDTHS:
            (OUT_DIR / f'{stale}-{target_width}.webp').unlink(missing_ok=True)
    REGISTRY.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline=LF)
    print(f'{len(registry)} fotos registradas en {REGISTRY.relative_to(ROOT)}', file=sys.stderr)
    write_outputs(registry)


def ts_string(value: str) -> str:
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"


def credits_block(registry: list[dict]) -> str:
    lines = [CREDITS_START, '', '## Cultura Viva: fotos de fiestas (Wikimedia Commons)', '',
             'Generado por `scripts/fetch-culture-images.py` desde `scripts/culture-images.json`. Recorte vertical 4:5',
             'centrado y conversión a WebP (640 y 1280 px): son obras derivadas; las CC BY-SA se comparten bajo la misma',
             'licencia. Una foto libre no implica aval del autor ni de las personas o comunidades que aparecen.', '']
    for r in sorted(registry, key=lambda x: x['id']):
        lic = r['license'] + (f" ({r['licenseUrl']})" if r.get('licenseUrl') else '')
        files = ', '.join(f"`{Path(p).name}`" for p in dict.fromkeys([r['src'], r.get('srcLarge') or r['src']]))
        lines.append(f"- {files}: «{r['file'].removeprefix('File:')}» — {r['author']}. {lic}. {r['pageUrl']}")
    lines += ['', 'Sin foto a propósito (la carta usa una ilustración propia, rotulada):', '']
    lines += [f'- `{i}`: {reason}.' for i, reason in sorted(NO_PHOTO.items())]
    lines += ['', CREDITS_END]
    return '\n'.join(lines)


def write_outputs(registry: list[dict]) -> None:
    rows = []
    for r in sorted(registry, key=lambda x: x['id']):
        rows.append(
            f"  {ts_string(r['id'])}: {{\n"
            f"    src: {ts_string(r['src'])},\n"
            f"    srcLarge: {ts_string(r.get('srcLarge') or r['src'])},\n"
            f"    alt: {ts_string(r['alt'])},\n"
            f"    author: {ts_string(r['author'])},\n"
            f"    license: {ts_string(r['license'])},\n"
            f"    pageUrl: {ts_string(r['pageUrl'])},\n"
            f"    depicts: {ts_string(r.get('depicts', 'fiesta'))},\n"
            f"  }},")
    TS_OUT.write_text(
        '/* Generado por scripts/fetch-culture-images.py desde scripts/culture-images.json. No editar a mano. */\n\n'
        '/** Foto real de una fiesta (Wikimedia Commons, licencia libre). */\n'
        'export interface CulturePhoto {\n  src: string;\n  srcLarge: string;\n  alt: string;\n'
        '  author: string;\n  license: string;\n  pageUrl: string;\n'
        '  /** «fiesta»: muestra la celebración; «lugar»: muestra el sitio o monumento donde ocurre. */\n'
        "  depicts: 'fiesta' | 'lugar';\n}\n\n"
        'export const CULTURE_PHOTOS: Readonly<Record<string, CulturePhoto>> = {\n' + '\n'.join(rows) + '\n};\n',
        encoding='utf-8', newline=LF)
    current = CREDITS_MD.read_text(encoding='utf-8')
    block = credits_block(registry)
    if CREDITS_START in current:
        head, rest = current.split(CREDITS_START, 1)
        current = head + block + rest.split(CREDITS_END, 1)[1]
    else:
        current = current.rstrip('\n') + '\n\n' + block + '\n'
    CREDITS_MD.write_text(current, encoding='utf-8', newline=LF)
    print(f'Escrito {TS_OUT.relative_to(ROOT)} y créditos en {CREDITS_MD.relative_to(ROOT)}', file=sys.stderr)


if __name__ == '__main__':
    command = sys.argv[1] if len(sys.argv) > 1 else ''
    if command == 'search':
        out = Path(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else ROOT / 'culture-candidates.json'
        search(out)
    elif command == 'download':
        download()
    elif command == 'outputs':
        write_outputs(json.loads(REGISTRY.read_text(encoding='utf-8')))
    else:
        raise SystemExit(__doc__)
