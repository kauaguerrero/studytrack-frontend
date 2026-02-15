// src/types/katex.d.ts
declare module 'katex/contrib/auto-render' {
    export default function renderMathInElement(elem: HTMLElement, options?: any): void;
}
declare module 'katex/dist/contrib/auto-render.mjs' {
    export default function renderMathInElement(elem: HTMLElement, options?: any): void;
}