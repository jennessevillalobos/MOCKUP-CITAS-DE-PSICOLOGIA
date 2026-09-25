-- Migración: cerrar funciones internas a la API pública
-- Las funciones SECURITY DEFINER de triggers y limpieza quedaban expuestas en /rest/v1/rpc
-- para anon y authenticated. Los triggers siguen funcionando (Postgres no verifica EXECUTE
-- al disparar un trigger) y las Edge Functions usan service_role, que conserva el permiso.

REVOKE EXECUTE ON FUNCTION
    public.handle_new_user(),
    public.limpiar_bloqueos_expirados(),
    public.completar_citas_pasadas(),
    public.limpiar_idempotencia_expirada(),
    public.otorgar_acceso_por_pago(),
    public.evaluar_desbloqueo_por_progreso(),
    public.evaluar_desbloqueo_por_evaluacion()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
    public.limpiar_bloqueos_expirados(),
    public.completar_citas_pasadas(),
    public.limpiar_idempotencia_expirada()
TO service_role;
