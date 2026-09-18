import { WordPair, DifficultyLevel } from '@duodeceit/shared';

export interface ParseResult {
  success: boolean;
  pairs: WordPair[];
  error?: string;
  totalParsed: number;
  categoriesFound: string[];
}

/**
 * Validates and normalizes difficulty level
 */
function normalizeDifficulty(diff?: string): DifficultyLevel {
  const d = diff?.toLowerCase().trim();
  if (d === 'easy' || d === 'medium' || d === 'hard') {
    return d;
  }
  return 'medium';
}

/**
 * Parse a JSON or CSV file string into valid WordPairs
 */
export function parseWordPairsFile(content: string, filename: string): ParseResult {
  const isJson = filename.toLowerCase().endsWith('.json') || content.trim().startsWith('[') || content.trim().startsWith('{');

  if (isJson) {
    return parseJsonWordPairs(content);
  } else {
    return parseCsvWordPairs(content);
  }
}

/**
 * Parses JSON content for word pairs
 */
export function parseJsonWordPairs(jsonStr: string): ParseResult {
  try {
    const raw = JSON.parse(jsonStr);
    let list: any[] = [];

    if (Array.isArray(raw)) {
      list = raw;
    } else if (raw && typeof raw === 'object') {
      if (Array.isArray(raw.wordPairs)) {
        list = raw.wordPairs;
      } else if (Array.isArray(raw.pairs)) {
        list = raw.pairs;
      } else if (Array.isArray(raw.words)) {
        list = raw.words;
      } else {
        return {
          success: false,
          pairs: [],
          totalParsed: 0,
          categoriesFound: [],
          error: 'JSON must be an array of word pairs or an object with a "wordPairs" array.',
        };
      }
    }

    if (list.length === 0) {
      return {
        success: false,
        pairs: [],
        totalParsed: 0,
        categoriesFound: [],
        error: 'The uploaded JSON file contains no word pair entries.',
      };
    }

    const pairs: WordPair[] = [];
    const categoriesSet = new Set<string>();

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!item || typeof item !== 'object') continue;

      const word1 = (item.word1 || item.majority || item.civilian || item.w1 || '')
        .toString()
        .trim();
      const word2 = (item.word2 || item.minority || item.undercover || item.impostor || item.w2 || '')
        .toString()
        .trim();

      if (!word1 || !word2) continue;
      if (word1.toLowerCase() === word2.toLowerCase()) continue;

      const category = (item.category || item.cat || 'Custom').toString().trim() || 'Custom';
      const difficulty = normalizeDifficulty(item.difficulty || item.diff);

      pairs.push({
        id: item.id || `custom_${i + 1}`,
        word1,
        word2,
        category,
        difficulty,
      });
      categoriesSet.add(category);
    }

    if (pairs.length === 0) {
      return {
        success: false,
        pairs: [],
        totalParsed: 0,
        categoriesFound: [],
        error: 'Could not find any valid word pairs. Each item requires distinct "word1" and "word2".',
      };
    }

    return {
      success: true,
      pairs,
      totalParsed: pairs.length,
      categoriesFound: Array.from(categoriesSet),
    };
  } catch (err: any) {
    return {
      success: false,
      pairs: [],
      totalParsed: 0,
      categoriesFound: [],
      error: `JSON syntax error: ${err.message}`,
    };
  }
}

/**
 * Parses CSV / Delimited content for word pairs
 * Supports comma, semicolon, tab
 * Format: word1,word2[,category,difficulty]
 */
export function parseCsvWordPairs(csvStr: string): ParseResult {
  const lines = csvStr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      success: false,
      pairs: [],
      totalParsed: 0,
      categoriesFound: [],
      error: 'The uploaded file is empty.',
    };
  }

  const pairs: WordPair[] = [];
  const categoriesSet = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect delimiter
    const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';

    // Simple CSV parser handling quotes
    const tokens = parseCsvLine(line, delimiter);
    if (tokens.length < 2) continue;

    const [col0, col1, col2, col3] = tokens;

    // Check if this is a header line (e.g. "word1,word2" or "Civilian,Impostor")
    if (
      i === 0 &&
      (col0.toLowerCase().includes('word') ||
        col0.toLowerCase().includes('civilian') ||
        col0.toLowerCase().includes('majority'))
    ) {
      continue;
    }

    const word1 = col0.trim();
    const word2 = col1.trim();

    if (!word1 || !word2) continue;
    if (word1.toLowerCase() === word2.toLowerCase()) continue;

    const category = col2?.trim() || 'Custom';
    const difficulty = normalizeDifficulty(col3);

    pairs.push({
      id: `custom_csv_${i + 1}`,
      word1,
      word2,
      category,
      difficulty,
    });
    categoriesSet.add(category);
  }

  if (pairs.length === 0) {
    return {
      success: false,
      pairs: [],
      totalParsed: 0,
      categoriesFound: [],
      error: 'Could not extract valid word pairs from CSV. Format should be: word1,word2,category,difficulty',
    };
  }

  return {
    success: true,
    pairs,
    totalParsed: pairs.length,
    categoriesFound: Array.from(categoriesSet),
  };
}

/**
 * Basic RFC-4180 CSV line tokenizer
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur);
  return result;
}

/**
 * Generates and downloads a sample JSON template for users
 */
export function downloadSampleJsonTemplate(): void {
  const sample = [
    {
      word1: "Sun",
      word2: "Moon",
      category: "Nature & Space",
      difficulty: "easy"
    },
    {
      word1: "Laptop",
      word2: "Tablet",
      category: "Technology",
      difficulty: "easy"
    },
    {
      word1: "Espresso",
      word2: "Americano",
      category: "Food & Drinks",
      difficulty: "medium"
    },
    {
      word1: "Microscope",
      word2: "Telescope",
      category: "Science",
      difficulty: "medium"
    },
    {
      word1: "Symphony",
      word2: "Concerto",
      category: "Fine Arts",
      difficulty: "hard"
    }
  ];

  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
  triggerDownload(blob, 'duodeceit_word_pairs_template.json');
}

/**
 * Generates and downloads a sample CSV template for users
 */
export function downloadSampleCsvTemplate(): void {
  const sampleCsv = `word1,word2,category,difficulty
Sun,Moon,Nature & Space,easy
Laptop,Tablet,Technology,easy
Espresso,Americano,Food & Drinks,medium
Microscope,Telescope,Science,medium
Symphony,Concerto,Fine Arts,hard
Sherlock Holmes,Poirot,Mystery & Pop Culture,hard
Guitar,Ukulele,Music,easy
`;

  const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, 'duodeceit_word_pairs_template.csv');
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
