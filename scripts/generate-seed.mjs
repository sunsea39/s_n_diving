import { readFile, writeFile } from 'node:fs/promises';

const source = JSON.parse(await readFile('supabase/seed/gear-signs.json', 'utf8'));
const json = JSON.stringify(source);
const sql = `-- Generated from supabase/seed/gear-signs.json. Do not edit by hand.\nwith seed_document as (\n  select $seed_json$${json}$seed_json$::jsonb as value\n)\ninsert into public.docs (slug, title, category, summary, icon, body, status, sort_order)\nselect\n  value->>'slug',\n  value->>'title',\n  value->>'category',\n  value->>'summary',\n  coalesce(value->>'icon', value->'body'->'sections'->0->>'icon', 'mask'),\n  value->'body',\n  value->>'status',\n  (value->>'sort_order')::integer\nfrom seed_document\non conflict (slug) do update set\n  title = excluded.title, category = excluded.category, summary = excluded.summary,\n  icon = excluded.icon, body = excluded.body, status = excluded.status, sort_order = excluded.sort_order;\n\ninsert into public.settings (id, passcode_hash, passcode_version, disclaimer)\nvalues (1, null, 1, '')\non conflict (id) do nothing;\n`;
await writeFile('supabase/seed.sql', sql, 'utf8');
