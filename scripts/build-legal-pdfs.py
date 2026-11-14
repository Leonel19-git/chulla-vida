"""Genera los PDF de protección de datos de CHULLA VIDA (LOPDP, Ecuador).

Uso:  python -I scripts/build-legal-pdfs.py
Salida:
  public/legal/aviso-proteccion-datos-chulla-vida.pdf
  public/legal/formulario-derechos-datos-chulla-vida.pdf  (rellenable: campos AcroForm)

Contenido basado en src/content/legal/02_POLITICA_DE_PRIVACIDAD.md y 07_TEXTOS_CONSENTIMIENTO_UI.md.
Es un BORRADOR: los datos del responsable quedan como marcadores [RAZÓN SOCIAL], [RUC], etc. No inventar datos.
Requiere reportlab y Pillow. La salida es determinista (rl_config.invariant) para que el diff sea limpio.
"""
from __future__ import annotations

import io
from pathlib import Path

from PIL import Image as PILImage
from reportlab import rl_config
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import (BaseDocTemplate, Flowable, Frame, KeepTogether, PageTemplate, Paragraph, Spacer, Table,
                                TableStyle)

rl_config.invariant = 1

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / 'public' / 'brand' / 'logo-640.webp'
OUT = ROOT / 'public' / 'legal'
VERSION = '0.9-borrador'
DATE = '13-11-2026'
DRAFT = 'BORRADOR — pendiente de revisión jurídica'

NAVY = colors.HexColor('#012960')
RED = colors.HexColor('#c61534')
MAIZE = colors.HexColor('#fed65a')
TURQ = colors.HexColor('#0e8aa0')
TURQ_INK = colors.HexColor('#0a6474')
INK = colors.HexColor('#1d2b3a')
MUTED = colors.HexColor('#4f5d6b')
LINE = colors.HexColor('#dcd6c8')
SOFT = colors.HexColor('#f6f2e8')
MAIZE_SOFT = colors.HexColor('#fff6d6')

PAGE_W, PAGE_H = A4
MARGIN_X = 20 * mm


def logo_reader() -> ImageReader:
    """Convierte el logo WebP a PNG en memoria (fondo blanco) para incrustarlo."""
    with PILImage.open(LOGO) as image:
        rgba = image.convert('RGBA')
        flat = PILImage.new('RGB', rgba.size, (255, 255, 255))
        flat.paste(rgba, mask=rgba.split()[3])
        flat.thumbnail((240, 240), PILImage.LANCZOS)  # 17 mm a ~360 ppp: nítido y liviano
        buffer = io.BytesIO()
        flat.save(buffer, format='PNG', optimize=True)
    buffer.seek(0)
    return ImageReader(buffer)


LOGO_IMG = logo_reader()

# ───────────── Estilos ─────────────
BASE = ParagraphStyle('base', fontName='Helvetica', fontSize=10, leading=14.5, textColor=INK, alignment=TA_LEFT)
SMALL = ParagraphStyle('small', parent=BASE, fontSize=8.5, leading=12, textColor=MUTED)
CELL = ParagraphStyle('cell', parent=BASE, fontSize=8.6, leading=11.6)
CELL_HEAD = ParagraphStyle('cellhead', parent=CELL, fontName='Helvetica-Bold', textColor=colors.white)
TITLE = ParagraphStyle('title', parent=BASE, fontName='Helvetica-Bold', fontSize=21, leading=25, textColor=NAVY)
SUBTITLE = ParagraphStyle('subtitle', parent=BASE, fontSize=11, leading=15, textColor=MUTED)
H2 = ParagraphStyle('h2', parent=BASE, fontName='Helvetica-Bold', fontSize=13, leading=17, textColor=NAVY, spaceBefore=12, spaceAfter=5, keepWithNext=1)
H3 = ParagraphStyle('h3', parent=BASE, fontName='Helvetica-Bold', fontSize=10.5, leading=14, textColor=TURQ_INK, spaceBefore=6, spaceAfter=2, keepWithNext=1)
BULLET = ParagraphStyle('bullet', parent=BASE, leftIndent=12, bulletIndent=2, spaceAfter=2)
LABEL = ParagraphStyle('label', parent=BASE, fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=NAVY)


def p(text: str, style: ParagraphStyle = BASE) -> Paragraph:
    return Paragraph(text, style)


def bullets(items: list[str]) -> list[Paragraph]:
    return [Paragraph(item, BULLET, bulletText='•') for item in items]


