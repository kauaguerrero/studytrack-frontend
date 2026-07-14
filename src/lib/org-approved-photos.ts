export interface OrgApprovedPhoto {
  url: string;
  path: string;
  alt: string;
}

export const ORG_APPROVED_PHOTOS_BUCKET = 'org-approved-photos';
export const ORG_APPROVED_PHOTOS_LIMITS = {
  maxFileSizeBytes: 2 * 1024 * 1024,
};

const VALID_URL_RE = /^https?:\/\//i;

export function normalizeOrgApprovedPhotos(value: unknown): OrgApprovedPhoto[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Partial<OrgApprovedPhoto>;
      const url = typeof candidate.url === 'string' ? candidate.url.trim() : '';
      const path = typeof candidate.path === 'string' ? candidate.path.trim() : '';
      const alt = typeof candidate.alt === 'string' && candidate.alt.trim()
        ? candidate.alt.trim()
        : `Aprovado ${index + 1}`;

      if (!url || !VALID_URL_RE.test(url) || !path) return null;
      return { url, path, alt };
    })
    .filter((item): item is OrgApprovedPhoto => Boolean(item));
}

export async function imageHasTransparentPixels(file: File): Promise<boolean> {
  const bitmap = await createImageBitmap(file);
  try {
    const sampleSize = 96;
    const canvas = document.createElement('canvas');
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;

    ctx.drawImage(bitmap, 0, 0, sampleSize, sampleSize);
    const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 250) return true;
    }
    return false;
  } finally {
    bitmap.close();
  }
}
