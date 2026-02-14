// src/types/katex.d.ts
declare module 'katex/dist/contrib/auto-render' {
    export default function renderMathInElement(elem: HTMLElement, options?: any): void;
}