import iconv from 'iconv-lite';

const MOJIBAKE_MARKERS = /(Ã.|Â|â€™|â€œ|â€|Ø.|Ù.|Ð.|Ñ.|ط.|ظ.|أ.)/;

function textQualityScore(value: string) {
  const arabic = (value.match(/[\u0600-\u06FF]/g) ?? []).length;
  const latin = (value.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;
  const mojibake = (value.match(/[ÃÂØÙÐÑâطظأ]/g) ?? []).length;
  const control = (value.match(/[\u0000-\u001F\u007F-\u009F]/g) ?? []).length;
  const punctuation = (value.match(/[’'":;,.!?()\-]/g) ?? []).length;
  return arabic * 3 + latin * 2 + punctuation * 0.2 - mojibake * 4 - control * 8;
}

export function isSuspiciousText(value?: string | null) {
  const input = value ?? '';
  return /[\u0000-\u001F\u007F-\u009F]|[ÃÂØÙÐÑâطظأ]|�|[&`]/.test(input);
}

function cleanupText(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .replace(/�+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeAsUtf8FromEncoding(value: string, encoding: 'latin1' | 'win1252' | 'windows-1256') {
  try {
    return cleanupText(iconv.decode(iconv.encode(value, encoding), 'utf8'));
  } catch {
    return value;
  }
}

function collectCandidates(input: string) {
  const candidates = new Set<string>([cleanupText(input)]);

  for (const encoding of ['latin1', 'win1252', 'windows-1256'] as const) {
    const once = decodeAsUtf8FromEncoding(input, encoding);
    candidates.add(once);

    if (MOJIBAKE_MARKERS.test(once)) {
      candidates.add(decodeAsUtf8FromEncoding(once, encoding));
    }
  }

  return Array.from(candidates).filter(Boolean);
}

export function decodeMojibake(value?: string | null) {
  const input = cleanupText(value ?? '');
  if (!input) return '';

  let output = collectCandidates(input)
    .sort((left, right) => textQualityScore(right) - textQualityScore(left))[0] ?? input;

  // Keep a final light cleanup for common French artifacts.
  output = output
    .replace(/Ã©/g, 'é')
    .replace(/Ã¨/g, 'è')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã /g, 'à')
    .replace(/Ã¢/g, 'â')
    .replace(/Ã´/g, 'ô')
    .replace(/Ã»/g, 'û')
    .replace(/Ã§/g, 'ç')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã /g, 'à')
    .replace(/â€™/g, "'")
    .replace(/Â/g, '')
    .replace(/\s+/g, ' ');

  return cleanupText(output);
}
