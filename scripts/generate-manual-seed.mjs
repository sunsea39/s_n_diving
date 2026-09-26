import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function createManualSeedSql(documents) {
  const json = JSON.stringify(documents);
  return `-- Generated from private/manual/*.json. Do not edit by hand.
with seed_documents as (
  select value
  from jsonb_array_elements($manual_seed_json$${json}$manual_seed_json$::jsonb) as value
)
insert into public.docs (slug, title, category, summary, icon, body, status, sort_order)
select
  value->>'slug',
  value->>'title',
  value->>'category',
  value->>'summary',
  coalesce(value->>'icon', ''),
  value->'body',
  value->>'status',
  (value->>'sort_order')::integer
from seed_documents
on conflict (slug) do update set
  title = excluded.title,
  category = excluded.category,
  summary = excluded.summary,
  icon = excluded.icon,
  body = excluded.body,
  status = excluded.status,
  sort_order = excluded.sort_order;
`;
}

export async function generateManualSeed(manualDirectory = 'private/manual') {
  try {
    await access(manualDirectory, constants.R_OK);
  } catch {
    return false;
  }

  const filenames = (await readdir(manualDirectory)).filter(
    (filename) => filename.endsWith('.json') && filename !== 'manual-seed.json'
  );
  const documents = await Promise.all(
    filenames.map(async (filename) => JSON.parse(await readFile(`${manualDirectory}/${filename}`, 'utf8')))
  );
  documents.sort((first, second) => first.sort_order - second.sort_order);
  await writeFile(`${manualDirectory}/manual-seed.sql`, createManualSeedSql(documents), 'utf8');
  return true;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  await generateManualSeed();
}
