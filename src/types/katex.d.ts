// Fallback para quando @types/katex não estiver disponível no ambiente do editor
declare module 'katex' {
    export function render(expr: string, options?: { displayMode?: boolean; throwOnError?: boolean; errorColor?: string }): string;
    const katex: { render: typeof render };
    export default katex;
}
