const SUBSCRIPT_DIGITS: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
};

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};

const VALID_ELEMENT_SYMBOLS = new Set([
  'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca',
  'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr',
  'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba',
  'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu', 'Hf', 'Ta', 'W',
  'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg', 'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th', 'Pa', 'U',
  'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds',
  'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og',
]);

const CHEMICAL_TOKEN_RE = /[A-Za-z0-9()]+/g;

const UNIT_PATTERN = [
  'km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm', 'kg', 'hg', 'dag', 'g', 'dg', 'cg', 'mg', 'kJ', 'J', 'MW', 'kW',
  'W', 'kcal', 'cal', 'mL', 'L', 'min', 'h', 's',
].join('|');

const UNIT_EXPONENT_RE = new RegExp(
  `(^|[^A-Za-z0-9_])(${UNIT_PATTERN})(\\s*)([23])(?=(?:[.,;:)\\]/]|\\s|$))`,
  'g'
);
const MATH_SEGMENT_RE = /(\$\$[\s\S]+?(?<!\\)\$\$|\$(?!\$)[\s\S]+?(?<!\\)\$)/g;

function toSubscriptDigits(value: string): string {
  return value.replace(/\d/g, (digit) => SUBSCRIPT_DIGITS[digit] || digit);
}

function toSuperscriptDigits(value: string): string {
  return value.replace(/\d/g, (digit) => SUPERSCRIPT_DIGITS[digit] || digit);
}

function analyzeChemicalToken(token: string): { isStrong: boolean; isWeak: boolean } {
  let index = 0;
  let elementGroups = 0;
  let digitGroups = 0;
  let lastWasClosableGroup = false;

  while (index < token.length) {
    const current = token[index];
    if (current === '(') {
      lastWasClosableGroup = false;
      index += 1;
      continue;
    }
    if (current === ')') {
      lastWasClosableGroup = true;
      index += 1;
      continue;
    }
    if (/[A-Z]/.test(current)) {
      const next = token[index + 1];
      const symbol = next && /[a-z]/.test(next) ? `${current}${next}` : current;
      if (!VALID_ELEMENT_SYMBOLS.has(symbol)) {
        return { isStrong: false, isWeak: false };
      }
      elementGroups += 1;
      index += symbol.length;
      let hasDigits = false;
      while (index < token.length && /\d/.test(token[index])) {
        hasDigits = true;
        index += 1;
      }
      if (hasDigits) digitGroups += 1;
      lastWasClosableGroup = true;
      continue;
    }
    if (/\d/.test(current) && lastWasClosableGroup) {
      digitGroups += 1;
      while (index < token.length && /\d/.test(token[index])) index += 1;
      lastWasClosableGroup = false;
      continue;
    }
    return { isStrong: false, isWeak: false };
  }

  return {
    isStrong: elementGroups >= 2 && digitGroups >= 1,
    isWeak: elementGroups >= 1 && digitGroups >= 1,
  };
}

function hasChemicalContext(text: string): boolean {
  const tokens = text.match(CHEMICAL_TOKEN_RE) || [];
  let weakMatches = 0;
  for (const token of tokens) {
    const analysis = analyzeChemicalToken(token);
    if (analysis.isStrong) return true;
    if (analysis.isWeak) weakMatches += 1;
  }
  return weakMatches >= 2;
}

function formatChemicalFormulaSegments(text: string): string {
  if (!hasChemicalContext(text)) return text;
  return text.replace(CHEMICAL_TOKEN_RE, (token) => {
    const analysis = analyzeChemicalToken(token);
    if (!analysis.isStrong && !analysis.isWeak) return token;
    return token.replace(/(?<=[A-Za-z\)])\d+/g, (digits) => toSubscriptDigits(digits));
  });
}

function normalizeLatexArtifacts(text: string): string {
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, expression: string) => `$$${expression.trim()}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, expression: string) => `$${expression.trim()}$`)
    .replace(/\$\s*\\mathrm\{R\}\s*\\\$\s*([\d.]+(?:,\d+)?)\s*\$/g, 'R$ $1')
    .replace(/\$\$\s*([\s\S]*?)\s*\$\$\s*0(?=\s|$)/g, '$$$$ $1 $$$$')
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\%/g, '%')
    .replace(/\\\$/g, '$')
    .replace(/\\&/g, '&')
    .replace(/\\#/g, '#')
    .replace(/\\_/g, '_')
    .replace(/\\\?/g, '?')
    .replace(/\\!/g, '!')
    .replace(/\\:/g, ':')
    .replace(/\\;/g, ';')
    .replace(/\\,/g, ',');
}

function normalizeInlineHtmlFormatting(text: string): string {
  return text
    .replace(/<\s*(strong|b)\s*>/gi, '**')
    .replace(/<\s*\/\s*(strong|b)\s*>/gi, '**');
}

function normalizeParagraphBreaks(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .join('\n\n');
}

function formatPlainScientificText(text: string): string {
  let formatted = normalizeParagraphBreaks(normalizeInlineHtmlFormatting(normalizeLatexArtifacts(text))).replace(
    UNIT_EXPONENT_RE,
    (_match, prefix: string, unit: string, spacing: string, exponent: string) =>
      `${prefix}${unit}${toSuperscriptDigits(exponent)}`
  );

  formatted = formatChemicalFormulaSegments(formatted);
  return formatted;
}

export function formatScientificText(text?: string | null): string {
  if (!text) return '';

  const withNormalizedMathDelimiters = String(text)
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, expression: string) => `$$${expression.trim()}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, expression: string) => `$${expression.trim()}$`);

  return withNormalizedMathDelimiters
    .split(MATH_SEGMENT_RE)
    .filter((segment) => segment.length > 0)
    .map((segment) => (
      segment.startsWith('$') ? segment : formatPlainScientificText(segment)
    ))
    .join('');
}
