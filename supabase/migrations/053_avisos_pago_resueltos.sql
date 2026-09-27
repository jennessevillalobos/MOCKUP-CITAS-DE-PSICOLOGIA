-- 053 · Los avisos de "transferencia por revisar" (a la profesional, 019/023,
-- y a los admins, 046) quedaban sin leer aunque el pago ya se hubiera
-- aprobado o rechazado. Ahora cada aviso guarda el pago al que se refiere
-- (`notificaciones.ref`) y, al resolverse el pago, se marcan leídos para todos.

ALTER TABLE public.notificaciones ADD COLUMN IF NOT EXISTS ref TEXT;
CREATE INDEX IF NOT EXISTS notificaciones_ref_idx ON public.notificaciones (ref) WHERE ref IS NOT NULL;

-- Etiqueta con el id del pago los avisos que se crearon junto con él (misma
-- transacción → misma marca de tiempo). Se llama "zz" para correr después de
-- trg_notif_admin_pago y trg_notif_pagos, que son los que crean los avisos.
CREATE OR REPLACE FUNCTION public.ref_avisos_pago()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NEW.estado = 'pendiente' THEN
        UPDATE public.notificaciones
           SET ref = NEW.id::text
         WHERE ref IS NULL AND tipo = 'pago' AND creado_en = now()
           AND texto_es ILIKE '%transferencia%revis%';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_zz_ref_avisos_pago ON public.pagos;
CREATE TRIGGER trg_zz_ref_avisos_pago AFTER INSERT ON public.pagos
    FOR EACH ROW EXECUTE FUNCTION public.ref_avisos_pago();

-- Al aprobar o rechazar, los avisos de ese pago dejan de estar pendientes.
CREATE OR REPLACE FUNCTION public.avisos_pago_resuelto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF OLD.estado = 'pendiente' AND NEW.estado <> 'pendiente' THEN
        UPDATE public.notificaciones SET leida = true WHERE ref = NEW.id::text AND NOT leida;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_avisos_pago_resuelto ON public.pagos;
CREATE TRIGGER trg_avisos_pago_resuelto AFTER UPDATE OF estado ON public.pagos
    FOR EACH ROW EXECUTE FUNCTION public.avisos_pago_resuelto();

-- Avisos ya existentes: se enlazan a su pago y se marcan leídos si ya se resolvió.
UPDATE public.notificaciones n
   SET ref = p.id::text
  FROM public.pagos p
 WHERE n.ref IS NULL AND n.tipo = 'pago' AND n.creado_en = p.fecha
   AND n.texto_es ILIKE '%transferencia%revis%';

UPDATE public.notificaciones n
   SET leida = true
  FROM public.pagos p
 WHERE n.ref = p.id::text AND p.estado <> 'pendiente' AND NOT n.leida;
