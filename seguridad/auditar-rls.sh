#!/usr/bin/env bash
# Revisa contra la base de datos que ninguna tabla se haya quedado sin row
# level security. Las pruebas de rls.test.ts comprueban las tablas que existen
# hoy; esto atrapa la que alguien agregue mañana y olvide proteger.
#
# Necesita la contraseña de la base en .supabase-secrets.local (no versionado)
# y psql. Es un chequeo local, no de CI.
set -euo pipefail

cd "$(dirname "$0")/.."

REF=djhfrlxtjqbqgvszityr
DBPW=$(grep DB_PASSWORD .supabase-secrets.local | cut -d= -f2-)
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
CONN="postgresql://postgres.${REF}:${DBPW}@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

sin_rls=$(psql "$CONN" -t -A -c "
  select c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;")

sin_politica=$(psql "$CONN" -t -A -c "
  select c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
    and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname);")

fallo=0

if [ -n "$sin_rls" ]; then
  echo "TABLAS SIN RLS (cualquiera con la clave anon las lee):"
  echo "$sin_rls" | sed 's/^/  - /'
  fallo=1
fi

# RLS activo pero sin políticas deja la tabla ilegible para todos: no es un
# agujero, pero sí un error que rompe la app en silencio.
if [ -n "$sin_politica" ]; then
  echo "TABLAS CON RLS PERO SIN NINGUNA POLÍTICA:"
  echo "$sin_politica" | sed 's/^/  - /'
  fallo=1
fi

if [ "$fallo" -eq 0 ]; then
  echo "Todas las tablas de public tienen RLS y al menos una política."
  psql "$CONN" -t -A -F' · ' -c "
    select tablename, count(*) || ' política(s)'
    from pg_policies where schemaname in ('public','storage')
    group by 1 order by 1;" | sed 's/^/  /'
fi

exit "$fallo"
