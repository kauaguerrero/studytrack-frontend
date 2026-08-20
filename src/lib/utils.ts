import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Transcrição de redação manuscrita às vezes preserva a quebra de linha física
// da folha (largura da página, em CRLF) em vez de só as quebras de parágrafo,
// deixando o texto com aparência "picotada" quando reflui numa coluna mais
// estreita (mobile). Uma quebra ISOLADA (\r\n ou \n sozinho) é linha física e
// vira espaço; duas ou mais seguidas (linha em branco real) são separação de
// parágrafo e ficam intactas. Cada substituição preserva o comprimento exato
// do trecho trocado, então não desalinha os offsets de anotações
// (start_offset/end_offset) já salvos contra o texto original.
export function normalizeEssayLineBreaks(text: string): string {
  return text.replace(/(?:\r\n|\n)+/g, (block) => {
    const tokens = block.match(/\r\n|\n/g) || []
    if (tokens.length <= 1) return ' '.repeat(block.length)
    return block
  })
}
