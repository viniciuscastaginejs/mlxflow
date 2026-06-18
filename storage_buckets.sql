-- storage_buckets.sql
-- Rodar UMA VEZ no SQL Editor do Supabase (mesmo fluxo do mlxflow_schema.sql).
-- Cria os 4 buckets privados exigidos pelo MLXFLOW_SPEC.md antes do Módulo 1
-- (client-files, contracts) e dos módulos futuros (post-art, documents),
-- e as políticas de RLS para usuários autenticados.

insert into storage.buckets (id, name, public)
values
  ('client-files', 'client-files', false),
  ('contracts', 'contracts', false),
  ('post-art', 'post-art', false),
  ('documents', 'documents', false)
on conflict (id) do nothing;

do $$
declare
  b text;
begin
  foreach b in array array['client-files', 'contracts', 'post-art', 'documents']
  loop
    execute format(
      'drop policy if exists %L on storage.objects',
      b || ': authenticated select'
    );
    execute format(
      'create policy %L on storage.objects for select to authenticated using (bucket_id = %L)',
      b || ': authenticated select', b
    );

    execute format(
      'drop policy if exists %L on storage.objects',
      b || ': authenticated insert'
    );
    execute format(
      'create policy %L on storage.objects for insert to authenticated with check (bucket_id = %L)',
      b || ': authenticated insert', b
    );

    execute format(
      'drop policy if exists %L on storage.objects',
      b || ': authenticated update'
    );
    execute format(
      'create policy %L on storage.objects for update to authenticated using (bucket_id = %L)',
      b || ': authenticated update', b
    );

    execute format(
      'drop policy if exists %L on storage.objects',
      b || ': authenticated delete'
    );
    execute format(
      'create policy %L on storage.objects for delete to authenticated using (bucket_id = %L)',
      b || ': authenticated delete', b
    );
  end loop;
end $$;
