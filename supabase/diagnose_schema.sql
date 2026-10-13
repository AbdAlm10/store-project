-- Read-only. Paste this whole file once in the Supabase SQL Editor and send the
-- single JSON result back. It does not change the database.

select jsonb_build_object(
  'enums',
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'schema', enum_row.schema_name,
      'name', enum_row.type_name,
      'values', enum_row.labels
    ) order by enum_row.schema_name, enum_row.type_name)
    from (
      select
        n.nspname as schema_name,
        t.typname as type_name,
        jsonb_agg(e.enumlabel order by e.enumsortorder) as labels
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      join pg_enum e on e.enumtypid = t.oid
      where t.typtype = 'e'
        and n.nspname not in ('pg_catalog', 'information_schema')
      group by n.nspname, t.typname
    ) enum_row
  ), '[]'::jsonb),
  'tables',
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'schema', table_row.schema_name,
      'name', table_row.table_name,
      'columns', table_row.columns
    ) order by table_row.schema_name, table_row.table_name)
    from (
      select
        n.nspname as schema_name,
        c.relname as table_name,
        jsonb_agg(jsonb_build_object(
          'name', a.attname,
          'type', format_type(a.atttypid, a.atttypmod),
          'type_name', t.typname,
          'type_schema', tn.nspname,
          'type_kind', t.typtype,
          'not_null', a.attnotnull,
          'default', pg_get_expr(ad.adbin, ad.adrelid)
        ) order by a.attnum) as columns
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid
        and a.attnum > 0
        and not a.attisdropped
      join pg_type t on t.oid = a.atttypid
      join pg_namespace tn on tn.oid = t.typnamespace
      left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
      group by n.nspname, c.relname
    ) table_row
  ), '[]'::jsonb),
  'functions',
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'schema', n.nspname,
      'name', p.proname,
      'identity_args', pg_get_function_identity_arguments(p.oid),
      'args', pg_get_function_arguments(p.oid),
      'arg_names', p.proargnames,
      'result', pg_get_function_result(p.oid),
      'language', l.lanname,
      'security', case when p.prosecdef then 'definer' else 'invoker' end
    ) order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_language l on l.oid = p.prolang
    where n.nspname = 'public'
  ), '[]'::jsonb),
  'policies',
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'schema', pol.schemaname,
      'table', pol.tablename,
      'name', pol.policyname,
      'permissive', pol.permissive,
      'roles', pol.roles,
      'command', pol.cmd,
      'using', pol.qual,
      'with_check', pol.with_check
    ) order by pol.schemaname, pol.tablename, pol.policyname)
    from pg_policies pol
    where pol.schemaname = 'public'
  ), '[]'::jsonb),
  'triggers',
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'schema', n.nspname,
      'table', c.relname,
      'name', tr.tgname,
      'definition', pg_get_triggerdef(tr.oid)
    ) order by n.nspname, c.relname, tr.tgname)
    from pg_trigger tr
    join pg_class c on c.oid = tr.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and not tr.tgisinternal
  ), '[]'::jsonb),
  'constraints',
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'schema', n.nspname,
      'table', c.relname,
      'name', con.conname,
      'type', con.contype,
      'definition', pg_get_constraintdef(con.oid)
    ) order by n.nspname, c.relname, con.conname)
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
  ), '[]'::jsonb),
  'indexes',
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'schema', idx.schemaname,
      'table', idx.tablename,
      'name', idx.indexname,
      'definition', idx.indexdef
    ) order by idx.schemaname, idx.tablename, idx.indexname)
    from pg_indexes idx
    where idx.schemaname = 'public'
  ), '[]'::jsonb),
  'storage_policies',
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'schema', pol.schemaname,
      'table', pol.tablename,
      'name', pol.policyname,
      'permissive', pol.permissive,
      'roles', pol.roles,
      'command', pol.cmd,
      'using', pol.qual,
      'with_check', pol.with_check
    ) order by pol.schemaname, pol.tablename, pol.policyname)
    from pg_policies pol
    where pol.schemaname = 'storage'
  ), '[]'::jsonb)
) as schema;
