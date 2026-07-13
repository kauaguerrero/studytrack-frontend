export interface OrgTypewriterTagline {
  staticText: string;
  animatedTexts: string[];
}

export const DEFAULT_ORG_TYPEWRITER_TAGLINE: OrgTypewriterTagline = {
  staticText: 'Nós nascemos para',
  animatedTexts: ['estudar.', 'evoluir.', 'aprovar.'],
};

export const ORG_TYPEWRITER_LIMITS = {
  staticTextMax: 80,
  animatedTextMax: 48,
  animatedMin: 1,
  animatedMax: 6,
};

export function normalizeOrgTypewriterTagline(value: unknown): OrgTypewriterTagline {
  if (!value || typeof value !== 'object') return DEFAULT_ORG_TYPEWRITER_TAGLINE;

  const candidate = value as Partial<OrgTypewriterTagline>;
  const staticText = typeof candidate.staticText === 'string'
    ? candidate.staticText.trim()
    : '';
  const animatedTexts = Array.isArray(candidate.animatedTexts)
    ? candidate.animatedTexts
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  if (!staticText || animatedTexts.length === 0) return DEFAULT_ORG_TYPEWRITER_TAGLINE;

  return {
    staticText: staticText.slice(0, ORG_TYPEWRITER_LIMITS.staticTextMax),
    animatedTexts: animatedTexts
      .slice(0, ORG_TYPEWRITER_LIMITS.animatedMax)
      .map((item) => item.slice(0, ORG_TYPEWRITER_LIMITS.animatedTextMax)),
  };
}

export function getOrgTypewriterPreviewKey(tagline: OrgTypewriterTagline): string {
  return `${tagline.staticText}::${tagline.animatedTexts.join('|')}`;
}
