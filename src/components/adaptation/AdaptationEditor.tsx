'use client'

import React, { useReducer, useEffect, useCallback, useRef, useState, useLayoutEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { EditorContentSkeleton } from './SkeletonLoader';
import {
    CheckCircle2, Image as ImageIcon, RotateCcw, RotateCw,
    AlertCircle, X, Maximize2, Minimize2, Settings2,
    Bold, Italic, AlignLeft, AlignCenter, AlignRight, ZoomIn, ZoomOut,
    ChevronLeft, FileText, Printer, Layout, Sparkles, History,
    ShieldAlert, Loader2, Palette, ListOrdered, GraduationCap, AlertTriangle, Brain, Star, Send
} from 'lucide-react';
import renderMathInElement from 'katex/dist/contrib/auto-render';
import 'katex/dist/katex.min.css';

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

// Transforma tags de backend em HTML visualizável no Editor.
const parseBackendTagsToHTML = (htmlString: string): string => {
    if (!htmlString) return '';
    return htmlString.replace(/\[\[IMG_REF:(.*?):(AUTO|[\d.]+)\]\]/g, (match, url, ratio) => {
        const width = ratio === 'AUTO' ? '100%' : `${parseFloat(ratio) * 100}%`;
        return `<img src="${url}" alt="Imagem de apoio" class="wysiwyg-exam-img" style="max-width: ${width}; height: auto; display: block; margin: 15px auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />`;
    });
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

// --- COMPONENTE DE VISUALIZAÇÃO COM RENDERIZAÇÃO MATEMÁTICA ---
const LaTeXViewer = ({ htmlContent, dynamicStyle, className }: { htmlContent: string, dynamicStyle: any, className?: string }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            renderMathInElement(containerRef.current, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ],
                throwOnError: false,
                errorColor: '#cc0000'
            });
        }
    }, [htmlContent]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={dynamicStyle}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
    );
};

// --- COMPONENTE DE EDIÇÃO DE TEXTO RICO ---
const ContentEditable = ({ html, onChange, style, className, autoFocus }: any) => {
    const divRef = useRef<HTMLDivElement>(null);
    const isFocused = useRef(false);

    useLayoutEffect(() => {
        if (divRef.current && html !== divRef.current.innerHTML) {
            if (!isFocused.current) {
                divRef.current.innerHTML = html;
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

    return (
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
            onFocus={() => isFocused.current = true}
            onBlur={() => isFocused.current = false}
            suppressContentEditableWarning
        />
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

    const [activeIdx, setActiveIdx] = useState<number | null>(null);
    const [zoom, setZoom] = useState(100);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
    const [feedbackRating, setFeedbackRating] = useState<number>(0);
    const [feedbackNotes, setFeedbackNotes] = useState('');
    const [feedbackSending, setFeedbackSending] = useState(false);
    const [feedbackSent, setFeedbackSent] = useState(false);

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const questionList = useMemo(() => state.data.questions, [state.data.questions]);

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

            const payload: any = { final_json_data: dataToSave, updated_at: new Date().toISOString() };
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

    // --- PROFESSIONAL PRINT ENGINE DELEGADO AO BACKEND ---
    const handlePrintPDF = async () => {
        setActiveIdx(null);
        await new Promise(resolve => setTimeout(resolve, 100));

        await saveData();
        showToast("Gerando PDF Otimizado no servidor...", 'success');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Usuário não autenticado");

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/enterprise/inclusion/download/${jobId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (!response.ok) throw new Error("Erro na geração do arquivo PDF no servidor.");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `StudyTrack_Adaptada_${filename}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showToast("Download concluído com sucesso!", 'success');
        } catch (error: any) {
            showToast(error.message || "Falha ao baixar o PDF gerado.", 'error');
        }
    };

    return (
        <div className={`flex flex-col h-full bg-[#F3F4F6] relative transition-all duration-300 ${state.isZenMode ? 'fixed inset-0 z-50' : ''}`}>

            {isProcessing && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center">
                    <EditorContentSkeleton />
                </div>
            )}

            <style jsx global>{`
        @media print {
          header, aside, .editor-toolbar, button, .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          #print-area { width: 100% !important; transform: none !important; margin: 0 !important; padding: 20mm !important; box-shadow: none !important; border: none !important; height: auto !important; }
          .question-block { page-break-inside: avoid; break-inside: avoid; margin-bottom: 25px; padding: 10px 0; }
          @page { margin: 10mm; }
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
                    <div className="flex items-center bg-slate-100/50 p-1 rounded-lg border border-slate-200/50 mr-4">
                        <ToolButton icon={RotateCcw} onClick={() => dispatch({ type: 'UNDO' })} disabled={state.history.length === 0} shortcut="Ctrl+Z" />
                        <ToolButton icon={RotateCw} onClick={() => dispatch({ type: 'REDO' })} disabled={state.future.length === 0} shortcut="Ctrl+Y" />
                    </div>

                    <div className="flex items-center gap-2 mr-4 border-r border-slate-200 pr-4">
                        <Palette size={16} className="text-slate-400" />
                        <div className="flex gap-1">
                            {[
                                { color: '#ffffff', label: 'Branco' },
                                { color: '#fffbeb', label: 'Creme (Irlen)' }, // Amber-50
                                { color: '#eff6ff', label: 'Azul (Suave)' }, // Blue-50
                                { color: '#f0fdf4', label: 'Verde (Descanso)' }, // Green-50
                                { color: '#faf5ff', label: 'Roxo (Foco)' }  // Purple-50
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
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-slate-400 text-xs italic pl-4">
                            <Layout size={14} /> Selecione uma questão para editar
                        </div>
                    )}
                </div>
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
                <div className="w-14 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-2 overflow-y-auto no-print z-10 hidden sm:flex shrink-0">
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
                </div>

                <div
                    className="flex-1 overflow-y-auto bg-slate-100/50 flex justify-center cursor-default pb-32"
                    onClick={() => setActiveIdx(null)}
                >
                    <div className="py-12 px-8 min-h-min w-full flex justify-center items-start no-print">

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
                            {/* [HEADER DA PROVA] */}
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

                                            {/* Suporte Visual */}
                                            {q.visual_cues && (
                                                <div className={`mt-4 flex gap-4 p-4 rounded-lg border border-dashed transition-all ${isActive ? 'border-blue-300 bg-blue-50/50' : 'border-slate-300 bg-black/5'}`}>
                                                    <div className="flex-shrink-0 h-16 w-16 bg-slate-200 rounded flex items-center justify-center text-slate-400 no-print">
                                                        <ImageIcon size={24} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block no-print">Descrição de Apoio Visual (Faltante)</label>
                                                        {isActive ? (
                                                            <AutoResizingTextarea
                                                                value={q.visual_cues}
                                                                onChange={(e: any) => dispatch({ type: 'UPDATE_QUESTION', payload: { index: idx, field: 'visual_cues', value: e.target.value } })}
                                                                className="w-full bg-transparent text-sm text-slate-600 outline-none resize-none font-medium"
                                                            />
                                                        ) : (
                                                            <p className="text-sm text-slate-700 font-medium italic bg-slate-100/50 p-2 rounded border border-slate-200">
                                                                <b>[Suporte Visual]:</b> {q.visual_cues}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
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

            {toast && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 no-print ${toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-500 text-white'}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span className="text-sm font-medium">{toast.msg}</span>
                </div>
            )}
        </div>
    );
}