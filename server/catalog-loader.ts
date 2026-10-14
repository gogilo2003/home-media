import fsp from 'node:fs/promises';
import path from 'node:path';

export async function loadCatalog() {
  try {
    const data = await fsp.readFile(path.join('catalog', 'index.json'), 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    throw err;
  }
}