def table(rows: list[list[str]], widths: list[float]) -> Table:
    data = [[Paragraph(cell, CELL_HEAD if index == 0 else CELL) for cell in row] for index, row in enumerate(rows)]
    result = Table(data, colWidths=widths, repeatRows=1)
    result.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, SOFT]),
        ('LINEBELOW', (0, 0), (-1, -1), 0.4, LINE),
        ('BOX', (0, 0), (-1, -1), 0.6, LINE),
        ('LEFTPADDING', (0, 0), (-1, -1), 5), ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    return result


def callout(text: str, fill=MAIZE_SOFT, border=MAIZE) -> Table:
    box = Table([[Paragraph(text, BASE)]], colWidths=[PAGE_W - 2 * MARGIN_X])
    box.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), fill), ('LINEBEFORE', (0, 0), (0, -1), 4, border),
                             ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                             ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
    return box


# ───────────── Página: cabecera, franja de marca, rótulo de borrador y numeración ─────────────
class NumberedCanvas(rl_canvas.Canvas):
    """Dos pasadas para poder escribir «Página X de Y»."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._pages: list[dict] = []

    def showPage(self):  # noqa: N802 (API de reportlab)
        self._pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._pages)
        for state in self._pages:
            self.__dict__.update(state)
            self.setFont('Helvetica', 8)
            self.setFillColor(MUTED)
            self.drawRightString(PAGE_W - MARGIN_X, 12 * mm, f'Página {self._pageNumber} de {total}')
            super().showPage()
        super().save()


def decorate(title: str):
    def draw(canv: rl_canvas.Canvas, doc):
        canv.saveState()
        # Franja de cuatro colores de marca.
        stripe = PAGE_W / 4
        for index, color in enumerate((NAVY, RED, MAIZE, TURQ)):
            canv.setFillColor(color)
            canv.rect(index * stripe, PAGE_H - 5 * mm, stripe, 5 * mm, stroke=0, fill=1)
        # Cabecera: logo y título corto.
        canv.drawImage(LOGO_IMG, MARGIN_X, PAGE_H - 25 * mm, width=17 * mm, height=17 * mm, preserveAspectRatio=True, mask='auto')
        canv.setFont('Helvetica-Bold', 9)
        canv.setFillColor(NAVY)
        canv.drawString(MARGIN_X + 21 * mm, PAGE_H - 14 * mm, 'CHULLA VIDA')
        canv.setFont('Helvetica', 8.5)
        canv.setFillColor(MUTED)
        canv.drawString(MARGIN_X + 21 * mm, PAGE_H - 18.5 * mm, title)
        # Rótulo de borrador (cabecera) y marca de agua.
        canv.setFillColor(RED)
        canv.roundRect(PAGE_W - MARGIN_X - 74 * mm, PAGE_H - 19.5 * mm, 74 * mm, 7.5 * mm, 2 * mm, stroke=0, fill=1)
        canv.setFillColor(colors.white)
        canv.setFont('Helvetica-Bold', 7.6)
        canv.drawCentredString(PAGE_W - MARGIN_X - 37 * mm, PAGE_H - 16.9 * mm, DRAFT)
        canv.setFillColor(colors.Color(0.776, 0.082, 0.204, alpha=0.06))
        canv.setFont('Helvetica-Bold', 70)
        canv.translate(PAGE_W / 2, PAGE_H / 2)
        canv.rotate(35)
        canv.drawCentredString(0, 0, 'BORRADOR')
        canv.restoreState()
        # Pie.
        canv.saveState()
        canv.setStrokeColor(LINE)
        canv.line(MARGIN_X, 16 * mm, PAGE_W - MARGIN_X, 16 * mm)
        canv.setFont('Helvetica', 8)
        canv.setFillColor(MUTED)
        canv.drawString(MARGIN_X, 12 * mm, f'{DRAFT} · Versión {VERSION} · {DATE}')
        canv.restoreState()
    return draw


def build(path: Path, title: str, story: list, subject: str):
    doc = BaseDocTemplate(str(path), pagesize=A4, leftMargin=MARGIN_X, rightMargin=MARGIN_X, topMargin=31 * mm, bottomMargin=22 * mm,
                          title=f'CHULLA VIDA — {title}', author='CHULLA VIDA ([RAZÓN SOCIAL])', subject=subject, creator='scripts/build-legal-pdfs.py', lang='es-EC')
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='main', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id='page', frames=[frame], onPage=decorate(title))])
    doc.build(story, canvasmaker=NumberedCanvas)


def heading_block(title: str, subtitle: str) -> list:
    return [p(title, TITLE), Spacer(1, 4), p(subtitle, SUBTITLE), Spacer(1, 10)]


W = PAGE_W - 2 * MARGIN_X


# ───────────── Aviso de protección de datos ─────────────
def notice_story() -> list:
    s: list = heading_block('Aviso de Protección de Datos Personales',
                            f'Cómo cuidamos tu información en CHULLA VIDA, bajo la Ley Orgánica de Protección de Datos Personales (LOPDP) de Ecuador. Versión {VERSION} · {DATE}.')
    s.append(callout('<b>Antes de leer:</b> este aviso es un borrador. Los campos entre corchetes los completará el responsable legal y un abogado en Ecuador '
                     'antes de su publicación definitiva. No acredita cumplimiento ni certificación.'))
    s += [p('1. Quién es responsable de tus datos', H2),
          table([['Dato', 'Valor'],
                 ['Responsable del tratamiento', '[RAZÓN SOCIAL]'], ['RUC', '[RUC]'], ['Domicilio', '[DOMICILIO]'],
                 ['Correo de privacidad', '[CORREO DE PRIVACIDAD]'], ['Sitio web', 'https://chulla-vida.vercel.app'],
                 ['Delegado de protección de datos', '[SI EXISTE O CUANDO CORRESPONDA — NO INVENTAR NOMBRAMIENTO]']], [55 * mm, W - 55 * mm]),
          p('2. Qué datos tratamos, para qué y con qué base', H2),
          p('Pedimos solo lo que cada función necesita. La columna «base legal» es una propuesta que debe confirmarse con asesoría; el consentimiento no es la única base posible y nunca se mezcla con la aceptación de los términos.'),
          Spacer(1, 5),
          table([['Flujo', 'Datos', 'Finalidad', 'Base legal (a confirmar)'],
                 ['Cuenta y acceso', 'Correo, identificador, código de verificación, datos de sesión y seguridad', 'Crear tu cuenta, verificar tu correo e iniciar sesión de forma segura', 'Ejecución del servicio'],
                 ['Cédula para compras y anfitriones', 'Número de cédula o pasaporte y nombre', 'Comprobar el formato y asociar reservas o verificar a anfitriones y comercios. Un dígito verificador correcto NO confirma identidad: no consultamos el Registro Civil', 'Ejecución contractual / obligación legal aplicable'],
                 ['Reservas y pagos', 'Experiencia, fecha, importe, estado y referencia del proveedor de pagos', 'Gestionar la reserva, el cobro, la conciliación y los comprobantes. Los datos de tarjeta los recibe solo el proveedor de pagos', 'Ejecución contractual / obligación tributaria'],
                 ['MIJIN (asistente de voz)', 'Texto de tu pregunta; la voz se procesa en el navegador', 'Responder tu consulta. La voz y el audio no se almacenan', 'Consentimiento al activar el micrófono'],
                 ['Ubicación puntual', 'Coordenadas aproximadas en el momento en que lo pides', 'Sugerir lugares cercanos y consultar el clima. Sin seguimiento continuo', 'Consentimiento (permiso del navegador)'],
                 ['Notificaciones', 'Preferencias y, si las activas, identificador push', 'Avisos de tus reservas y, por separado, novedades que elijas', 'Ejecución del servicio / consentimiento'],
                 ['Cookies y almacenamiento local', 'Tu nivel de privacidad, idioma, viajes y descargas en el dispositivo', 'Que el sitio funcione; contenido externo solo si lo permites. Sin analítica ni publicidad', 'Necesarias / consentimiento para opcionales'],
                 ['Solicitudes de derechos', 'Nombre, documento, contacto y detalle de tu pedido', 'Atender y documentar el ejercicio de tus derechos', 'Obligación legal']],
                [33 * mm, 40 * mm, 62 * mm, W - 135 * mm]),
          p('3. Con quién compartimos datos', H2),
          p('Trabajamos con proveedores que tratan datos por encargo nuestro (encargados). Cada uno debe tener un contrato de encargo firmado antes de la operación comercial.'),
          Spacer(1, 5),
          table([['Proveedor', 'Para qué', 'Datos', 'Ubicación del tratamiento'],
                 ['Supabase', 'Base de datos, autenticación y archivos privados', 'Cuenta, reservas, solicitudes', '[REGIÓN DEL PROYECTO — A CONFIRMAR]'],
                 ['Vercel', 'Alojamiento del sitio y funciones del servidor', 'Datos técnicos de cada visita (IP, navegador)', '[A CONFIRMAR]'],
                 ['PayPhone', 'Pasarela de pagos (cuando esté contratada)', 'Importe, referencia y datos que tú ingresas en su página', '[A CONFIRMAR]'],
                 ['Anthropic', 'Respuestas de MIJIN con IA, solo si se activa ese servicio', 'Texto de la consulta, sin tu voz', '[A CONFIRMAR]'],
                 ['Open-Meteo', 'Pronóstico del clima', 'Coordenadas aproximadas del lugar consultado, sin identificarte', '[A CONFIRMAR]']],
                [26 * mm, 50 * mm, 50 * mm, W - 126 * mm]),
          Spacer(1, 4),
          p('Spotify y OpenStreetMap no son encargados: son terceros cuyo contenido solo se carga si eliges el nivel «Equilibrado» o lo activas en «Personalizado». '
            'Los datos de una reserva se comparten con el anfitrión de esa experiencia solo en lo necesario para prestarla. No vendemos datos personales.', SMALL),
          p('4. Transferencias internacionales', H2),
          p('Algunos proveedores pueden tratar datos fuera de Ecuador. Antes de producción documentaremos el país, la finalidad y la garantía aplicable según la LOPDP y su Reglamento, y publicaremos la lista en [LINK A LISTA DE PROVEEDORES].'),
          p('5. Cuánto tiempo conservamos tus datos', H2),
          table([['Categoría', 'Plazo'],
                 ['Cuenta activa', '[PERÍODO]'], ['Cuenta cerrada', '[PLAZO DE PURGA / EXCEPCIONES]'],
                 ['Cédula o pasaporte asociado a compras o verificación', '[PLAZO — A CONFIRMAR CON ASESORÍA]'],
                 ['Reservas, pagos y comprobantes', '[PLAZO LEGAL TRIBUTARIO ASESORADO]'],
                 ['Documentos de verificación rechazados', '[PLAZO]'], ['Audio de voz', 'No se almacena'],
                 ['Ubicación puntual', 'Solo durante la consulta; no se guarda en servidor'],
                 ['Identificadores push', 'Hasta que te des de baja o dejen de ser válidos'],
                 ['Solicitudes de derechos y registros de consentimiento', '[PLAZO DE PRUEBA LEGAL]'], ['Registros de seguridad', '[PLAZO]']],
                [95 * mm, W - 95 * mm]),
          p('6. Tus derechos', H2)]
    s += bullets(['<b>Acceso:</b> saber qué datos tuyos tratamos, para qué y con quién.',
                  '<b>Rectificación y actualización:</b> corregir datos inexactos o incompletos.',
                  '<b>Eliminación:</b> pedir que borremos tus datos cuando ya no sean necesarios, salvo que la ley obligue a conservarlos (te diremos por qué).',
                  '<b>Oposición:</b> pedir que dejemos de usar tus datos para un fin concreto.',
                  '<b>Portabilidad:</b> recibir tus datos en un formato estructurado y de uso común.',
                  '<b>Suspensión del tratamiento:</b> pausar el uso mientras se revisa un reclamo.',
                  '<b>No ser objeto de decisiones automatizadas:</b> pedir revisión humana de decisiones tomadas solo por un sistema.',
                  '<b>Retirar tu consentimiento</b> cuando esa sea la base, tan fácil como lo diste: en «Privacidad y cookies».'])
    s += [p('7. Cómo ejercerlos', H2)]
    s += bullets(['En línea: «Privacidad y cookies», opción «Abre el formulario de derechos», en https://chulla-vida.vercel.app.',
                  'Con el <b>Formulario de Derechos</b> en PDF, enviado a [CORREO DE PRIVACIDAD] junto con una copia de tu documento de identidad.',
                  'Es gratuito. Validaremos tu identidad de forma proporcionada y responderemos en el plazo legal: [PENDIENTE DE CONFIRMAR CON ASESORÍA].'])
    s += [p('8. Autoridad de control', H2),
          p('Si consideras que no atendimos tu solicitud, puedes acudir a la Superintendencia de Protección de Datos Personales (SPDP): <font color="#0a6474"><u>https://www.spdp.gob.ec/</u></font>.'),
          p('9. Menores de edad', H2),
          p('CHULLA VIDA no está dirigida a menores para contratar. Si en el futuro se habilitan funciones para menores, se aplicarán reglas de representación y consentimiento conforme a la ley. No usamos perfiles de menores para marketing.'),
          p('10. Seguridad', H2),
          p('Usamos cifrado en tránsito, control de acceso por roles con reglas de seguridad a nivel de fila (RLS), claves secretas solo en el servidor, almacenamiento privado para documentos y registros de acciones administrativas. Ningún sistema es infalible: si detectamos un incidente, actuaremos y notificaremos conforme a la ley. Reportes de seguridad: [CONTACTO SEGURIDAD].'),
          p('11. Cambios a este aviso', H2),
          p(f'Publicaremos cada versión con su fecha. Si cambian las finalidades o los proveedores, te pediremos que vuelvas a elegir tu nivel de privacidad. Versión actual: {VERSION}, {DATE}.'),
          Spacer(1, 8),
          callout('Fuentes de referencia: https://www.spdp.gob.ec/marco-normativo/ · https://www.spdp.gob.ec/docs/proteccion-de-datos-personales/cuales-son-mis-derechos/', fill=colors.HexColor('#e8f6f8'), border=TURQ)]
    return s


# ───────────── Formulario rellenable ─────────────
class TextField(Flowable):
    """Campo AcroForm con su etiqueta: se rellena en pantalla o se imprime con línea en blanco."""

    def __init__(self, name: str, label: str, width: float, height: float = 8 * mm, multiline: bool = False):
        super().__init__()
        self.name, self.label, self.width, self.field_h, self.multiline = name, label, width, height, multiline
        self.height = height + 5 * mm

    def draw(self):
        c = self.canv
        c.setFont('Helvetica-Bold', 8.5)
        c.setFillColor(NAVY)
        c.drawString(0, self.field_h + 1.5 * mm, self.label)
        c.acroForm.textfield(name=self.name, tooltip=self.label, x=0, y=0, width=self.width, height=self.field_h,
                             borderColor=LINE, fillColor=colors.HexColor('#fbfaf6'), textColor=INK, borderWidth=0.8, forceBorder=True,
                             fontName='Helvetica', fontSize=9 if self.multiline else 10, relative=True,
                             fieldFlags='multiline' if self.multiline else '', maxlen=0 if self.multiline else 120)


class CheckField(Flowable):
    def __init__(self, name: str, text: str, width: float):
        super().__init__()
        self.name, self.width = name, width
        self.para = Paragraph(text, CELL)
        _, self.para_h = self.para.wrap(width - 9 * mm, 100 * mm)
        self.height = max(self.para_h, 5 * mm) + 2 * mm

    def draw(self):
        c = self.canv
        top = self.height - 1 * mm
        c.acroForm.checkbox(name=self.name, tooltip=self.name, x=0, y=top - 4.6 * mm, size=4.6 * mm, buttonStyle='check',
                            borderColor=NAVY, fillColor=colors.white, textColor=NAVY, borderWidth=0.9, forceBorder=True, relative=True)
        self.para.drawOn(c, 7 * mm, top - self.para_h)


def row(*cells: Flowable, gap: float = 6 * mm) -> Table:
    widths = [cell.width for cell in cells]
    spaced: list = []
    col_widths: list[float] = []
    for index, cell in enumerate(cells):
        if index:
            spaced.append('')
            col_widths.append(gap)
        spaced.append(cell)
        col_widths.append(widths[index])
    result = Table([spaced], colWidths=col_widths)
    result.setStyle(TableStyle([('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                                ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 3 * mm), ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    return result


def section(number: str, title: str) -> Table:
    badge = Table([[Paragraph(f'<font color="#012960"><b>{number}</b></font>', ParagraphStyle('n', parent=BASE, alignment=1)),
                    Paragraph(f'<b>{title}</b>', ParagraphStyle('t', parent=BASE, fontSize=11.5, textColor=NAVY))]], colWidths=[9 * mm, W - 9 * mm])
    badge.setStyle(TableStyle([('BACKGROUND', (0, 0), (0, 0), MAIZE), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                               ('LINEBELOW', (0, 0), (-1, 0), 1.2, NAVY), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    return badge


def form_story() -> list:
    half = (W - 6 * mm) / 2
    rights = [('access', 'Acceso'), ('rectification', 'Rectificación y actualización'), ('erasure', 'Eliminación'), ('objection', 'Oposición'),
              ('portability', 'Portabilidad'), ('restriction', 'Suspensión del tratamiento'),
              ('automated', 'No ser objeto de decisiones automatizadas'), ('withdraw', 'Retirar un consentimiento')]
    s: list = heading_block('Formulario de Solicitud de Ejercicio de Derechos',
                            'Protección de datos personales (LOPDP). Puedes llenarlo en tu computador o imprimirlo. También existe una versión en línea en https://chulla-vida.vercel.app.')
    s.append(callout('Envíalo firmado a <b>[CORREO DE PRIVACIDAD]</b> con una copia de tu documento de identidad (y del poder o documento que acredite la representación, si aplica). '
                     'El trámite es gratuito. Una cédula con dígito verificador correcto indica formato válido, no identidad verificada: la validación la hace una persona del equipo.'))
    s += [Spacer(1, 8), section('1', 'Datos de la persona titular'), Spacer(1, 4),
          TextField('nombres', 'Nombres y apellidos completos', W),
          row(TextField('documento_tipo', 'Tipo de documento (cédula / pasaporte)', half), TextField('documento_numero', 'Número de cédula o pasaporte', half)),
          row(TextField('correo', 'Correo electrónico para responderte', half), TextField('telefono', 'Teléfono (opcional)', half)),
          TextField('direccion', 'Dirección (opcional)', W),
          Spacer(1, 3 * mm), section('2', 'Representante (solo si aplica)'), Spacer(1, 4),
          row(TextField('representante_nombre', 'Nombres y apellidos del representante', half), TextField('representante_documento', 'Cédula o pasaporte del representante', half)),
          TextField('representante_calidad', 'Calidad en la que actúa (padre/madre, tutor, apoderado...)', W),
          Spacer(1, 3 * mm), KeepTogether([section('3', 'Derecho que ejerces (marca uno o varios)'), Spacer(1, 5),
                        row(*[CheckField(f'derecho_{key}', label, half) for key, label in rights[:2]]),
                        row(*[CheckField(f'derecho_{key}', label, half) for key, label in rights[2:4]]),
                        row(*[CheckField(f'derecho_{key}', label, half) for key, label in rights[4:6]]),
                        row(*[CheckField(f'derecho_{key}', label, half) for key, label in rights[6:8]])]),
          Spacer(1, 3 * mm), KeepTogether([section('4', 'Descripción de tu solicitud'), Spacer(1, 4),
                        TextField('descripcion', 'Qué necesitas y sobre qué datos (no incluyas contraseñas ni datos de salud)', W, height=34 * mm, multiline=True)]),
          TextField('adjuntos', 'Documentos que adjuntas', W, height=14 * mm, multiline=True),
          KeepTogether([section('5', 'Declaración y firma'), Spacer(1, 5),
                        CheckField('declaracion', 'Declaro que la información de este formulario es verdadera y que soy la persona titular de los datos o su representante debidamente autorizado.', W),
                        Spacer(1, 3),
                        row(TextField('firma', 'Firma', half, height=16 * mm), TextField('fecha', 'Fecha (dd/mm/aaaa)', half))]),
          Spacer(1, 4),
          KeepTogether([section('6', 'Para uso de CHULLA VIDA'), Spacer(1, 4),
                        table([['Campo', 'Registro'],
                               ['Fecha de recepción', ''], ['Número de solicitud', ''], ['Identidad validada por / método', ''],
                               ['Plazo de respuesta legal', '[PENDIENTE DE CONFIRMAR CON ASESORÍA]'], ['Fecha de respuesta', ''], ['Resultado y motivación', '']],
                              [62 * mm, W - 62 * mm])]),
          Spacer(1, 6),
          p('Autoridad de control: Superintendencia de Protección de Datos Personales (SPDP), https://www.spdp.gob.ec/. '
            'Responsable: [RAZÓN SOCIAL] · RUC [RUC] · [DOMICILIO].', SMALL)]
    return s


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    notice = OUT / 'aviso-proteccion-datos-chulla-vida.pdf'
    form = OUT / 'formulario-derechos-datos-chulla-vida.pdf'
    build(notice, 'Aviso de Protección de Datos Personales', notice_story(), 'Aviso de protección de datos personales (LOPDP) — borrador')
    build(form, 'Formulario de Ejercicio de Derechos', form_story(), 'Formulario de solicitud de ejercicio de derechos (LOPDP) — borrador')
    for path in (notice, form):
        print(f'{path.relative_to(ROOT)}  {path.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
