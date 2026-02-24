'use client'

import React, { useReducer, useEffect, useCallback, useRef, useState, useLayoutEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SkeletonLoader } from './SkeletonLoader';
import DOMPurify from 'isomorphic-dompurify';  // 🔐 SECURITY: XSS protection
import {
    CheckCircle2, Image as ImageIcon, RotateCcw, RotateCw,
    AlertCircle, X, Maximize2, Minimize2, Settings2,
    Bold, Italic, AlignLeft, AlignCenter, AlignRight, ZoomIn, ZoomOut,
    ChevronLeft, FileText, Printer, Layout, Sparkles, History,
    ShieldAlert, Loader2, Palette, ListOrdered, GraduationCap, AlertTriangle, Brain, Star, Send
} from 'lucide-react';
// Tipo do KaTeX carregado via CDN (evita dependência no build)
type KatexLib = { renderToString: (expr: string, options?: { displayMode?: boolean; throwOnError?: boolean; errorColor?: string }) => string };

// Auto-render LaTeX no elemento (usa lib passada; KaTeX é carregado via CDN)
function renderMathInElement(elem: HTMLElement, options: {
    delimiters?: { left: string; right: string; display: boolean }[];
    throwOnError?: boolean;
    errorColor?: string;
} | undefined, katexLib: KatexLib) {
    const defaultDelimiters = [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
    ];
    const delimiters = options?.delimiters ?? defaultDelimiters;
    const throwOnError = options?.throwOnError ?? false;
    const errorColor = options?.errorColor ?? '#cc0000';

    const ignoredTags = ['script', 'style', 'pre', 'code', 'textarea', 'option'];
    function walkTextNodes(node: Node, fn: (n: Text) => void) {
        if (node.nodeType === Node.TEXT_NODE) {
            fn(node as Text);
            return;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = (node as Element).tagName.toLowerCase();
            if (ignoredTags.includes(tag)) return;
        }
        const childNodes = Array.from(node.childNodes);
        childNodes.forEach((c) => walkTextNodes(c, fn));
    }

    type Segment = { type: 'text'; content: string } | { type: 'math'; content: string; display: boolean };
    function findSegments(text: string): Segment[] {
        const segments: Segment[] = [];
        let remaining = text;
        while (remaining.length > 0) {
            let best: { index: number; left: string; right: string; display: boolean; match: string; len: number } | null = null;
            for (const d of delimiters) {
                const idx = remaining.indexOf(d.left);
                if (idx === -1) continue;
                const afterLeft = remaining.slice(idx + d.left.length);
                const rightIdx = afterLeft.indexOf(d.right);
                if (rightIdx === -1) continue;
                const match = afterLeft.slice(0, rightIdx);
                const totalLen = d.left.length + match.length + d.right.length;
                if (best === null || idx < best.index || (idx === best.index && totalLen < best.len)) {
                    best = { index: idx, left: d.left, right: d.right, display: d.display, match, len: totalLen };
                }
            }
            if (best === null) {
                segments.push({ type: 'text', content: remaining });
                break;
            }
            if (best.index > 0) segments.push({ type: 'text', content: remaining.slice(0, best.index) });
            segments.push({ type: 'math', content: best.match, display: best.display });
            remaining = remaining.slice(best.index + best.len);
        }
        return segments;
    }

    const textNodes: Text[] = [];
    walkTextNodes(elem, (n) => textNodes.push(n));

    textNodes.forEach((textNode) => {
        const segments = findSegments(textNode.textContent || '');
        const hasMath = segments.some((s) => s.type === 'math');
        if (!hasMath) return;

        const frag = document.createDocumentFragment();
        for (const seg of segments) {
            if (seg.type === 'text') {
                frag.appendChild(document.createTextNode(seg.content));
            } else {
                const span = document.createElement('span');
                try {
                    // Substituído para 'renderToString' para gerar o HTML estático válido
                    span.innerHTML = katexLib.renderToString(seg.content, {
                        displayMode: seg.display,
                        throwOnError,
                        errorColor
                    });
                } catch (e) {
                    console.error("[KaTeX Render Error]:", e); // Visibilidade é inegociável
                    span.textContent = seg.content;
                    span.style.color = errorColor;
                }
                frag.appendChild(span);
            }
        }
        textNode.parentNode?.replaceChild(frag, textNode);
    });
}

// ============================================================================
// --- 1. CORE TYPES & INTERFACES
// ============================================================================

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type FontWeight = 'normal' | 'bold' | 'light';

export interface CSSPropertiesExtended {
    fontFamily: string;
    fontSize: string;
    lineHeight: string;
    textAlign: TextAlign;
    fontWeight: FontWeight;
    backgroundColor?: string; // Suporte a fundos coloridos (Irlen)
    color?: string;           // Suporte a contraste de texto
}

export interface AdaptedQuestion {
    id: number | string;
    original_excerpt: string;
    adapted_content: string;
    visual_cues: string;
    adaptation_justification: string;
    css_style: CSSPropertiesExtended;
}

export interface AdaptedExamMetadata {
    summary: string;
    student_name?: string;
    applied_conditions?: string[];
    version: number | string;
    audit_warnings?: string[];
    total_questions?: number; // Metadado vindo do Backend Batching
}

export interface AdaptedExamData {
    metadata: AdaptedExamMetadata;
    questions: AdaptedQuestion[];
}

type EditorAction =
    | { type: 'SET_DATA'; payload: AdaptedExamData }
    | { type: 'UPDATE_QUESTION'; payload: { index: number; field: keyof AdaptedQuestion; value: any } }
    | { type: 'UPDATE_STYLE'; payload: { index: number; field: keyof CSSPropertiesExtended; value: any } }
    | { type: 'SET_GLOBAL_BG'; payload: string }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'SET_SAVING'; payload: boolean }
    | { type: 'SET_LAST_SAVED'; payload: Date }
    | { type: 'SET_ZEN_MODE'; payload: boolean };

interface EditorState {
    data: AdaptedExamData;
    history: AdaptedExamData[];
    future: AdaptedExamData[];
    isSaving: boolean;
    lastSaved: Date | null;
    isZenMode: boolean;
    paperColor: string;
    originalAdaptedContents: string[];
}

// ============================================================================
// --- 2. UTILS & PARSERS (A Mágica WYSIWYG)
// ============================================================================

const protectMathForDOMPurify = (rawHtml: string): string => {
    if (!rawHtml) return '';
    const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^$\n]+?\$)/g;
    return rawHtml.replace(mathRegex, (match) => {
        return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    });
};

