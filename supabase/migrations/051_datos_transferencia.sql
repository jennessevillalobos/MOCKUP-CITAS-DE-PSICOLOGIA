-- 051 · Datos bancarios para transferencias editables por el admin (pedido
-- por la usuaria 2026-09-27). Se guardan en `configuracion_sitio` (049) con
-- la clave 'transferencia'; la ventana de pago los lee de ahí. Los valores
-- iniciales son los de relleno que tenía el código.

INSERT INTO public.configuracion_sitio (clave, valor) VALUES ('transferencia', jsonb_build_object(
    'banco', 'Zelle / BOFA',
    'titular', 'Clínica PsiqueAmor',
    'numero', '0102-0304-0506-0708',
    'adicional', ''
)) ON CONFLICT (clave) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_guardar_transferencia(p_valor JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_banco TEXT := NULLIF(btrim(COALESCE(p_valor ->> 'banco', '')), '');
    v_titular TEXT := NULLIF(btrim(COALESCE(p_valor ->> 'titular', '')), '');
    v_numero TEXT := NULLIF(btrim(COALESCE(p_valor ->> 'numero', '')), '');
    v_adicional TEXT := btrim(COALESCE(p_valor ->> 'adicional', ''));
BEGIN
    IF NOT public.es_admin() THEN
        RAISE EXCEPTION 'Solo para administradores.';
    END IF;
    IF v_banco IS NULL OR v_titular IS NULL OR v_numero IS NULL THEN
        RAISE EXCEPTION 'Completa banco, titular y número de cuenta.';
    END IF;
    IF length(v_banco) > 100 OR length(v_titular) > 120 OR length(v_numero) > 120 THEN
        RAISE EXCEPTION 'Un campo es demasiado largo.';
    END IF;
    IF length(v_adicional) > 600 THEN
        RAISE EXCEPTION 'Los datos adicionales admiten hasta 600 caracteres.';
    END IF;
    INSERT INTO public.configuracion_sitio (clave, valor, actualizado_en, actualizado_por)
    VALUES ('transferencia', jsonb_build_object('banco', v_banco, 'titular', v_titular, 'numero', v_numero, 'adicional', v_adicional), now(), auth.uid())
    ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = now(), actualizado_por = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_guardar_transferencia(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_guardar_transferencia(JSONB) TO authenticated;
