export type Role = 'turista' | 'local' | 'aliado' | 'gad' | 'gestor';

export type AppTab = 'feed' | 'raymis' | 'chat' | 'host' | 'gad' | 'vouchers' | 'saved' | 'help';

export type Language = 'es' | 'en' | 'fr' | 'pt' | 'zh' | 'ki' | 'ki-amz';

export type Region = 'Sierra' | 'Costa' | 'Amazonía' | 'Galápagos';

export type AdventureLevel = 'Tranqui' | 'Moderado' | 'Adrenalina';

export interface AndeanSeals {
  bueno: number; // Bueno (acogida, guianza nativa)
  bonito: number; // Bonito (paisaje, cultura viva)
  barato: number; // Barato (precio justo sin abusos)
  seguro: boolean; // Seguro (comunidad organizada y segura)
  votos_totales: number;
  verificado_gad: boolean;
}

export interface PlaceReview {
  id: string;
  usuario_nombre: string;
  avatar_url: string;
  fecha: string;
  comentario: string;
  foto_url?: string;
  sellos_otorgados: {
    bueno: boolean;
    bonito: boolean;
    barato: boolean;
    seguro: boolean;
  };
}

export interface Place {
  id: string;
  slug: string;
  titulo: string;
  comunidad_nombre: string;
  region: Region;
  provincia: string;
  canton_parroquia: string;
  descripcion_corta: string;
  historia_ancestral: string;
  datos_curiosos: string[];
  clima: string;
  altitud: string;
  mejor_epoca: string;
  precio_base_pp: number; // USD por persona
  duracion_dias: number;
  cupos_disponibles_dia: number;
  nivel_aventura: AdventureLevel;
  imagenes: string[];
  etiquetas: string[];
  que_incluye: string[];
  que_no_incluye: string[]; // Extras opcionales en efectivo
  recomendaciones_eco: string[];
  sellos: AndeanSeals;
  es_destacado: boolean; // Plan pagado visible
  etiqueta_plan_pagado?: string;
  contacto_whatsapp: string;
  telefono_llamadas: string;
  preguntas_frecuentes: { pregunta: string; respuesta: string }[];
  cooperativa_pago: {
    nombre_banco: string;
    tipo_cuenta: string;
    numero_cuenta: string;
    titular: string;
  };
  reviews: PlaceReview[];
}

export interface Raymi {
  id: string;
  nombre: string;
  nombre_kichwa: string;
  region: Region;
  provincia: string;
  canton: string;
  fecha_celebracion: string;
  proxima_fecha: string;
  significado_ancestral: string;
  historia_origen: string;
  protocolo_respeto: string[];
  imagen_url: string;
  elementos_rituales: string[];
}

export type ReservationStatus = 
  | 'pendiente' 
  | 'confirmado'
  | 'pagado' 
  | 'validado_en_sitio' 
  | 'liquidado_al_local' 
  | 'completado' 
  | 'cancelado';

export type DemoPaymentStatus = 'aprobado' | 'pendiente';

export interface Reservation {
  id: string;
  codigo_voucher: string;
  lugar_id: string;
  lugar_titulo: string;
  comunidad_nombre: string;
  turista_nombre: string;
  turista_email: string;
  turista_telefono: string;
  fecha_tour: string;
  cantidad_personas: number;
  precio_total: number;
  monto_comunidad_90: number;
  comision_plataforma_10: number;
  extras_seleccionados: { nombre: string; precio: number }[];
  estado: ReservationStatus;
  metodo_pago: 'tarjeta' | 'transferencia' | 'deuna';
  qr_data: string;
  pagado_en: string;
  pago_demo?: { estado: DemoPaymentStatus; referencia: string; creado_en: string };
  validado_en?: string;
  liquidado_en?: string;
  notificacion_whatsapp_enviada: boolean;
  telefono_notificado: string;
}

export interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  rol: Role;
  avatar_url: string;
  bio: string;
  origen: string;
}

export interface OnboardingPreferences {
  pasiones: string[];
  presupuesto_max: number;
  tipo_gasto: 'mochilero' | 'equilibrado' | 'experiencias';
  dias_disponibles: number;
  cantidad_personas: number;
  region_preferida: Region | 'Todas';
  nivel_aventura: AdventureLevel | 'Todas';
  completado: boolean;
  origen?: string;
  distancia_max?: number;
}

export interface ChatMessage {
  id: string;
  canal: string; // ej: '#sierra', '#amazonia', '#costa', '#panas-de-ruta'
  usuario_id: string;
  usuario_nombre: string;
  avatar_url: string;
  origen: string;
  mensaje: string;
  timestamp: string;
}

export interface PartnerDiscount {
  id: string;
  aliado_nombre: string;
  categoria: string;
  descuento: string;
  descripcion: string;
  codigo_cupon: string;
  valido_hasta: string;
  icono: string;
}

export interface SettlementRecord {
  id: string;
  reserva_id: string;
  codigo_voucher: string;
  comunidad_nombre: string;
  banco_cooperativa: string;
  monto: number;
  fecha: string;
  estado: 'transferido' | 'confirmado';
  numero_comprobante: string;
}
