// Edge Function: get-available-slots
//
// Calcula los horarios disponibles para un profesional en un rango de fechas.
// Toma en cuenta los horarios recurrentes, las excepciones (vacaciones, bloqueos)
// y las citas ya reservadas.

import { handleOptions } from '../_shared/cors.ts';
import { jsonOk, jsonError, generateRequestId, readJson } from '../_shared/http.ts';
import { createServiceClient } from '../_shared/auth.ts';

interface SlotsInput {
  profesional_id: number;
  servicio_id: number;
  modalidad_id: number;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;    // YYYY-MM-DD
}

interface Slot {
  fecha: string;
  hora: string;
  duracion_minutos: number;
}

const toMins = (h: string) => parseInt(h.slice(0, 2)) * 60 + parseInt(h.slice(3, 5));
const toStr = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const requestId = generateRequestId();
  if (req.method !== 'POST') return jsonError('method_not_allowed', 'Solo se permite POST.', 405, requestId);

  // No requerimos autenticación estricta (puede ser público para ver horarios)
  // pero sí usamos el payload para los filtros.
  
  const body = await readJson<SlotsInput>(req);
  if (!body?.profesional_id || !body?.servicio_id || !body?.modalidad_id || !body?.fecha_inicio || !body?.fecha_fin) {
    return jsonError('invalid_payload', 'Faltan campos obligatorios.', 422, requestId);
  }

  const { profesional_id, servicio_id, modalidad_id, fecha_inicio, fecha_fin } = body;

  const serviceClient = createServiceClient();

  // 1. Obtener la duración del servicio
  const { data: svcMod, error: svcError } = await serviceClient
    .from('servicio_modalidad')
    .select('duracion_minutos')
    .eq('servicio_id', servicio_id)
    .eq('modalidad_id', modalidad_id)
    .maybeSingle();

  if (svcError || !svcMod) return jsonError('service_not_found', 'Servicio/Modalidad no encontrado.', 404, requestId);
  const duracion = svcMod.duracion_minutos;

  // 2. Obtener horarios recurrentes
  const { data: horarios, error: horError } = await serviceClient
    .from('horarios')
    .select('*')
    .eq('profesional_id', profesional_id);

  if (horError) return jsonError('db_error', 'Error leyendo horarios.', 500, requestId);

  // 3. Obtener excepciones en el rango
  const { data: excepciones, error: excError } = await serviceClient
    .from('excepciones_horario')
    .select('*')
    .eq('profesional_id', profesional_id)
    .gte('fecha', fecha_inicio)
    .lte('fecha', fecha_fin);

  if (excError) return jsonError('db_error', 'Error leyendo excepciones.', 500, requestId);

  // 4. Limpiar bloqueos expirados y obtener bloqueos activos en el rango
  await serviceClient.rpc('limpiar_bloqueos_expirados');

  const { data: bloqueos, error: blqError } = await serviceClient
    .from('bloqueos_temporales')
    .select('fecha, hora, duracion_minutos')
    .eq('profesional_id', profesional_id)
    .gte('fecha', fecha_inicio)
    .lte('fecha', fecha_fin)
    .gte('expira_en', new Date().toISOString());

  if (blqError) return jsonError('db_error', 'Error leyendo bloqueos temporales.', 500, requestId);

  // 5. Obtener citas confirmadas/pendientes en el rango
  const { data: citas, error: citasError } = await serviceClient
    .from('citas')
    .select('fecha, hora, duracion_minutos')
    .eq('profesional_id', profesional_id)
    .gte('fecha', fecha_inicio)
    .lte('fecha', fecha_fin)
    .in('estado', ['pendiente_pago', 'parcialmente_pagada', 'confirmada']);

  if (citasError) return jsonError('db_error', 'Error leyendo citas.', 500, requestId);

  // 6. Generar slots
  const slots: Slot[] = [];
  
  // Recorrer día por día usando manipulación básica de strings/fechas para evitar bugs de zona horaria
  let currentDate = new Date(`${fecha_inicio}T12:00:00Z`);
  const endDate = new Date(`${fecha_fin}T12:00:00Z`);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().slice(0, 10);
    const diaSemana = currentDate.getUTCDay();

    // Ver si hay excepción de día completo (sin hora_inicio/fin o tipo vacacion)
    const excsDelDia = (excepciones || []).filter(e => e.fecha === dateStr);
    const fullDayBlock = excsDelDia.find(e => !e.hora_inicio || e.tipo === 'vacacion');

    if (!fullDayBlock) {
      // Filtrar los horarios de este día de la semana
      const horariosDelDia = (horarios || []).filter(h => h.dia_semana === diaSemana);
      const citasDelDia = (citas || []).filter(c => c.fecha === dateStr);
      const bloqueosDelDia = (bloqueos || []).filter(b => b.fecha === dateStr);
      
      for (const horario of horariosDelDia) {
        let currentMin = toMins(horario.hora_inicio);
        const endMin = toMins(horario.hora_fin);

        while (currentMin + duracion <= endMin) {
          const slotStart = currentMin;
          const slotEnd = currentMin + duracion;

          // Chequear colisiones con excepciones parciales
          const blockedByExc = excsDelDia.some(e => {
            if (!e.hora_inicio || !e.hora_fin) return true;
            const eStart = toMins(e.hora_inicio);
            const eEnd = toMins(e.hora_fin);
            return (slotStart < eEnd && slotEnd > eStart);
          });

          // Chequear colisiones con citas ya confirmadas/pendientes
          const blockedByCita = citasDelDia.some(c => {
            const cStart = toMins(c.hora);
            const cEnd = cStart + c.duracion_minutos;
            return (slotStart < cEnd && slotEnd > cStart);
          });

          // Chequear colisiones con bloqueos temporales activos
          const blockedByHold = bloqueosDelDia.some(b => {
            const bStart = toMins(b.hora);
            const bEnd = bStart + b.duracion_minutos;
            return (slotStart < bEnd && slotEnd > bStart);
          });

          if (!blockedByExc && !blockedByCita && !blockedByHold) {
            slots.push({
              fecha: dateStr,
              hora: toStr(slotStart),
              duracion_minutos: duracion
            });
          }

          // Avanzar el slot según la duración del servicio
          currentMin += duracion;
        }
      }
    }
    
    // Avanzar un día
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return jsonOk({ slots }, 200, requestId);
});
