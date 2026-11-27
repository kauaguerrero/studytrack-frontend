// Extensão do arquivo a partir do tipo real da imagem, nunca do nome que o usuário mandou.
// O recorte do avatar sempre gera JPEG: "foto.png" (ou ".svg") virava um arquivo .png/.svg
// com conteúdo JPEG no storage (bateria de segurança, P22).

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function extFromMime(mime: string | null | undefined, fallback = 'jpg'): string {
  return EXT_BY_MIME[(mime || '').toLowerCase()] ?? fallback;
}