// Transforma tags de backend em HTML visualizável no Editor.
const parseBackendTagsToHTML = (htmlString: string): string => {
    if (!htmlString) return '';
    
    // FIX: Uso de SPAN (inline) com display: block para não corromper o <p> do HTML
    // Adicionado flag 'i' e flexibilidade de espaços caso o LLM erre a sintaxe da tag
    let parsed = htmlString.replace(/\[\[IMG_REF:\s*(.*?)\s*(?::\s*(AUTO|[\d.]+)\s*)?\]\]/gi, (match, url, ratio) => {
        const width = (!ratio || ratio.toUpperCase() === 'AUTO') ? '100%' : `${parseFloat(ratio) * 100}%`;
        return `<span style="display: block; page-break-inside: avoid !important; break-inside: avoid !important; text-align: center; margin: 15px 0;"><img src="${url}" alt="Imagem de apoio" class="wysiwyg-exam-img" style="max-width: ${width}; height: auto; display: inline-block; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" /></span>`;
    });
    
    // FIX: GAP blindado
    parsed = parsed.replace(/\[GAP:?(\d+)?\]/gi, (match, size) => {
        const width = size ? `${parseInt(size, 10)}ch` : '30px';
        return `<span style="display:inline-block; border-bottom: 1.5px solid #0f172a; width: ${width}; margin: 0 4px;"></span>`;
    });
    
    // FIX: Linhas de resposta blindadas como SPAN flexível
    parsed = parsed.replace(/\[LINHAS_RESPOSTA:(\d+)\]/gi, (match, count) => {
        const num = parseInt(count, 10) || 1;
        const lines = Array(num).fill(`<span style="display: block; border-bottom: 1.5px solid #1e293b; height: 24px; width: 100%;"></span>`).join('');
        return `<span class="answer-lines-container" style="margin-top: 8px; margin-bottom: 8px; width: 100%; display: flex; flex-direction: column; page-break-inside: avoid !important; break-inside: avoid !important;">${lines}</span>`;
    });
    return parsed;
};

// ============================================================================
// --- 3. REDUCER LOGIC
// ============================================================================

const MAX_HISTORY = 50;

function editorReducer(state: EditorState, action: EditorAction): EditorState {
    switch (action.type) {
        case 'SET_DATA':
            const suggestedBg = (action.payload.questions && action.payload.questions.length > 0)
                ? action.payload.questions[0].css_style?.backgroundColor
                : '#ffffff';

            const normalizedQuestions = action.payload.questions.map(q => ({
                ...q,
                adapted_content: parseBackendTagsToHTML(q.adapted_content)
            }));

            return {
                ...state,
                data: { ...action.payload, questions: normalizedQuestions },
                paperColor: suggestedBg || '#ffffff',
                originalAdaptedContents: normalizedQuestions.map(q => q.adapted_content)
            };

        case 'UPDATE_QUESTION': {
            const newQuestions = [...state.data.questions];
            newQuestions[action.payload.index] = {
                ...newQuestions[action.payload.index],
                [action.payload.field]: action.payload.value
            };
            const newData = { ...state.data, questions: newQuestions };
            const newHistory = [state.data, ...state.history].slice(0, MAX_HISTORY);
            return { ...state, data: newData, history: newHistory, future: [] };
        }

        case 'UPDATE_STYLE': {
            const newQuestions = [...state.data.questions];
            const currentStyle = newQuestions[action.payload.index].css_style || {};
            newQuestions[action.payload.index] = {
                ...newQuestions[action.payload.index],
                css_style: { ...currentStyle, [action.payload.field]: action.payload.value } as CSSPropertiesExtended
            };
            const newData = { ...state.data, questions: newQuestions };
            const newHistory = [state.data, ...state.history].slice(0, MAX_HISTORY);
            return { ...state, data: newData, history: newHistory, future: [] };
        }

        case 'SET_GLOBAL_BG':
            return { ...state, paperColor: action.payload };

        case 'UNDO':
            if (state.history.length === 0) return state;
            const previous = state.history[0];
            const newFuture = [state.data, ...state.future];
            const remainingHistory = state.history.slice(1);
            return { ...state, data: previous, history: remainingHistory, future: newFuture };

        case 'REDO':
            if (state.future.length === 0) return state;
            const next = state.future[0];
            const newHistoryRedo = [state.data, ...state.history].slice(0, MAX_HISTORY);
            const remainingFuture = state.future.slice(1);
            return { ...state, data: next, history: newHistoryRedo, future: remainingFuture };

        case 'SET_SAVING': return { ...state, isSaving: action.payload };
        case 'SET_LAST_SAVED': return { ...state, lastSaved: action.payload };
        case 'SET_ZEN_MODE': return { ...state, isZenMode: action.payload };
        default: return state;
    }
}

// ============================================================================
// --- 4. UI COMPONENTS
// ============================================================================

const ToolButton = ({ icon: Icon, label, active = false, onClick, disabled = false, shortcut = "" }: any) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={shortcut ? `${label} (${shortcut})` : label}
        className={`
      relative group flex items-center justify-center h-8 w-8 rounded-md transition-all duration-200 active:scale-95
      ${active ? 'bg-blue-100 text-blue-700 shadow-inner' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}
      ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
    `}
    >
        <Icon size={16} strokeWidth={2} />
    </button>
);

