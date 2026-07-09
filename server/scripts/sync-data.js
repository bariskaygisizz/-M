import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'locations.json');

const IBB_API = 'https://data.ibb.gov.tr/api/3/action/datastore_search';
const RESOURCE_2023 = '04bb75cc-d341-41dc-9fc7-ab2252c2d547';
const RESOURCE_2024 = '472752bf-04f7-4d56-9c54-48d28c678d8d';
const RESOURCE_2025 = 'a40d07e1-5464-4c0d-b4fd-ff37c40ba162';

const TYPE_LABELS = {
  BILETMATIK: 'Biletmatik',
  'BILETMATIK 4': 'Biletmatik 4',
  DOLUM_MERKEZI: 'Dolum Merkezi',
  BAYI: 'Bayi / Dolum Noktası',
  OTHER: 'Diğer'
};

function normalizeCoord(value) {
  if (value == null || value === '') return null;
  const str = String(value).trim().replace(/\s/g, '');
  const normalized = str.replace(/,/g, '.').replace(/\.(?=.*\.)/g, '');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function normalizeTerminalId(value) {
  if (value == null || value === '') return null;
  const str = String(value).trim();
  if (/^\d+(\.0+)?$/.test(str)) {
    return String(parseInt(str, 10));
  }
  return str.toUpperCase();
}

function guessType(terminalId) {
  if (!terminalId) return TYPE_LABELS.OTHER;
  if (terminalId.startsWith('301') || terminalId.startsWith('30')) return TYPE_LABELS.BILETMATIK;
  if (terminalId.startsWith('800') || terminalId.startsWith('80')) return TYPE_LABELS['BILETMATIK 4'];
  if (/^11[4-9]/.test(terminalId)) return TYPE_LABELS.BAYI;
  if (/^G40|^A5|^EMH|^O51|^KGH|^IKT/.test(terminalId)) return TYPE_LABELS.DOLUM_MERKEZI;
  return TYPE_LABELS.BAYI;
}

function formatDistrict(townId) {
  if (!townId) return 'Bilinmiyor';
  return townId
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .replace(/Sultan/g, 'Sultan');
}

async function fetchAllRecords(resourceId, pageSize = 32000) {
  const firstUrl = `${IBB_API}?resource_id=${resourceId}&limit=1`;
  const firstRes = await fetch(firstUrl);
  const firstJson = await firstRes.json();
  if (!firstJson.success) {
    throw new Error(`İBB API hatası (${resourceId}): ${JSON.stringify(firstJson.error || firstJson)}`);
  }

  const total = firstJson.result.total;
  const records = [];

  for (let offset = 0; offset < total; offset += pageSize) {
    const limit = Math.min(pageSize, total - offset);
    const url = `${IBB_API}?resource_id=${resourceId}&limit=${limit}&offset=${offset}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) {
      throw new Error(`İBB API sayfa hatası: ${JSON.stringify(json.error || json)}`);
    }
    records.push(...json.result.records);
    console.log(`  ${resourceId}: ${records.length}/${total} kayıt alındı`);
  }

  return records;
}

function mapIbbType(code) {
  if (!code) return null;
  const upper = code.toUpperCase().trim();
  if (upper.includes('BILETMATIK 4')) return TYPE_LABELS['BILETMATIK 4'];
  if (upper.includes('BILETMATIK')) return TYPE_LABELS.BILETMATIK;
  return code;
}

async function buildTypeLookup() {
  const lookup = new Map();
  for (const resourceId of [RESOURCE_2024, RESOURCE_2025]) {
    const records = await fetchAllRecords(resourceId, 500);
    for (const record of records) {
      const terminalId = normalizeTerminalId(record.terminal_id);
      const type = mapIbbType(record.terminal_subtype_definition_desc_cd);
      if (terminalId && type) {
        lookup.set(terminalId, type);
      }
    }
  }
  return lookup;
}

function buildLocation(record, typeLookup) {
  const terminalId = normalizeTerminalId(record.terminal_id);
  const lat = normalizeCoord(record.latitude ?? record.LATITUDE);
  const lng = normalizeCoord(record.longitude ?? record.LONGITUDE);
  const district = formatDistrict(record.town_id ?? record.COUNTY_NAME);
  const address = record.ADRESS || record.ADDRESS || null;

  if (lat == null || lng == null) return null;
  if (lat < 40.8 || lat > 41.6 || lng < 27.9 || lng > 30.0) return null;

  const type = (terminalId && typeLookup.get(terminalId)) || guessType(terminalId);

  return {
    id: terminalId || `loc-${record._id}`,
    terminalId,
    type,
    district,
    address,
    lat,
    lng
  };
}

async function main() {
  console.log('İBB açık veri senkronizasyonu başlıyor...');

  const typeLookup = await buildTypeLookup();
  console.log(`Tip eşlemesi: ${typeLookup.size} terminal`);

  const records2023 = await fetchAllRecords(RESOURCE_2023);
  const locations = [];
  const seen = new Set();

  for (const record of records2023) {
    const location = buildLocation(record, typeLookup);
    if (!location) continue;

    const key = `${location.terminalId || location.id}-${location.lat.toFixed(5)}-${location.lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    locations.push(location);
  }

  locations.sort((a, b) => a.district.localeCompare(b.district, 'tr'));

  const summary = locations.reduce((acc, loc) => {
    acc[loc.type] = (acc[loc.type] || 0) + 1;
    return acc;
  }, {});

  const payload = {
    updatedAt: new Date().toISOString(),
    source: 'İBB Açık Veri - İstanbulkart Dolum Merkezi Bilgileri',
    total: locations.length,
    summary,
    locations
  };

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`\n${locations.length} konum kaydedildi: ${OUTPUT_FILE}`);
  console.log('Özet:', summary);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
