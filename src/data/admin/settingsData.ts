export interface ConfigGeneral {
  nombre: string;
  eslogan: string;
  colorPrimario: string;
  colorSecundario: string;
  idiomasActivos: string[];
  monedaPrincipal: string;
  zonaHoraria: string;
}

export const demoConfigGeneral: ConfigGeneral = {
  nombre: 'Psique Amor', eslogan: 'Tu bienestar emocional merece un espacio seguro.',
  colorPrimario: '#5b6bd6', colorSecundario: '#b78cf0',
  idiomasActivos: ['es', 'en'], monedaPrincipal: 'USD', zonaHoraria: 'America/Caracas',
};

export interface SeoPagina {
  id: string;
  pagina: string;
  slug: string;
  metaTitulo: string;
  metaDescripcion: string;
  keywords: string;
}

export const demoSeoPaginas: SeoPagina[] = [
  { id: 'seo1', pagina: 'Inicio', slug: '/', metaTitulo: 'Psique Amor — Terapia psicológica online y presencial', metaDescripcion: 'Acompañamiento psicológico profesional, humano y confidencial. Agenda tu cita hoy mismo.', keywords: 'psicología, terapia online, terapia de pareja' },
  { id: 'seo2', pagina: 'Servicios', slug: '/servicios', metaTitulo: 'Servicios de terapia — Psique Amor', metaDescripcion: 'Terapia individual, de pareja y familiar adaptada a tus necesidades emocionales.', keywords: 'terapia individual, terapia familiar, terapia de pareja' },
  { id: 'seo3', pagina: 'Cursos', slug: '/cursos', metaTitulo: 'Cursos de bienestar emocional — Psique Amor', metaDescripcion: 'Aprende herramientas prácticas para tu bienestar con nuestros cursos en línea.', keywords: 'cursos bienestar, salud mental, ansiedad' },
];

export interface PwaConfig {
  appName: string;
  shortName: string;
  themeColor: string;
  splashColor: string;
  offlineMode: boolean;
}

export const demoPwaConfig: PwaConfig = {
  appName: 'Psique Amor — Panel', shortName: 'PsiqueAmor', themeColor: '#5b6bd6', splashColor: '#f4f1fb', offlineMode: true,
};

export interface AuditLogEntry {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  tipo: 'Creación' | 'Edición' | 'Eliminación' | 'Acceso' | 'Seguridad';
  detalle: string;
}

export const demoAuditLog: AuditLogEntry[] = [
  { id: 'al1', fecha: '2026-08-12 09:14', usuario: 'Jennesse Villalobos', accion: 'Verificó un pago', tipo: 'Edición', detalle: 'Pago pg5 · Ana Torres · USD 40' },
  { id: 'al2', fecha: '2026-08-12 08:50', usuario: 'Jennesse Villalobos', accion: 'Inició sesión', tipo: 'Acceso', detalle: 'Cuenta demo · Chrome / Windows' },
  { id: 'al3', fecha: '2026-08-11 18:22', usuario: 'Sistema', accion: 'Copia de seguridad automática', tipo: 'Seguridad', detalle: 'Backup diario completado sin errores' },
  { id: 'al4', fecha: '2026-08-11 16:05', usuario: 'Jennesse Villalobos', accion: 'Editó un profesional', tipo: 'Edición', detalle: 'Lic. Sofía Herrera · disponibilidad actualizada' },
  { id: 'al5', fecha: '2026-08-10 11:40', usuario: 'Jennesse Villalobos', accion: 'Creó una regla de notificación', tipo: 'Creación', detalle: 'Aviso de cuota vencida · canal Email' },
  { id: 'al6', fecha: '2026-08-09 14:12', usuario: 'Jennesse Villalobos', accion: 'Bloqueó un usuario', tipo: 'Seguridad', detalle: 'Roberto Salas · motivo: pagos vencidos reiterados' },
  { id: 'al7', fecha: '2026-08-08 10:00', usuario: 'Jennesse Villalobos', accion: 'Eliminó un producto digital', tipo: 'Eliminación', detalle: 'Guía descontinuada · Vol. 0' },
];

export interface SesionActiva {
  id: string;
  dispositivo: string;
  ubicacion: string;
  ultimaActividad: string;
  actual: boolean;
}

export const demoSesiones: SesionActiva[] = [
  { id: 'ss1', dispositivo: 'Chrome · Windows', ubicacion: 'Caracas, Venezuela', ultimaActividad: 'Ahora', actual: true },
  { id: 'ss2', dispositivo: 'Safari · iPhone', ubicacion: 'Caracas, Venezuela', ultimaActividad: 'Hace 2 horas', actual: false },
  { id: 'ss3', dispositivo: 'Chrome · macOS', ubicacion: 'Bogotá, Colombia', ultimaActividad: 'Hace 3 días', actual: false },
];