const StatusBadge = ({ saving, lastSaved }: { saving: boolean, lastSaved: Date | null }) => (
    <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full select-none">
        {saving ? (
            <>
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-blue-600">Salvando...</span>
            </>
        ) : (
            <>
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span className="text-slate-500">
                    {lastSaved ? `Salvo às ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Sincronizado'}
                </span>
            </>
        )}
    </div>
);

const KATEX_CDN = 'https://cdn.jsdelivr.net/npm/katex@0.16.28/dist';

// Carrega KaTeX via CDN com controle de concorrência (Race Condition Proof)
function useKaTeX(): KatexLib | null {
    const [katexLib, setKatexLib] = useState<KatexLib | null>(() => (typeof window !== 'undefined' ? (window as unknown as { katex?: KatexLib }).katex ?? null : null));

    useEffect(() => {
        const win = window as unknown as { katex?: KatexLib };
        if (win.katex) {
            setKatexLib(win.katex);
            return;
        }
        if (document.getElementById('katex-styles') == null) {
            const link = document.createElement('link');
            link.id = 'katex-styles';
            link.rel = 'stylesheet';
            link.href = `${KATEX_CDN}/katex.min.css`;
            document.head.appendChild(link);
        }
        
        const scriptId = 'katex-script';
        const existingScript = document.getElementById(scriptId);
        
        if (existingScript) {
            existingScript.addEventListener('load', () => {
                setKatexLib((window as unknown as { katex: KatexLib }).katex);
            });
            return;
        }
        
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `${KATEX_CDN}/katex.min.js`;
        script.async = true;
        script.addEventListener('load', () => {
            setKatexLib((window as unknown as { katex: KatexLib }).katex);
        });
        document.head.appendChild(script);
    }, []);

    return katexLib;
}

// --- COMPONENTE DE VISUALIZAÇÃO COM RENDERIZAÇÃO MATEMÁTICA ---
const LaTeXViewer = ({ htmlContent, dynamicStyle, className }: { htmlContent: string, dynamicStyle: any, className?: string }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const katexLib = useKaTeX();

    // 1. Sanitização isolada (Pura manipulação de string em memória)
    const sanitizedHTML = useMemo(() => {
        const mathProtectedHTML = protectMathForDOMPurify(htmlContent);
        return DOMPurify.sanitize(mathProtectedHTML, {
            ALLOWED_TAGS: ['p', 'b', 'strong', 'br', 'em', 'u', 'span', 'div', 'img', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'small', 'table', 'thead', 'tbody', 'tr', 'td', 'th'],
            ALLOWED_ATTR: ['class', 'style', 'src', 'alt', 'width', 'height'],
            FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
            FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
        });
    }, [htmlContent]);

    // 2. Isolamento Síncrono do Ciclo de Vida (useLayoutEffect)
    useLayoutEffect(() => {
        if (!containerRef.current) return;

        // ASSUMIMOS O CONTROLE MANUAL: O React não gerencia este innerHTML
        containerRef.current.innerHTML = sanitizedHTML;

        // MUTAMOS O DOM IMEDIATAMENTE: Antes que o navegador pinte a tela
        if (katexLib) {
            renderMathInElement(containerRef.current, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ],
                throwOnError: false,
                errorColor: '#cc0000'
            }, katexLib);
        }
    }, [sanitizedHTML, katexLib]); // Re-executa estritamente se o payload seguro mudar

    // 3. A Casca Vazia: O React re-renderiza apenas as classes e estilos CSS do wrapper
    return <div ref={containerRef} className={className} style={dynamicStyle} />;
};

// --- COMPONENTE DE EDIÇÃO DE TEXTO RICO (COM FLOATING TOOLBAR E SLIDER GRANULAR) ---
const ContentEditable = ({ html, onChange, style, className, autoFocus }: any) => {
    const divRef = useRef<HTMLDivElement>(null);
    const isFocused = useRef(false);
    
    // Estados da Toolbar Flutuante
    const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
    const [imgWidth, setImgWidth] = useState<string>('100');

    useLayoutEffect(() => {
        // 1. Blinda a matemática
        const mathProtected = protectMathForDOMPurify(html);

        // 2. Sanitiza HTML antes de injetar
        const sanitized = DOMPurify.sanitize(mathProtected, {
            ALLOWED_TAGS: ['p', 'b', 'strong', 'br', 'em', 'u', 'span', 'div', 'img', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'small', 'table', 'thead', 'tbody', 'tr', 'td', 'th'],
            ALLOWED_ATTR: ['class', 'style', 'src', 'alt', 'width', 'height'],
            FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
            FORBID_ATTR: ['onerror', 'onload', 'onclick']
        });

        if (divRef.current && sanitized !== divRef.current.innerHTML) {
            if (!isFocused.current) {
                divRef.current.innerHTML = sanitized;
                setSelectedImg(null); 
            }
        }
    }, [html]);

    useEffect(() => {
        if (autoFocus && divRef.current) {
            divRef.current.focus();
            try {
                const range = document.createRange();
                range.selectNodeContents(divRef.current);
                range.collapse(false);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
            } catch (e) { /* Ignore */ }
        }
    }, [autoFocus]);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        if (onChange) onChange(e.currentTarget.innerHTML);
    };

    // Rastreia cliques. Captura a imagem e lê sua largura atual para setar no Slider
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG') {
            const imgEl = target as HTMLImageElement;
            setSelectedImg(imgEl);
            
            // Extrai a porcentagem atual da imagem (ou assume 100% se não houver)
            const currentMax = imgEl.style.maxWidth;
            const val = currentMax && currentMax.includes('%') ? currentMax.replace('%', '') : '100';
            setImgWidth(val);
        } else {
            setSelectedImg(null);
        }
    };

    // Atualiza a imagem em tempo real enquanto o professor arrasta o slider
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setImgWidth(val);
        
        if (selectedImg && divRef.current) {
            selectedImg.style.maxWidth = `${val}%`;
            // Dispara o onChange para garantir que o React/Supabase salvem o novo tamanho
            if (onChange) onChange(divRef.current.innerHTML);
        }
    };

    // Deleta a imagem e seu cofre protetor
    const deleteSelectedImage = () => {
        if (selectedImg && divRef.current) {
            const parent = selectedImg.parentElement;
            if (parent && parent.tagName === 'SPAN' && parent.style.display === 'block') {
                parent.remove(); 
            } else {
                selectedImg.remove();
            }
            setSelectedImg(null);
            if (onChange) onChange(divRef.current.innerHTML);
        }
    };

    return (
        <div className="relative">
            <div
                ref={divRef}
                className={className}
                style={{
                    ...style,
                    outline: 'none',
                    cursor: 'text',
                    whiteSpace: 'pre-wrap',
                    minHeight: '1.5em'
                }}
                contentEditable
                onInput={handleInput}
                onClick={handleClick}
                onFocus={() => isFocused.current = true}
                onBlur={() => isFocused.current = false}
                suppressContentEditableWarning
            />

            {/* BARRA FLUTUANTE DA IMAGEM (Nível Enterprise) */}
            {selectedImg && (
                <div
                    className="absolute z-[100] flex items-center gap-3 bg-slate-800 border border-slate-700 shadow-2xl p-2 rounded-lg no-print animate-in zoom-in-95 duration-200"
                    style={{
                        top: Math.max(0, selectedImg.offsetTop - 55),
                        left: Math.max(0, selectedImg.offsetLeft + (selectedImg.offsetWidth / 2) - 140),
                    }}
                >
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ajuste:</span>
                        
                        {/* O SLIDER (Input Range Nativo com Accent do Tailwind) */}
                        <input
                            type="range"
                            min="15"
                            max="100"
                            value={imgWidth}
                            onChange={handleSliderChange}
                            className="w-24 h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            title="Arraste para redimensionar"
                        />
                        <span className="text-xs font-mono text-slate-300 w-9 text-right">{imgWidth}%</span>
                    </div>

                    <div className="w-px h-5 bg-slate-700 mx-1" />
                    
                    <button 
                        onMouseDown={(e) => { e.preventDefault(); deleteSelectedImage(); }} 
                        className="px-2 py-1 text-xs text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors font-bold flex items-center gap-1" 
                        title="Excluir Imagem Definitivamente"
                    >
                        <X size={14}/> Remover
                    </button>
                </div>
            )}
        </div>
    );
};

const AutoResizingTextarea = ({ value, onChange, style, autoFocus, className }: any) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [value, style]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            className={`${className} overflow-hidden`}
            style={style}
            autoFocus={autoFocus}
            rows={1}
        />
    );
};

// ============================================================================
// --- 5. MAIN COMPONENT (Professional Print Engine)
// ============================================================================

interface EditorProps {
    jobId: string;
    initialData: AdaptedExamData;
    status: string;
    filename: string;
    studentId?: string;
}

export function AdaptationEditor({ jobId, initialData, status, filename, studentId }: EditorProps) {
    const supabase = createClient();
    const router = useRouter();

    const isProcessing = !initialData?.questions || initialData.questions.length === 0;

    const parsedInitialData = useMemo(() => ({
        ...initialData,
        questions: initialData.questions?.map(q => ({
            ...q,
            adapted_content: parseBackendTagsToHTML(q.adapted_content)
        })) || []
    }), [initialData]);

    const initialBg = (parsedInitialData.questions && parsedInitialData.questions.length > 0)
        ? (parsedInitialData.questions[0].css_style?.backgroundColor || '#ffffff')
        : '#ffffff';

    const [state, dispatch] = useReducer(editorReducer, {
        data: parsedInitialData,
        history: [],
        future: [],
        isSaving: false,
        lastSaved: null,
        isZenMode: false,
        paperColor: initialBg,
        originalAdaptedContents: parsedInitialData.questions.map(q => q.adapted_content)
    });

    // Sincroniza o Reducer interno do React quando os dados chegarem do Webhook/Realtime
    useEffect(() => {
        if (parsedInitialData.questions && parsedInitialData.questions.length > 0) {
            dispatch({ type: 'SET_DATA', payload: parsedInitialData });
        }
    }, [parsedInitialData]);

    const [activeIdx, setActiveIdx] = useState<number | null>(null);
    const [zoom, setZoom] = useState(100);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
    const [feedbackRating, setFeedbackRating] = useState<number>(0);
    const [feedbackNotes, setFeedbackNotes] = useState('');
    const [feedbackSending, setFeedbackSending] = useState(false);
    const [feedbackSent, setFeedbackSent] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [bnccReport, setBnccReport] = useState<any>(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [isUploadingImg, setIsUploadingImg] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const questionList = useMemo(() => state.data.questions, [state.data.questions]);

    const handleInsertImageWysiwyg = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || activeIdx === null) return;

        setIsUploadingImg(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Não autenticado");

            const formData = new FormData();
            formData.append('image', file);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/enterprise/inclusion/upload-image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro no upload');

            const imgHtml = `<img src="${data.url}" alt="Imagem Adicionada" class="wysiwyg-exam-img" style="max-width: 100%; height: auto; display: block; margin: 15px auto; border-radius: 8px; resize: both; overflow: hidden;" />`;

            // API nativa para injetar no ponto exato do cursor
            document.execCommand('insertHTML', false, imgHtml);

            // Atualiza o estado lendo o DOM modificado para não perder o tracking do React
            const activeEl = document.querySelector(`#q-${activeIdx} [contenteditable]`);
            if (activeEl) {
                dispatch({
                    type: 'UPDATE_QUESTION',
                    payload: { index: activeIdx, field: 'adapted_content', value: activeEl.innerHTML }
                });
            }

            showToast("Imagem inserida com sucesso!", "success");
        } catch (error: any) {
            showToast(error.message, "error");
        } finally {
            setIsUploadingImg(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const scrollToQuestion = (index: number) => {
        const el = document.getElementById(`q-${index}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setActiveIdx(index);
        }
    };

    const saveData = useCallback(async (manual = false) => {
        dispatch({ type: 'SET_SAVING', payload: true });
        try {
            const dataToSave = {
                ...state.data,
                questions: state.data.questions.map(q => ({
                    ...q,
                    css_style: { ...q.css_style, backgroundColor: state.paperColor }
                }))
            };

            // Cache local preservado. A invalidação estrutural será feita apenas se o texto mudar drasticamente, não no auto-save de layout.
            const payload: any = {
                final_json_data: dataToSave,
                updated_at: new Date().toISOString()
            };
            const { error } = await supabase.from('adapted_exams').update(payload).eq('id', jobId);

            if (error) throw error;
            dispatch({ type: 'SET_LAST_SAVED', payload: new Date() });
            if (manual) showToast("Progresso salvo com sucesso!", 'success');
        } catch (err) {
            showToast("Falha ao salvar.", 'error');
        } finally {
            dispatch({ type: 'SET_SAVING', payload: false });
        }
    }, [state.data, state.paperColor, jobId, supabase]);

    useEffect(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        if (state.history.length > 0 || state.paperColor !== initialBg) {
            saveTimeoutRef.current = setTimeout(() => saveData(), 2000);
        }
        return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
    }, [state.data, state.paperColor, saveData]);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const submitFeedback = useCallback(async () => {
        if (!studentId || feedbackRating < 1 || feedbackSending || feedbackSent) return;
        setFeedbackSending(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { showToast('Faça login para enviar feedback.', 'error'); setFeedbackSending(false); return; }
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/enterprise/inclusion/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({
                    student_id: studentId,
                    success_rating: feedbackRating,
                    teacher_notes: feedbackNotes.trim() || undefined,
                    job_id: jobId,
                    question_index: activeIdx ?? 0,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao enviar');
            setFeedbackSent(true);
            showToast('Feedback enviado com sucesso!', 'success');
        } catch (e: any) {
            showToast(e.message || 'Falha ao enviar feedback.', 'error');
        } finally {
            setFeedbackSending(false);
        }
    }, [studentId, feedbackRating, feedbackNotes, feedbackSending, feedbackSent, jobId, activeIdx, supabase]);

    // --- Geração de PDF client-side nativa (impressão do DOM com @media print) ---
    const handlePrintPDF = async () => {
        setActiveIdx(null);
        setSidebarOpen(false); // Garante que a sidebar não interfira no reflow
        showToast("Preparando documento, aguarde...", 'success');

        // 1. Salva progresso no banco
        await saveData();

        // 2. Prepara a variável CSS para a impressão do fundo (Cores Irlen, etc)
        const root = document.documentElement;
        const prevBg = root.style.getPropertyValue('--print-bg-color');
        root.style.setProperty('--print-bg-color', state.paperColor || '#ffffff');

        // 3. Estratégia Anti-SPOF (Garante que as imagens estão no cache antes do print)
        const printArea = document.getElementById('print-area');
        if (printArea) {
            const images = Array.from(printArea.getElementsByTagName('img'));
            const imagePromises = images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve; // Resolve mesmo com erro para não travar
                });
            });

            // Espera imagens carregarem ou dá timeout de 2.5s
            await Promise.race([Promise.all(imagePromises), new Promise(res => setTimeout(res, 2500))]);
        }

        // 4. Delay de segurança para o DOM repintar sem a sidebar e aplicar o CSS
        await new Promise(resolve => setTimeout(resolve, 300));

        // 5. Aciona o motor nativo (A thread do JS pausa aqui até o usuário fechar o modal)
        try {
            window.print();
        } catch (error: any) {
            showToast(error.message || "Falha ao abrir diálogo de impressão.", 'error');
        } finally {
            // 6. Restaura a limpeza do root
            if (prevBg) root.style.setProperty('--print-bg-color', prevBg);
            else root.style.removeProperty('--print-bg-color');
        }
    };

    // --- FUNÇÃO DO RELATÓRIO BNCC ---
    const handleGenerateReport = async () => {
        setReportModalOpen(true);
        if (bnccReport) return; // Se já gerou nesta sessão, usa o cache local

        setIsGeneratingReport(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Não autenticado.");

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/enterprise/inclusion/job/${jobId}/bncc-report`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Erro ao gerar relatório');
            setBnccReport(data.report);

        } catch (e: any) {
            showToast(e.message, 'error');
            setReportModalOpen(false);
        } finally {
            setIsGeneratingReport(false);
        }
    };

    return (
        <div className={`flex flex-col h-full bg-[#F3F4F6] relative transition-all duration-300 ${state.isZenMode ? 'fixed inset-0 z-50' : ''}`}>

            {isProcessing && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center">
                    <SkeletonLoader
                        filename={filename}
                        studentName={state.data.metadata?.student_name || "Aluno Não Identificado"}
                    />
                </div>
            )}

            <style jsx global>{`
    /* Garante hifenação segura e legibilidade acessível */
    #print-area .whitespace-pre-wrap {
        white-space: pre-wrap;
        word-break: normal; 
        overflow-wrap: break-word;
        hyphens: auto;
    }

    @media print {
        /* 1. OBLITERA A UI GLOBAL (O Isolamento Absoluto) */
        header, aside, nav, button, .no-print, .editor-toolbar, .w-14 {
            display: none !important;
        }

        /* 2. ACHATA A HIERARQUIA EXTERNA (Blindado contra "Fogo Amigo") */
        /* O :not() impede que a regra ressuscite a Nav Rail, Sidebar ou o Header caso usem classes do Tailwind */
        body, html, #__next, main, 
        .flex-col:not(aside):not(header):not(nav):not(.w-14):not(.no-print), 
        .flex-1:not(aside):not(header):not(nav):not(.w-14):not(.no-print), 
        .overflow-hidden, .overflow-y-auto, .py-12, .px-8, .pb-32 {
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important; /* CRÍTICO: Remove o padding externo que espreme a prova */
            width: 100% !important;
            background: transparent !important;
        }

        /* 3. O DOM GOVERNA A FOLHA */
        #print-area {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 15mm 20mm !important; /* Respiro físico da impressora */
            transform: none !important; /* Mata o zoom do React */
            zoom: 1 !important;
            box-shadow: none !important;
            border: none !important;
            background-color: var(--print-bg-color, white) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        /* 4. CONFIGURA A FOLHA A4 FÍSICA */
        @page {
            margin: 0; 
            size: A4;
        }
        
        /* 5. A CURA DOS BURACOS EM BRANCO E PROTEÇÃO DE CONTEÚDO */
        .question-block { 
            page-break-inside: auto !important; 
            break-inside: auto !important; 
            margin-bottom: 1rem !important;
        }
        
        /* Protege elementos que não podem ser rasgados ao meio na virada da página */
        .question-block img, 
        .answer-lines-container,
        .wysiwyg-exam-img,
        #exam-header {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }
        
        /* 6. FORÇA A QUEBRA DE LINKS GIGANTES */
        #print-area a {
            word-break: break-all !important; 
        }
    }
    
    /* Melhora a UX do editor: Mostra que a imagem é interativa */
    .wysiwyg-exam-img {
        cursor: pointer;
        transition: outline 0.2s ease;
    }
    .wysiwyg-exam-img:hover {
        outline: 3px dashed #94a3b8;
    }
`}</style>

            {/* 1. TOP BAR */}
            {!state.isZenMode && (
                <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-30 shrink-0 no-print">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <FileText size={16} className="text-blue-600" />
                                <span className="truncate max-w-[300px]" title={filename}>{filename}</span>
                            </h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Adaptation Engine V3.0</p>
                                {state.data.metadata.total_questions && (
                                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-bold border border-slate-200 flex items-center gap-1">
                                        <ListOrdered size={10} /> {state.data.metadata.total_questions} Itens
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <StatusBadge saving={state.isSaving} lastSaved={state.lastSaved} />
                        <div className="h-6 w-px bg-slate-200" />
                        <button
                            onClick={handleGenerateReport}
                            className="bg-purple-100 text-purple-700 border border-purple-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-purple-200 transition-all flex items-center gap-2 active:scale-95 shadow-sm no-print"
                        >
                            <ShieldAlert size={14} /> Relatório BNCC
                        </button>

                        <button
                            onClick={handlePrintPDF}
                            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-slate-900/20"
                        >
                            <Printer size={14} /> Imprimir / Gerar PDF
                        </button>
                    </div>
                </header>
            )}

            {/* 2. EDITOR TOOLBAR */}
            <div className={`bg-white/90 backdrop-blur-md border-b border-slate-200/60 px-6 py-2 flex items-center justify-between z-20 sticky top-0 transition-all duration-300 no-print ${state.isZenMode ? 'px-8 py-3' : ''}`}>
                <div className="flex items-center gap-1">
                    
                    {/* CONTROLES GLOBAIS (Não dependem do activeIdx) */}
                    <div className="flex items-center gap-2 mr-4 border-r border-slate-200 pr-4">
                        <Palette size={16} className="text-slate-400" />
                        <div className="flex gap-1">
                            {[
                                { color: '#ffffff', label: 'Branco' },
                                { color: '#fffbeb', label: 'Creme (Irlen)' },
                                { color: '#eff6ff', label: 'Azul (Suave)' },
                                { color: '#f0fdf4', label: 'Verde (Descanso)' },
                                { color: '#faf5ff', label: 'Roxo (Foco)' } 
                            ].map((bg) => (
                                <button
                                    key={bg.color}
                                    onClick={() => dispatch({ type: 'SET_GLOBAL_BG', payload: bg.color })}
                                    className={`w-5 h-5 rounded-full border shadow-sm transition-transform hover:scale-110 ${state.paperColor === bg.color ? 'ring-2 ring-slate-400 ring-offset-1 scale-110' : 'border-slate-200'}`}
                                    style={{ backgroundColor: bg.color }}
                                    title={`Fundo ${bg.label}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* CONTROLES LOCAIS (Exigem que o usuário tenha clicado em uma questão) */}
                    {activeIdx !== null ? (
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md shadow-sm px-1 h-9">
                                <select
                                    className="text-xs border-none focus:ring-0 text-slate-700 w-24 font-medium bg-transparent cursor-pointer outline-none"
                                    value={state.data.questions[activeIdx].css_style?.fontFamily}
                                    onChange={(e) => dispatch({ type: 'UPDATE_STYLE', payload: { index: activeIdx, field: 'fontFamily', value: e.target.value } })}
                                >
                                    <option value="Arial">Arial</option>
                                    <option value="Verdana">Verdana</option>
                                    <option value="OpenDyslexic">OpenDyslexic</option>
                                    <option value="Helvetica">Helvetica</option>
                                </select>
                                <div className="w-px h-4 bg-slate-200 mx-1" />
                                <select
                                    className="text-xs border-none focus:ring-0 text-slate-700 w-16 font-medium bg-transparent cursor-pointer outline-none"
                                    value={state.data.questions[activeIdx].css_style?.fontSize}
                                    onChange={(e) => dispatch({ type: 'UPDATE_STYLE', payload: { index: activeIdx, field: 'fontSize', value: e.target.value } })}
                                >
                                    {['12px', '14px', '16px', '18px', '20px', '24px', '28px'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            
                            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                                <ToolButton icon={Bold} active={state.data.questions[activeIdx].css_style?.fontWeight === 'bold'} onClick={() => dispatch({ type: 'UPDATE_STYLE', payload: { index: activeIdx, field: 'fontWeight', value: state.data.questions[activeIdx].css_style?.fontWeight === 'bold' ? 'normal' : 'bold' } })} />
                                <ToolButton icon={Italic} />
                                
                                <div className="w-px h-4 bg-slate-200 mx-1" />
                                
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleInsertImageWysiwyg} 
                                    accept="image/png, image/jpeg" 
                                    className="hidden" 
                                />
                                <button
                                    onMouseDown={(e) => e.preventDefault()} 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingImg}
                                    title="Inserir Imagem na Questão"
                                    className={`relative flex items-center justify-center h-8 w-8 rounded-md transition-all duration-200 active:scale-95 ${isUploadingImg ? 'opacity-50 cursor-not-allowed text-blue-500' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'}`}
                                >
                                    {isUploadingImg ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} strokeWidth={2} />}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-slate-400 text-xs italic pl-4">
                            <Layout size={14} /> Selecione uma questão para editar
                        </div>
                    )}
                </div>
                
                {/* MENU DE VISUALIZAÇÃO E ZOOM */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 rounded-md px-2 py-1">
                        <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1 hover:bg-slate-200 rounded"><ZoomOut size={14} /></button>
                        <span className="text-[10px] font-mono w-8 text-center select-none">{zoom}%</span>
                        <button onClick={() => setZoom(z => Math.min(150, z + 10))} className="p-1 hover:bg-slate-200 rounded"><ZoomIn size={14} /></button>
                    </div>
                    <div className="h-6 w-px bg-slate-200 mx-2" />
                    <ToolButton icon={state.isZenMode ? Minimize2 : Maximize2} onClick={() => dispatch({ type: 'SET_ZEN_MODE', payload: !state.isZenMode })} label="Zen Mode" />
                    <ToolButton icon={state.isZenMode ? Settings2 : Layout} onClick={() => setSidebarOpen(!sidebarOpen)} active={sidebarOpen} label="Sidebar" />
                </div>
            </div>

            {/* 3. MAIN WORKSPACE */}
            <div className="flex-1 overflow-hidden flex relative">

                {/* [NAVIGATION RAIL] */}
                <nav className="w-14 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-2 overflow-y-auto no-print z-10 hidden sm:flex shrink-0 print:hidden">
                    <div className="text-[10px] font-bold text-slate-300 uppercase mb-2 text-center">Nav</div>
                    {questionList.map((q, i) => (
                        <button
                            key={q.id || i}
                            onClick={() => scrollToQuestion(i)}
                            className={`
                                w-8 h-8 rounded-full text-[10px] font-bold flex items-center justify-center transition-all shrink-0 active:scale-95
                                ${activeIdx === i ? 'bg-blue-600 text-white shadow-md scale-110' : 'bg-slate-100 text-slate-400 hover:bg-blue-500 hover:text-white'}
                            `}
                            title={`Ir para questão ${i + 1}`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </nav>

                <div
                    className="flex-1 overflow-y-auto bg-slate-100/50 flex justify-center cursor-default pb-32"
                    onClick={() => setActiveIdx(null)}
                >
                    <div className="py-12 px-8 min-h-min w-full flex justify-center items-start">

                        <div
                            id="print-area"
                            className="shadow-[0_4px_30px_rgba(0,0,0,0.08)] border border-slate-200/80 transition-all duration-300 ease-out origin-top relative"
                            style={{
                                width: '210mm',
                                minHeight: '297mm',
                                height: 'auto',
                                backgroundColor: state.paperColor,
                                transform: `scale(${zoom / 100})`,
                                padding: '25mm',
                                marginBottom: `${(zoom - 100) * 5}px`
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* [HEADER DA PROVA ORIGINAL DO STUDYTRACK] */}
                            <div id="exam-header" style={{ borderBottom: '2px solid #1e293b', paddingBottom: '8px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontFamily: 'sans-serif' }}>
                                <div>
                                    <h1 style={{ fontSize: '30px', fontWeight: '900', textTransform: 'uppercase', color: '#0f172a', margin: 0, lineHeight: 1 }}>Avaliação</h1>
                                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>StudyTrack</span>
                                        <span style={{ height: '12px', width: '1px', backgroundColor: '#cbd5e1', display: 'inline-block' }}></span>
                                        <span>Grupo Neder Educação</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                                    <div style={{ fontSize: '12px', color: '#475569', fontWeight: '500', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: '700', color: '#0f172a', textTransform: 'uppercase' }}>Aluno:</span> {state.data.metadata.student_name || "_______________________"}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#475569', fontWeight: '500' }}>
                                        <span style={{ fontWeight: '700', color: '#0f172a', textTransform: 'uppercase' }}>Data:</span> {new Date().toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            {/* QUESTIONS RENDERER */}
                            <div className="space-y-4">
                                {questionList.map((q, idx) => {
                                    const isActive = activeIdx === idx;
                                    const hasWarning = q.adaptation_justification?.includes("⚠️");

                                    const dynamicStyle = {
                                        fontFamily: q.css_style?.fontFamily || 'Arial',
                                        fontSize: q.css_style?.fontSize || '16px',
                                        fontWeight: q.css_style?.fontWeight || 'normal',
                                        textAlign: q.css_style?.textAlign || 'left',
                                        lineHeight: q.css_style?.lineHeight || '1.5',
                                        color: q.css_style?.color || 'inherit'
                                    };

                                    return (
                                        <div
                                            key={q.id || idx}
                                            id={`q-${idx}`}
                                            className={`question-block transition-all duration-150 ${isActive ? 'bg-black/5 border-l-4 border-blue-500' : 'border-l-4 border-transparent hover:border-slate-300'} ${hasWarning ? 'border-l-amber-500 bg-amber-50/10' : ''}`}
                                            style={{
                                                position: 'relative',
                                                paddingLeft: '1rem',
                                                marginLeft: '-1rem',
                                                borderTopRightRadius: '0.5rem',
                                                borderBottomRightRadius: '0.5rem'
                                            }}
                                            onClick={(e) => { e.stopPropagation(); setActiveIdx(idx); }}
                                        >
                                            <span
                                                className="select-none transition-colors"
                                                style={{
                                                    position: 'absolute',
                                                    left: '-2.5rem',
                                                    top: '0.5rem',
                                                    fontSize: '18px',
                                                    fontWeight: '900',
                                                    color: isActive ? '#0848d1' : '#94a3b8',
                                                    fontFamily: 'sans-serif',
                                                    textAlign: 'right',
                                                    width: '2rem'
                                                }}
                                            >
                                                {idx + 1}.
                                            </span>

                                            {q.adaptation_justification && q.adaptation_justification.trim() && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveIdx(idx);
                                                        setSidebarOpen(true);
                                                    }}
                                                    className="absolute -right-10 top-2 p-2 bg-purple-500 border border-purple-400 rounded-full shadow-sm hover:bg-purple-600 hover:border-purple-500 transition-all duration-200 text-white no-print group"
                                                    title="Ver explicações da IA sobre esta adaptação"
                                                >
                                                    <Brain size={16} className="group-hover:scale-110 transition-transform" />
                                                </button>
                                            )}

                                            {/* Conteúdo Editável / Visualização com KaTeX */}
                                            <div className="p-2">
                                                {isActive ? (
                                                    <ContentEditable
                                                        html={q.adapted_content}
                                                        onChange={(val: string) => dispatch({ type: 'UPDATE_QUESTION', payload: { index: idx, field: 'adapted_content', value: val } })}
                                                        className="w-full bg-transparent resize-none outline-none p-0 m-0 block"
                                                        style={dynamicStyle}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <LaTeXViewer
                                                        htmlContent={q.adapted_content}
                                                        dynamicStyle={dynamicStyle}
                                                        className="whitespace-pre-wrap"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer */}
                            <div className="mt-20 pt-8 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-500 font-mono uppercase">
                                <span>StudyTrack | Grupo Neder Educação</span>
                                <span>{filename}</span>
                            </div>

                        </div>
                    </div>
                </div>

                {/* 4. SIDEBAR */}
                {sidebarOpen && (
                    <aside className="w-[340px] bg-white border-l border-slate-200 shadow-xl z-10 flex flex-col animate-in slide-in-from-right duration-300 no-print">
                        <div className="h-12 border-b border-slate-100 flex items-center px-4 bg-slate-50/50 justify-between">
                            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Informações da prova</span>
                            <button onClick={() => setSidebarOpen(false)}><X size={16} className="text-slate-400 hover:text-red-500" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {activeIdx !== null ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                                            <Sparkles className="text-purple-500" size={14} /> Por que essa adaptação foi feita
                                        </h3>
                                        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 shadow-sm relative overflow-hidden">
                                            <p className="text-xs text-slate-700 leading-relaxed relative z-10">{state.data.questions[activeIdx].adaptation_justification}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                                            <History className="text-blue-500" size={14} /> Questão original
                                        </h3>
                                        <div className="bg-slate-50 rounded-lg p-3 border-l-2 border-blue-400 text-xs text-slate-600 italic">"{state.data.questions[activeIdx].original_excerpt}"</div>
                                        <div className="mt-2 flex gap-2">
                                            {state.data.questions[activeIdx].adapted_content === state.data.questions[activeIdx].original_excerpt ? (
                                                <button className="text-[10px] font-bold text-green-600 hover:underline flex items-center gap-1 uppercase tracking-wide" onClick={() => dispatch({ type: 'UPDATE_QUESTION', payload: { index: activeIdx, field: 'adapted_content', value: state.originalAdaptedContents[activeIdx] } })}>
                                                    <RotateCw size={10} /> Voltar à versão adaptada
                                                </button>
                                            ) : (
                                                <button className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 uppercase tracking-wide" onClick={() => dispatch({ type: 'UPDATE_QUESTION', payload: { index: activeIdx, field: 'adapted_content', value: state.data.questions[activeIdx].original_excerpt } })}>
                                                    <RotateCcw size={10} /> Usar versão original
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {state.data.metadata.audit_warnings && state.data.metadata.audit_warnings.length > 0 && (
                                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                            <h4 className="text-amber-800 font-bold text-sm mb-2 flex items-center gap-2"><ShieldAlert size={14} /> Auditoria de IA</h4>
                                            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                                                {state.data.metadata.audit_warnings.map((w, i) => <li key={i}>{w}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                        <h4 className="text-blue-800 font-bold text-sm mb-1">Resumo</h4>
                                        <p className="text-xs text-blue-600/80 leading-relaxed">{state.data.metadata.summary}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Condições Aplicadas</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {state.data.metadata.applied_conditions?.map((c, i) => <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full border border-slate-200">{c}</span>)}
                                        </div>
                                    </div>

                                    {studentId && (
                                        <div className="pt-6 border-t border-slate-200">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                                <GraduationCap size={14} /> Feedback sobre esta adaptação
                                            </h4>
                                            {feedbackSent ? (
                                                <p className="text-xs text-emerald-600 font-medium flex items-center gap-2"><CheckCircle2 size={14} /> Enviado.</p>
                                            ) : (
                                                <>
                                                    <div className="flex gap-1 mb-3">
                                                        {[1, 2, 3, 4, 5].map((n) => (
                                                            <button key={n} type="button" onClick={() => setFeedbackRating(n)} className="p-1 rounded hover:bg-amber-50" title={`${n} estrela(s)`}>
                                                                <Star size={20} className={feedbackRating >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <textarea placeholder="Observações (opcional)" value={feedbackNotes} onChange={(e) => setFeedbackNotes(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg p-2 resize-none h-16 mb-2" />
                                                    <button type="button" onClick={submitFeedback} disabled={feedbackRating < 1 || feedbackSending} className="w-full py-2 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-black transition-colors">
                                                        {feedbackSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                                        {feedbackSending ? 'Enviando...' : 'Enviar feedback'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </aside>
                )}
            </div>

            {/* INÍCIO DO MODAL BNCC */}
            {reportModalOpen && (
                // 1. Removemos o no-print daqui. Usamos print:block e print:relative para soltar o modal na folha
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 print:block print:p-0 print:bg-white print:static">

                    {/* 2. Soltamos a altura (h-auto) e larguras máximas para o papel */}
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 print:h-auto print:max-w-none print:w-full print:shadow-none print:rounded-none">

                        {/* 3. O cabeçalho com botões some na impressão (print:hidden) */}
                        <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-slate-50 shrink-0 print:hidden">
                            <div>
                                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <ShieldAlert className="text-purple-600" size={20} />
                                    Parecer de Conformidade Legal e Pedagógica
                                </h2>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Mapeamento estrutural de habilidades BNCC mantidas na adaptação.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => window.print()} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors">Imprimir Relatório</button>
                                <button onClick={() => setReportModalOpen(false)} className="p-2 hover:bg-red-100 text-slate-500 hover:text-red-600 rounded-lg transition-colors"><X size={20} /></button>
                            </div>
                        </div>

                        {/* 4. A área de rolagem é liberada para crescer (print:overflow-visible) */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 print:overflow-visible print:bg-white print:p-0" id="report-print-area">
                            {isGeneratingReport ? (
                                <div className="space-y-4 print:hidden">
                                    <div className="mb-6 flex flex-col items-center justify-center text-purple-600 mb-8 mt-4">
                                        <Loader2 size={32} className="animate-spin mb-3" />
                                        <p className="text-sm font-bold animate-pulse">A Inteligência Artificial está realizando a perícia pedagógica...</p>
                                        <p className="text-xs text-slate-400 mt-1">Isso pode levar alguns segundos dependendo do tamanho da prova.</p>
                                    </div>
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-pulse">
                                            <div className="flex items-start gap-3 mb-3 border-b border-slate-100 pb-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0"></div>
                                                <div className="space-y-2 flex-1">
                                                    <div className="h-4 w-20 bg-green-100 rounded"></div>
                                                    <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2 mt-2">
                                                <div className="h-3 w-1/3 bg-slate-200 rounded"></div>
                                                <div className="h-3 w-full bg-slate-200 rounded"></div>
                                                <div className="h-3 w-5/6 bg-slate-200 rounded"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : bnccReport && (
                                <div className="space-y-4">
                                    {/* CABEÇALHO DO RELATÓRIO EXCLUSIVO PARA IMPRESSÃO */}
                                    <div className="hidden print:block mb-8 text-center border-b-2 border-slate-800 pb-4">
                                        <h1 className="text-2xl font-black text-slate-900 uppercase">Parecer de Conformidade Legal e Pedagógica</h1>
                                        <p className="text-sm text-slate-600 mt-1">StudyTrack - Mapeamento Estrutural de Habilidades BNCC</p>
                                    </div>

                                    {bnccReport.items.map((item: any, i: number) => (
                                        <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm print:shadow-none print:border-slate-300 print:mb-6">
                                            <div className="flex items-start justify-between mb-3 border-b border-slate-100 pb-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center border border-slate-200 print:border-slate-400">
                                                        {i + 1}
                                                    </span>
                                                    <div>
                                                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 font-mono text-[10px] font-bold rounded border border-green-200 mb-1 print:border-slate-300 print:bg-white print:text-slate-800">
                                                            {item.bncc_code}
                                                        </span>
                                                        <h3 className="text-sm font-bold text-slate-800">{item.skill_description}</h3>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 print:bg-white print:border-slate-200">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 print:text-slate-600">Defesa Jurídico-Pedagógica</h4>
                                                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                                    {item.legal_pedagogical_defense}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <style type="text/css">{`
                        @media print {
                            /* Esconde o resto da interface do StudyTrack */
                            header, aside, #print-area { display: none !important; }
                            
                            /* Remove scrollbars e deixa a folha crescer naturalmente */
                            html, body, main, #__next { 
                                height: auto !important; 
                                overflow: visible !important; 
                                background: white !important;
                            }
                            
                            /* Evita quebras de página no meio de um card da BNCC */
                            #report-print-area > div > div { 
                                page-break-inside: avoid !important; 
                                break-inside: avoid !important; 
                            }
                        }
                    `}</style>
                </div>
            )}
            {/* FIM DO MODAL BNCC */}

            {toast && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 no-print ${toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-500 text-white'}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span className="text-sm font-medium">{toast.msg}</span>
                </div>
            )}
        </div>
    );
}