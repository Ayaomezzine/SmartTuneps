import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';
import * as XLSX from 'xlsx';

export interface ProductRecord {
  id: string;
  designation: string;
  price: number | null;
  brand: string;
  family: string;
  aliases: string[];
  searchCorpus: string;
}

interface CatalogCache {
  signature: string;
  records: ProductRecord[];
}

let catalogCache: CatalogCache | null = null;

const STOP_WORDS = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'and', 'et', 'for', 'of', 'pour', 'with', 'sans',
  'a', 'an', 'the', 'l', 'd', 'en', 'au', 'aux', 'pour', 'avec', 'sur', 'dans', 'par', 'to',
  'etui', 'boite', 'set', 'pcs', 'piece', 'pieces'
]);

const ARABIC_STOP_WORDS = new Set(['من', 'الى', 'في', 'على', 'عن', 'مع', 'ل', 'و', 'ب', 'ال']);

const BRAND_HINTS = new Set([
  'hp', 'canon', 'xerox', 'lexmark', 'samsung', 'brother', 'epson', 'ricoh', 'kyocera', 'sharp', 'oki', 'pantum'
]);

const TOKEN_SYNONYMS: Record<string, string[]> = {
  toner: ['cartouche toner', 'laser toner', 'consommable imprimante', 'printer cartridge', 'compatible toner', 'تونر', 'حبر ليزر'],
  cartouche: ['cartridge', 'consommable imprimante', 'خرطوشة', 'حبر طابعة'],
  encre: ['ink', 'inkjet', 'bouteille encre', 'حبر', 'حبر طابعة'],
  ink: ['encre', 'cartouche', 'bouteille encre', 'حبر'],
  imprimante: ['printer', 'materiel impression', 'معدات الطباعة', 'طابعة'],
  papier: ['a4', 'office paper', 'ورق', 'ورق a4'],
  a4: ['papier a4', 'office paper', 'ورق a4'],
  chemise: ['folder', 'classement', 'ملف', 'حافظة'],
  dossier: ['folder', 'fichier', 'ملف'],
  fourniture: ['fournitures bureau', 'office supply', 'قرطاسية', 'مستلزمات مكتبية'],
  fournitures: ['office supplies', 'administrative supplies', 'لوازم ادارية', 'مستلزمات مكتبية'],
  bureau: ['office', 'administratif', 'مكتبي', 'اداري'],
  agrafe: ['staple', 'staples', 'دباسة', 'مشبك'],
  ruban: ['adhesive tape', 'scotch', 'شريط لاصق'],
  ciseau: ['scissors', 'مقص'],
  papeterie: ['office stationery', 'قرطاسية'],
  administratif: ['administrative', 'lوازم ادارية', 'مستلزمات ادارية'],
  consommable: ['supplies', 'consommables imprimante', 'مستهلكات', 'مستهلكات الطباعة'],
  jeu: ['game', 'board game', 'jeu educatif', 'animation'],
  jeux: ['games', 'board games', 'jeux educatifs', 'animation'],
  echec: ['chess', 'jeu d echec', 'chess set'],
  dames: ['checkers', 'jeu de dames', 'checker set'],
  dame: ['checkers', 'jeu de dames', 'checker set'],
  domino: ['domino game', 'jeu de domino', 'domino set'],
  dominos: ['domino game', 'jeu de domino', 'domino set'],
  ludo: ['ludo game', 'board game'],
  jakki: ['jack game', 'jakki pliant', 'board game'],
  puzzle: ['jigsaw puzzle', 'educational puzzle'],
  scrable: ['scrabble', 'word game'],
  scrabble: ['scrable', 'word game'],
  ballon: ['ball', 'sports ball', 'event ball'],
  foot: ['football', 'soccer ball', 'ballon foot'],
  football: ['soccer', 'soccer ball', 'ballon foot'],
  basket: ['basketball', 'basket ball', 'ballon basket'],
  volleyball: ['volley', 'volley ball', 'ballon volleyball'],
  volley: ['volleyball', 'volley ball', 'ballon volleyball'],
  ping: ['ping pong', 'table tennis'],
  pong: ['ping pong', 'table tennis'],
  raquette: ['racket', 'ping pong paddle', 'table tennis racket']
};

