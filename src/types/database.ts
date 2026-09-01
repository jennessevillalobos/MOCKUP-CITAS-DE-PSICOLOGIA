// Generado desde la introspección real de Supabase (esquemas.csv) y las
// migraciones del equipo (supabase/migrations/*.sql).
//
// Para regenerarlo después de cambios en la base de datos:
//   npx supabase gen types typescript --project-id xoniondtjsrwwaxvnssb > src/types/database.ts
//
// ¡Atención! El CSV recibido está truncado (faltan columnas de modulos,
// monedas, opciones, profesionales, progreso, roles, servicios, etc.).
// Los tipos de las tablas incompletas se completaron desde las migraciones
// SQL del repositorio. Ejecutá `npx supabase gen types` cuando tengas la
// CLI autenticada para reemplazar este archivo por la versión oficial.

export interface Database {
  public: {
    Tables: {
      calificaciones: {
        Row: {
          id: number;
          cita_id: string | null;
          usuario_id: string | null;
          profesional_id: number | null;
          servicio_id: number | null;
          nota_profesional: number | null;
          nota_servicio: number | null;
          comentario: string | null;
          estado: string | null;
          fecha: string | null;
        };
        Insert: {
          cita_id?: string | null;
          usuario_id?: string | null;
          profesional_id?: number | null;
          servicio_id?: number | null;
          nota_profesional?: number | null;
          nota_servicio?: number | null;
          comentario?: string | null;
          estado?: string | null;
          fecha?: string | null;
        };
        Update: {
          cita_id?: string | null;
          usuario_id?: string | null;
          profesional_id?: number | null;
          servicio_id?: number | null;
          nota_profesional?: number | null;
          nota_servicio?: number | null;
          comentario?: string | null;
          estado?: string | null;
          fecha?: string | null;
        };
      };
      citas: {
        Row: {
          id: string;
          usuario_id: string | null;
          servicio_id: number | null;
          profesional_id: number | null;
          lugar_id: number | null;
          modalidad_id: number | null;
          fecha: string;
          hora: string;
          duracion_minutos: number;
          precio_total: number;
          moneda: string | null;
          monto_abonado: number | null;
          saldo_pendiente: number;
          estado: string | null;
          observaciones: string | null;
          fecha_creacion: string | null;
        };
        Insert: {
          id?: string;
          usuario_id?: string | null;
          servicio_id?: number | null;
          profesional_id?: number | null;
          lugar_id?: number | null;
          modalidad_id?: number | null;
          fecha: string;
          hora: string;
          duracion_minutos: number;
          precio_total: number;
          moneda?: string | null;
          monto_abonado?: number | null;
          saldo_pendiente: number;
          estado?: string | null;
          observaciones?: string | null;
          fecha_creacion?: string | null;
        };
        Update: {
          usuario_id?: string | null;
          servicio_id?: number | null;
          profesional_id?: number | null;
          lugar_id?: number | null;
          modalidad_id?: number | null;
          fecha?: string;
          hora?: string;
          duracion_minutos?: number;
          precio_total?: number;
          moneda?: string | null;
          monto_abonado?: number | null;
          saldo_pendiente?: number;
          estado?: string | null;
          observaciones?: string | null;
          fecha_creacion?: string | null;
        };
      };
      clases: {
        Row: {
          id: number;
          modulo_id: number | null;
          titulo: string;
          descripcion: string | null;
          texto_formativo: string | null;
          video_url: string | null;
          duracion_segundos: number | null;
          orden: number | null;
          estado: string | null;
        };
        Insert: {
          modulo_id?: number | null;
          titulo: string;
          descripcion?: string | null;
          texto_formativo?: string | null;
          video_url?: string | null;
          duracion_segundos?: number | null;
          orden?: number | null;
          estado?: string | null;
        };
        Update: {
          modulo_id?: number | null;
          titulo?: string;
          descripcion?: string | null;
          texto_formativo?: string | null;
          video_url?: string | null;
          duracion_segundos?: number | null;
          orden?: number | null;
          estado?: string | null;
        };
      };
      compras_digitales: {
        Row: {
          id: number;
          usuario_id: string | null;
          producto_id: number | null;
          pago_id: string | null;
          fecha: string | null;
        };
        Insert: {
          usuario_id?: string | null;
          producto_id?: number | null;
          pago_id?: string | null;
          fecha?: string | null;
        };
        Update: {
          usuario_id?: string | null;
          producto_id?: number | null;
          pago_id?: string | null;
          fecha?: string | null;
        };
      };
      cursos: {
        Row: {
          id: number;
          nombre: string;
          slug: string;
          imagen: string | null;
          descripcion: string | null;
          precio: number;
          moneda: string | null;
          fecha_inicio: string | null;
          fecha_fin: string | null;
          estado: string | null;
        };
        Insert: {
          nombre: string;
          slug: string;
          imagen?: string | null;
          descripcion?: string | null;
          precio: number;
          moneda?: string | null;
          fecha_inicio?: string | null;
          fecha_fin?: string | null;
          estado?: string | null;
        };
        Update: {
          nombre?: string;
          slug?: string;
          imagen?: string | null;
          descripcion?: string | null;
          precio?: number;
          moneda?: string | null;
          fecha_inicio?: string | null;
          fecha_fin?: string | null;
          estado?: string | null;
        };
      };
      enlaces_descarga: {
        Row: {
          id: string;
          compra_id: number | null;
          token: string;
          vencimiento: string;
          descargas_max: number | null;
          descargas_realizadas: number | null;
        };
        Insert: {
          id?: string;
          compra_id?: number | null;
          token: string;
          vencimiento: string;
          descargas_max?: number | null;
          descargas_realizadas?: number | null;
        };
        Update: {
          compra_id?: number | null;
          token?: string;
          vencimiento?: string;
          descargas_max?: number | null;
          descargas_realizadas?: number | null;
        };
      };
      evaluaciones: {
        Row: {
          id: number;
          curso_id: number | null;
          modulo_id: number | null;
          tipo: string | null;
          tiempo_limite_minutos: number | null;
          nota_minima: number;
          intentos_max: number | null;
        };
        Insert: {
          curso_id?: number | null;
          modulo_id?: number | null;
          tipo?: string | null;
          tiempo_limite_minutos?: number | null;
          nota_minima?: number;
          intentos_max?: number | null;
        };
        Update: {
          curso_id?: number | null;
          modulo_id?: number | null;
          tipo?: string | null;
          tiempo_limite_minutos?: number | null;
          nota_minima?: number;
          intentos_max?: number | null;
        };
      };
      excepciones_horario: {
        Row: {
          id: number;
          profesional_id: number | null;
          fecha: string;
          tipo: string | null;
          hora_inicio: string | null;
          hora_fin: string | null;
        };
        Insert: {
          profesional_id?: number | null;
          fecha: string;
          tipo?: string | null;
          hora_inicio?: string | null;
          hora_fin?: string | null;
        };
        Update: {
          profesional_id?: number | null;
          fecha?: string;
          tipo?: string | null;
          hora_inicio?: string | null;
          hora_fin?: string | null;
        };
      };
      horarios: {
        Row: {
          id: number;
          profesional_id: number | null;
          dia_semana: number | null;
          hora_inicio: string;
          hora_fin: string;
          lugar_id: number | null;
          modalidad_id: number | null;
        };
        Insert: {
          profesional_id?: number | null;
          dia_semana?: number | null;
          hora_inicio: string;
          hora_fin: string;
          lugar_id?: number | null;
          modalidad_id?: number | null;
        };
        Update: {
          profesional_id?: number | null;
          dia_semana?: number | null;
          hora_inicio?: string;
          hora_fin?: string;
          lugar_id?: number | null;
          modalidad_id?: number | null;
        };
      };
      inscripciones: {
        Row: {
          id: number;
          usuario_id: string | null;
          curso_id: number | null;
          tipo_acceso: string | null;
          estado: string | null;
          fecha_inicio: string | null;
          fecha_fin: string | null;
        };
        Insert: {
          usuario_id?: string | null;
          curso_id?: number | null;
          tipo_acceso?: string | null;
          estado?: string | null;
          fecha_inicio?: string | null;
          fecha_fin?: string | null;
        };
        Update: {
          usuario_id?: string | null;
          curso_id?: number | null;
          tipo_acceso?: string | null;
          estado?: string | null;
          fecha_inicio?: string | null;
          fecha_fin?: string | null;
        };
      };
      intentos_evaluacion: {
        Row: {
          id: number;
          evaluacion_id: number | null;
          usuario_id: string | null;
          nota: number;
          aprobado: boolean | null;
          fecha: string | null;
        };
        Insert: {
          evaluacion_id?: number | null;
          usuario_id?: string | null;
          nota: number;
          aprobado?: boolean | null;
          fecha?: string | null;
        };
        Update: {
          evaluacion_id?: number | null;
          usuario_id?: string | null;
          nota?: number;
          aprobado?: boolean | null;
          fecha?: string | null;
        };
      };
      lugares: {
        Row: {
          id: number;
          nombre: string;
          direccion: string | null;
          ciudad: string | null;
          mapa_url: string | null;
          contacto: string | null;
          estado: string | null;
        };
        Insert: {
          nombre: string;
          direccion?: string | null;
          ciudad?: string | null;
          mapa_url?: string | null;
          contacto?: string | null;
          estado?: string | null;
        };
        Update: {
          nombre?: string;
          direccion?: string | null;
          ciudad?: string | null;
          mapa_url?: string | null;
          contacto?: string | null;
          estado?: string | null;
        };
      };
      modalidades: {
        Row: {
          id: number;
          nombre: string;
        };
        Insert: {
          nombre: string;
        };
        Update: {
          nombre?: string;
        };
      };
      // Completado desde migraciones SQL (faltante en CSV)
      modulos: {
        Row: {
          id: number;
          curso_id: number | null;
          titulo: string;
          descripcion: string | null;
          orden: number | null;
          estado: string | null;
        };
        Insert: {
          curso_id?: number | null;
          titulo: string;
          descripcion?: string | null;
          orden?: number | null;
          estado?: string | null;
        };
        Update: {
          curso_id?: number | null;
          titulo?: string;
          descripcion?: string | null;
          orden?: number | null;
          estado?: string | null;
        };
      };
      // Desde migraciones SQL
      monedas: {
        Row: {
          codigo: string;
          nombre: string;
          simbolo: string;
          es_principal: boolean | null;
          estado: string | null;
        };
        Insert: {
          codigo: string;
          nombre: string;
          simbolo: string;
          es_principal?: boolean | null;
          estado?: string | null;
        };
        Update: {
          codigo?: string;
          nombre?: string;
          simbolo?: string;
          es_principal?: boolean | null;
          estado?: string | null;
        };
      };
      opciones: {
        Row: {
          id: number;
          pregunta_id: number | null;
          texto: string;
          es_correcta: boolean | null;
          orden: number | null;
        };
        Insert: {
          pregunta_id?: number | null;
          texto: string;
          es_correcta?: boolean | null;
          orden?: number | null;
        };
        Update: {
          pregunta_id?: number | null;
          texto?: string;
          es_correcta?: boolean | null;
          orden?: number | null;
        };
      };
      ordenes: {
        Row: {
          id: string;
          usuario_id: string | null;
          concepto: string;
          tipo_producto: string | null;
          producto_id: string;
          monto: number;
          moneda: string | null;
          tasa_aplicada: number | null;
          monto_convertido: number | null;
          estado: string | null;
          fecha_creacion: string | null;
        };
        Insert: {
          id?: string;
          usuario_id?: string | null;
          concepto: string;
          tipo_producto?: string | null;
          producto_id: string;
          monto: number;
          moneda?: string | null;
          tasa_aplicada?: number | null;
          monto_convertido?: number | null;
          estado?: string | null;
          fecha_creacion?: string | null;
        };
        Update: {
          usuario_id?: string | null;
          concepto?: string;
          tipo_producto?: string | null;
          producto_id?: string;
          monto?: number;
          moneda?: string | null;
          tasa_aplicada?: number | null;
          monto_convertido?: number | null;
          estado?: string | null;
          fecha_creacion?: string | null;
        };
      };
      pagos: {
        Row: {
          id: string;
          orden_id: string | null;
          monto: number;
          moneda: string | null;
          metodo: string | null;
          referencia: string | null;
          comprobante_url: string | null;
          estado: string | null;
          fecha: string | null;
        };
        Insert: {
          id?: string;
          orden_id?: string | null;
          monto: number;
          moneda?: string | null;
          metodo?: string | null;
          referencia?: string | null;
          comprobante_url?: string | null;
          estado?: string | null;
          fecha?: string | null;
        };
        Update: {
          orden_id?: string | null;
          monto?: number;
          moneda?: string | null;
          metodo?: string | null;
          referencia?: string | null;
          comprobante_url?: string | null;
          estado?: string | null;
          fecha?: string | null;
        };
      };
      preguntas: {
        Row: {
          id: number;
          evaluacion_id: number | null;
          texto: string;
          tipo: string | null;
          orden: number | null;
        };
        Insert: {
          evaluacion_id?: number | null;
          texto: string;
          tipo?: string | null;
          orden?: number | null;
        };
        Update: {
          evaluacion_id?: number | null;
          texto?: string;
          tipo?: string | null;
          orden?: number | null;
        };
      };
      productos_digitales: {
        Row: {
          id: number;
          tipo: string | null;
          titulo: string;
          slug: string;
          portada: string | null;
          descripcion: string | null;
          precio: number;
          moneda: string | null;
          archivo_url: string | null;
          estado: string | null;
        };
        Insert: {
          tipo?: string | null;
          titulo: string;
          slug: string;
          portada?: string | null;
          descripcion?: string | null;
          precio: number;
          moneda?: string | null;
          archivo_url?: string | null;
          estado?: string | null;
        };
        Update: {
          tipo?: string | null;
          titulo?: string;
          slug?: string;
          portada?: string | null;
          descripcion?: string | null;
          precio?: number;
          moneda?: string | null;
          archivo_url?: string | null;
          estado?: string | null;
        };
      };
      profesional_lugar: {
        Row: {
          profesional_id: number;
          lugar_id: number;
        };
        Insert: {
          profesional_id: number;
          lugar_id: number;
        };
        Update: {
          profesional_id?: number;
          lugar_id?: number;
        };
      };
      profesional_servicio: {
        Row: {
          profesional_id: number;
          servicio_id: number;
        };
        Insert: {
          profesional_id: number;
          servicio_id: number;
        };
        Update: {
          profesional_id?: number;
          servicio_id?: number;
        };
      };
      profesionales: {
        Row: {
          id: number;
          usuario_id: string | null;
          especialidad: string | null;
          descripcion: string | null;
          estado: string | null;
        };
        Insert: {
          usuario_id?: string | null;
          especialidad?: string | null;
          descripcion?: string | null;
          estado?: string | null;
        };
        Update: {
          usuario_id?: string | null;
          especialidad?: string | null;
          descripcion?: string | null;
          estado?: string | null;
        };
      };
      progreso: {
        Row: {
          id: number;
          usuario_id: string | null;
          clase_id: number | null;
          segundo_actual: number | null;
          porcentaje: number | null;
          completado: boolean | null;
          fecha_actualizacion: string | null;
        };
        Insert: {
          usuario_id?: string | null;
          clase_id?: number | null;
          segundo_actual?: number | null;
          porcentaje?: number | null;
          completado?: boolean | null;
          fecha_actualizacion?: string | null;
        };
        Update: {
          usuario_id?: string | null;
          clase_id?: number | null;
          segundo_actual?: number | null;
          porcentaje?: number | null;
          completado?: boolean | null;
          fecha_actualizacion?: string | null;
        };
      };
      reembolsos: {
        Row: {
          id: number;
          pago_id: string | null;
          monto: number;
          motivo: string | null;
          estado: string | null;
          fecha: string | null;
        };
        Insert: {
          pago_id?: string | null;
          monto: number;
          motivo?: string | null;
          estado?: string | null;
          fecha?: string | null;
        };
        Update: {
          pago_id?: string | null;
          monto?: number;
          motivo?: string | null;
          estado?: string | null;
          fecha?: string | null;
        };
      };
      roles: {
        Row: {
          id: number;
          nombre: string;
        };
        Insert: {
          nombre: string;
        };
        Update: {
          nombre?: string;
        };
      };
      servicio_modalidad: {
        Row: {
          id: number;
          servicio_id: number | null;
          modalidad_id: number | null;
          duracion_minutos: number;
          precio: number;
          moneda: string | null;
        };
        Insert: {
          servicio_id?: number | null;
          modalidad_id?: number | null;
          duracion_minutos: number;
          precio: number;
          moneda?: string | null;
        };
        Update: {
          servicio_id?: number | null;
          modalidad_id?: number | null;
          duracion_minutos?: number;
          precio?: number;
          moneda?: string | null;
        };
      };
      servicios: {
        Row: {
          id: number;
          nombre: string;
          categoria: string | null;
          descripcion: string | null;
          slug: string;
          imagen: string | null;
          estado: string | null;
        };
        Insert: {
          nombre: string;
          categoria?: string | null;
          descripcion?: string | null;
          slug: string;
          imagen?: string | null;
          estado?: string | null;
        };
        Update: {
          nombre?: string;
          categoria?: string | null;
          descripcion?: string | null;
          slug?: string;
          imagen?: string | null;
          estado?: string | null;
        };
      };
      tasas_cambio: {
        Row: {
          id: number;
          moneda_origen: string | null;
          moneda_destino: string | null;
          tasa: number;
          fecha: string | null;
        };
        Insert: {
          moneda_origen?: string | null;
          moneda_destino?: string | null;
          tasa: number;
          fecha?: string | null;
        };
        Update: {
          moneda_origen?: string | null;
          moneda_destino?: string | null;
          tasa?: number;
          fecha?: string | null;
        };
      };
      usuario_roles: {
        Row: {
          usuario_id: string;
          rol_id: number;
        };
        Insert: {
          usuario_id: string;
          rol_id: number;
        };
        Update: {
          usuario_id?: string;
          rol_id?: number;
        };
      };
      usuarios: {
        Row: {
          id: string;
          email: string;
          nombre: string | null;
          telefono: string | null;
          foto: string | null;
          idioma: string | null;
          estado: string | null;
          fecha_creacion: string | null;
          ultimo_acceso: string | null;
        };
        Insert: {
          id: string;
          email: string;
          nombre?: string | null;
          telefono?: string | null;
          foto?: string | null;
          idioma?: string | null;
          estado?: string | null;
          fecha_creacion?: string | null;
          ultimo_acceso?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          nombre?: string | null;
          telefono?: string | null;
          foto?: string | null;
          idioma?: string | null;
          estado?: string | null;
          fecha_creacion?: string | null;
          ultimo_acceso?: string | null;
        };
      };
    };
  };
}