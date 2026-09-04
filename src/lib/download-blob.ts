// Util compartilhado para baixar uma resposta HTTP (ex.: PDF) como arquivo,
// usado tanto pela tela de simulados do founder quanto pelo wizard Personalizado.

export function filenameFromDisposition(disposition: string | null, fallback: string): string {
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
}

export async function downloadBlobResponse(res: Response, fallbackName: string) {
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filenameFromDisposition(res.headers.get('Content-Disposition'), fallbackName);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