function normalizeText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/[^\p{L}\p{N}\u0600-\u06FF]+/gu, ' ')
    .toLowerCase()
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token && !STOP_WORDS.has(token) && !ARABIC_STOP_WORDS.has(token));
}

function singularize(token: string) {
  if (token.endsWith('s') && token.length > 3) {
    return token.slice(0, -1);
  }
  if (token.endsWith('es') && token.length > 4) {
    return token.slice(0, -2);
  }
  return token;
}

function extractPrice(designation: string) {
  const lastComma = designation.lastIndexOf(',');
  if (lastComma === -1) return null;
  const candidate = designation.slice(lastComma + 1).trim().replace(',', '.');
  const parsed = Number.parseFloat(candidate);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitDesignation(line: string) {
  const lastComma = line.lastIndexOf(',');
  if (lastComma === -1) {
    return { designation: line.trim(), price: null };
  }

  const designation = line.slice(0, lastComma).trim();
  return { designation, price: extractPrice(line) };
}

function extractBrand(tokens: string[]) {
  const brand = tokens.find((token) => BRAND_HINTS.has(token));
  if (brand) return brand.toUpperCase();

  const firstStrongToken = tokens.find((token) => /[0-9]/.test(token) || /^[a-z]{2,}[a-z0-9\-]+$/i.test(token));
  return firstStrongToken ? firstStrongToken.replace(/[^\p{L}\p{N}-]+/gu, '').toUpperCase() : (tokens[0] ?? 'GENERIC').toUpperCase();
}

function stripNoise(tokens: string[]) {
  return tokens.filter((token) => !/^(pack|packe|packaged?|original|adaptable|adapt|noir|black|couleur|color|couleurs?|noirs?|blanc|bleu|vert|rouge|jaune|gris|magenta|cyan|yellow|selon|lot|piece|pieces?|pack\d+|size|model|modele|modèle)$/i.test(token));
}

function extractFamily(tokens: string[]) {
  const meaningful = stripNoise(tokens).map(singularize);
  const familyTokens = meaningful.slice(0, 3);
  return familyTokens.length ? familyTokens.join(' ') : 'general supply';
}

function buildAliases(designation: string, tokens: string[], brand: string, family: string) {
  const aliases = new Set<string>();
  const normalized = normalizeText(designation);

  function add(value: string) {
    const cleaned = normalizeText(value);
    if (cleaned) aliases.add(cleaned);
  }

  aliases.add(normalized);
  add(tokenize(designation).join(' '));
  add(tokens.map(singularize).join(' '));
  add(tokens.filter((token) => token !== brand.toLowerCase()).join(' '));
  add(family);
  add(`${brand} ${family}`.trim());
  add(tokens.map((token) => token[0]).join(''));
  add(tokens.map((token) => token.replace(/[^\p{L}\p{N}]+/gu, '')).join(''));
  add(tokens.join('-'));
  add(tokens.join('/'));
  add(`compatible ${brand}`);
  add(`${brand} compatible`);
  add(`consommable ${brand}`);
  add(`printer consumable ${brand}`);
  add(`خرطوشة ${brand}`);
  add(`تونر ${brand}`);

  for (const token of tokens) {
    const synonyms = TOKEN_SYNONYMS[token] ?? [];
    for (const synonym of synonyms) {
      add(synonym);
      add(`${synonym} ${brand}`);
      add(`${synonym} ${family}`);
    }
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const synonyms = TOKEN_SYNONYMS[token] ?? [];
    for (const synonym of synonyms) {
      const replaced = [...tokens];
      replaced[index] = normalizeText(synonym);
      add(replaced.join(' '));
    }
  }

  add('fournitures bureau');
  add('office supplies');
  add('مستلزمات مكتبية');
  add('قرطاسية');
  add('مستهلكات الطباعة');

  return Array.from(aliases).filter(Boolean);
}

function parseCsvCatalog(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const records: ProductRecord[] = [];

  for (const [index, line] of lines.entries()) {
    if (index === 0 && /(designation|article|product|produit)/i.test(line)) {
      continue;
    }

    const { designation, price } = splitDesignation(line);
    if (!designation) continue;

    const tokens = tokenize(designation);
    if (!tokens.length) continue;

    const brand = extractBrand(tokens);
    const family = extractFamily(tokens);
    const aliases = buildAliases(designation, tokens, brand, family);
    const searchCorpus = [designation, brand, family, ...aliases].join(' ');

    records.push({
      id: `${index}-${designation}`,
      designation,
      price,
      brand,
      family,
      aliases,
      searchCorpus
    });
  }

  return records;
}

function parseXlsxCatalog(filePath: string) {
  const workbook = XLSX.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(firstSheet, { header: 1, blankrows: false });
  const records: ProductRecord[] = [];

  rows.forEach((row, index) => {
    const cells = row.map((cell) => String(cell ?? '').trim()).filter(Boolean);
    if (!cells.length) return;

    const joined = cells.join(', ');
    if (index === 0 && /(designation|article|product|produit)/i.test(joined)) {
      return;
    }

    const designation = cells[0];
    if (!designation) return;

    const trailing = cells[cells.length - 1];
    const maybePrice = Number.parseFloat(trailing.replace(',', '.'));
    const price = Number.isFinite(maybePrice) ? maybePrice : null;
    const tokens = tokenize(designation);
    if (!tokens.length) return;

    const brand = extractBrand(tokens);
    const family = extractFamily(tokens);
    const aliases = buildAliases(designation, tokens, brand, family);
    const searchCorpus = [designation, brand, family, ...aliases].join(' ');

    records.push({
      id: `${index}-${designation}`,
      designation,
      price,
      brand,
      family,
      aliases,
      searchCorpus
    });
  });

  return records;
}

type CatalogFileInfo = {
  filePath: string;
  mtimeMs: number;
  size: number;
  ext: '.csv' | '.xlsx' | '.xls';
  score: number;
};

async function listCandidateCatalogFiles() {
  const candidateDirs = [
    process.cwd(),
    path.join(process.cwd(), 'data', 'catalog'),
    path.join(process.cwd(), 'uploads', 'catalog')
  ];

  const files: CatalogFileInfo[] = [];
  for (const directory of candidateDirs) {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (ext !== '.csv' && ext !== '.xlsx' && ext !== '.xls') continue;

      const fullPath = path.join(directory, entry.name);
      const stats = await stat(fullPath).catch(() => null);
      if (!stats) continue;

      const lower = entry.name.toLowerCase();
      let score = 0;
      if (/(price|catalog|produit|product|article|stock)/.test(lower)) score += 5;
      if (/(tuneps|consultation|relevant|shortlist)/.test(lower)) score -= 4;

      files.push({
        filePath: fullPath,
        mtimeMs: stats.mtimeMs,
        size: stats.size,
        ext,
        score
      });
    }
  }

  return files;
}

async function resolveCatalogFile() {
  const candidates = await listCandidateCatalogFiles();
  if (!candidates.length) {
    return {
      filePath: path.join(process.cwd(), 'Prices_database.csv'),
      mtimeMs: 0,
      size: 0,
      ext: '.csv' as const,
      score: 0
    };
  }

  candidates.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return right.mtimeMs - left.mtimeMs;
  });

  return candidates[0];
}

export async function getProductCatalog() {
  const catalogFile = await resolveCatalogFile();
  const signature = `${catalogFile.filePath}:${catalogFile.mtimeMs}:${catalogFile.size}`;

  if (catalogCache?.signature === signature) {
    return catalogCache.records;
  }

  let records: ProductRecord[] = [];

  if (catalogFile.ext === '.xlsx' || catalogFile.ext === '.xls') {
    records = parseXlsxCatalog(catalogFile.filePath);
  } else {
    const raw = await readFile(catalogFile.filePath, 'utf8');
    records = parseCsvCatalog(raw.replace(/^\uFEFF/, ''));
  }

  catalogCache = { signature, records };
  return records;
}

export function normalizeCatalogText(value: string) {
  return normalizeText(value);
}
