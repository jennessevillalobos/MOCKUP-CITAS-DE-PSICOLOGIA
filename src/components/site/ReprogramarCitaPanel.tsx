import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import { getAvailableSlots, rescheduleAppointment } from '@/lib/api/edgeFunctions';
import type { CitaPaciente } from '@/data/patientPortalData';

// Reprogramar una cita real del paciente: muestra los días y horas libres del
// mismo profesional/servicio/modalidad (get-available-slots) y confirma con
// reschedule-appointment (24 h de anticipación, máximo 2 cambios).

const MAX_REPROGRAMACIONES = 2;

const text = {
  es: {
    titulo: 'Elige la nueva fecha y hora',
    cargando: 'Consultando la agenda…',
    sinCupos: 'No hay horarios libres ese día.',
    restantes: (n: number) => (n === 1 ? 'Te queda 1 cambio para esta cita.' : `Te quedan ${n} cambios para esta cita.`),
    sinCambios: 'Esta cita ya se reprogramó el máximo de veces permitido.',
    confirmar: 'Confirmar nuevo horario',
    cancelar: 'Cancelar',
  },
  en: {
    titulo: 'Pick the new date and time',
    cargando: 'Checking the schedule…',
    sinCupos: 'No free slots that day.',
    restantes: (n: number) => `You have ${n} ${n === 1 ? 'change' : 'changes'} left for this appointment.`,
    sinCambios: 'This appointment was already rescheduled the maximum number of times.',
    confirmar: 'Confirm new time',
    cancelar: 'Cancel',
  },
} as const;

function fechaLocalISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function proximosDias(cantidad: number) {
  const dias: string[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1);
  while (dias.length < cantidad) {
    dias.push(fechaLocalISO(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

export default function ReprogramarCitaPanel({
  cita,
  language,
  onListo,
  onCerrar,
}: {
  cita: CitaPaciente;
  language: 'es' | 'en';
  onListo: (mensaje: string) => void;
  onCerrar: () => void;
}) {
  const t = text[language];
  const dias = useMemo(() => proximosDias(21), []);
  const [slots, setSlots] = useState<Record<string, string[]> | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restantes = MAX_REPROGRAMACIONES - (cita.reprogramaciones ?? 0);

  useEffect(() => {
    if (!cita.profesionalId || !cita.servicioId || !cita.modalidadId) return;
    let cancelado = false;
    getAvailableSlots({
      profesional_id: cita.profesionalId,
      servicio_id: cita.servicioId,
      modalidad_id: cita.modalidadId,
      fecha_inicio: dias[0],
      fecha_fin: dias[dias.length - 1],
    }).then((res) => {
      if (cancelado) return;
      if (res.error) {
        setError(res.error.message);
        setSlots({});
        return;
      }
      const porDia: Record<string, string[]> = {};
      for (const s of res.data.slots) porDia[s.fecha] = [...(porDia[s.fecha] ?? []), s.hora];
      setSlots(porDia);
      setFecha(dias.find((d) => porDia[d]?.length) ?? null);
    });
    return () => { cancelado = true; };
  }, [cita.profesionalId, cita.servicioId, cita.modalidadId, dias]);

  async function confirmar() {
    if (!cita.id || !fecha || !hora) return;
    setEnviando(true);
    setError(null);
    const res = await rescheduleAppointment(cita.id, fecha, hora);
    setEnviando(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    onListo(res.data.mensaje);
  }

  const etiquetaDia = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { weekday: 'short', day: 'numeric' });

  return (
    <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
      <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink"><CalendarClock size={16} className="text-brand-600" /> {t.titulo}</p>
      <p className="mb-3 text-xs text-ink/50">{restantes > 0 ? t.restantes(restantes) : t.sinCambios}</p>

      {restantes > 0 && (
        <>
          {slots === null ? (
            <p className="flex items-center gap-2 text-xs text-ink/50"><Loader2 size={14} className="animate-spin" /> {t.cargando}</p>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {dias.map((d) => {
                  const sinHorarios = !(slots[d]?.length);
                  return (
                    <button
                      key={d}
                      disabled={sinHorarios}
                      onClick={() => { setFecha(d); setHora(null); }}
                      className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold capitalize transition disabled:cursor-not-allowed disabled:opacity-35 ${
                        d === fecha ? 'border-brand-500 bg-brand-gradient text-white' : 'border-brand-100 bg-white text-ink/60 hover:border-brand-300'
                      }`}
                    >
                      {etiquetaDia(d)}
                    </button>
                  );
                })}
              </div>
              {fecha && (
                (slots[fecha] ?? []).length === 0 ? (
                  <p className="mt-2 text-xs text-amber-700">{t.sinCupos}</p>
                ) : (
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {(slots[fecha] ?? []).map((h) => (
                      <button
                        key={h}
                        onClick={() => setHora(h)}
                        className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                          h === hora ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-200' : 'border-brand-100 bg-white text-ink/60 hover:border-brand-300'
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </>
      )}

      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button onClick={onCerrar} className="rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold text-ink/60 hover:bg-white">{t.cancelar}</button>
        {restantes > 0 && (
          <button
            onClick={() => void confirmar()}
            disabled={!fecha || !hora || enviando}
            className="rounded-full bg-brand-gradient px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
          >
            {enviando ? <Loader2 size={14} className="animate-spin" /> : t.confirmar}
          </button>
        )}
      </div>
    </div>
  );
}
