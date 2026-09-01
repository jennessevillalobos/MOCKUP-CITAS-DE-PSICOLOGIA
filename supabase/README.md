# Backend Psique Amor

## Estructura

```
supabase/
├── migrations/             # Migraciones SQL del equipo (001_usuarios, 002_citas, 003_cursos)
├── policies.sql            # RLS aplicadas en Supabase (12 políticas iniciales)
├── esquemas.csv            # Introspección de columnas de la base real
├── seed.sql                # Datos de desarrollo (monedas, lugares, servicios, cursos)
├── config.example.toml     # Configuración para `supabase start` local con Docker
└── functions/              # Edge Functions en Deno/TypeScript
    ├── _shared/            # cors, http, auth, idempotency
    ├── book-appointment/   # Crear cita validando disponibilidad
    ├── create-download-link/   # Token temporal para PDF
    ├── create-stripe-session/  # Stub - requiere STRIPE_SECRET_KEY
    ├── evaluate-unlock-rules/  # Evaluar acceso a clase/módulo
    ├── get-protected-content/   # URL firmada para video/libro
    └── save-progress/      # Upsert de progreso de clase
```

## Desarrollo local

### Requisitos
- Deno ≥ 2.1 (`https://deno.land`)
- Supabase CLI (`npx supabase`)
- Docker Desktop (solo para `supabase start` local)

### Validar sintaxis de las funciones
```bash
$deno = "$env:USERPROFILE\.deno\bin\deno.exe"
foreach ($f in (Get-ChildItem -Path supabase\functions -Recurse -Filter index.ts)) { & $deno check $f.FullName }
```

### Servir las funciones contra el proyecto real
Configurar `supabase/functions/.env` con `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` (obtenida de Project Settings > API).

```bash
supabase functions serve --env-file supabase/functions/.env
```

Requiere Docker instalado (la CLI lo necesita para `supabase start`); sin Docker, desplegar directo a Supabase Cloud:
```bash
supabase functions deploy book-appointment
```

### Cargar el seed de desarrollo
Desde el SQL Editor de Supabase o con psql:
```sql
\i supabase/seed.sql
```

## RLS pendientes

Ver `/supabase/policies.sql` y el plan actualizado. Las 12 políticas actuales cubren:
- Lecturas públicas de catálogo (servicios, cursos publicados, modalidades, roles)
- Lectura/escritura del perfil propio
- Citas propias (SELECT e INSERT; falta UPDATE para cancelar)
- Progreso propio (ALL)
- Inscripciones y órdenes (solo SELECT)

Faltan 22+ políticas para activar el resto de las funciones y Edge Functions.
