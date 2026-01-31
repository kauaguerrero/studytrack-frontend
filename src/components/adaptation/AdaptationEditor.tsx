'use client'

import React, { useReducer, useEffect, useCallback, useRef, useState, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  CheckCircle2, Image as ImageIcon, RotateCcw, RotateCw,
  AlertCircle, X, Maximize2, Minimize2, Settings2, 
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, ZoomIn, ZoomOut,
  ChevronLeft, FileText, Download, Layout, Sparkles, History, Keyboard,
  ChevronDown
} from 'lucide-react';

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
  version: number;
}

export interface AdaptedExamData {
  metadata: AdaptedExamMetadata;
  questions: AdaptedQuestion[];
}

// --- REDUCER ACTIONS ---
type EditorAction = 
  | { type: 'SET_DATA'; payload: AdaptedExamData }
  | { type: 'UPDATE_QUESTION'; payload: { index: number; field: keyof AdaptedQuestion; value: any } }
  | { type: 'UPDATE_STYLE'; payload: { index: number; field: keyof CSSPropertiesExtended; value: any } }
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
}

// ============================================================================
// --- 2. REDUCER LOGIC
// ============================================================================

const MAX_HISTORY = 50;

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, data: action.payload };
    
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
// --- 3. UI COMPONENTS
// ============================================================================

const ToolButton = ({ icon: Icon, label, active = false, onClick, disabled = false, shortcut = "" }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={shortcut ? `${label} (${shortcut})` : label}
    className={`
      relative group flex items-center justify-center h-8 w-8 rounded-md transition-all duration-200
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
                    {lastSaved ? `Salvo às ${lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Sincronizado'}
                </span>
            </>
        )}
    </div>
);

// --- COMPONENTE CRÍTICO: AUTO-RESIZING TEXTAREA ---
// Isso garante que o papel "cresça" junto com o texto, corrigindo o bug visual
const AutoResizingTextarea = ({ value, onChange, style, autoFocus, className }: any) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
        if (textareaRef.current) {
            // Reset height to shrink if needed
            textareaRef.current.style.height = 'auto';
            // Set height to scrollHeight
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [value, style]); // Re-run when value or style changes

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
// --- 4. MAIN COMPONENT
// ============================================================================

interface EditorProps {
  jobId: string;
  initialData: AdaptedExamData;
  status: string;
  filename: string;
}

export function AdaptationEditor({ jobId, initialData, status, filename }: EditorProps) {
  const supabase = createClient();
  const router = useRouter();
  
  const [state, dispatch] = useReducer(editorReducer, {
    data: initialData,
    history: [],
    future: [],
    isSaving: false,
    lastSaved: null,
    isZenMode: false
  });

  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(100);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'}|null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveData = useCallback(async (manual = false) => {
    dispatch({ type: 'SET_SAVING', payload: true });
    try {
      const payload: any = { final_json_data: state.data, updated_at: new Date().toISOString() };
      const { error } = await supabase.from('adapted_exams').update(payload).eq('id', jobId);
      if (error) throw error;
      dispatch({ type: 'SET_LAST_SAVED', payload: new Date() });
      if (manual) showToast("Progresso salvo com sucesso!", 'success');
    } catch (err) {
      showToast("Falha ao salvar.", 'error');
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [state.data, jobId, supabase]);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
        if (state.history.length > 0) saveData();
    }, 2000);
    return () => { if(saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [state.data, saveData, state.history.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); dispatch({ type: 'UNDO' }); showToast("Desfeito", 'success'); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); dispatch({ type: 'REDO' }); showToast("Refeito", 'success'); }
        if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveData(true); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveData]);

  const showToast = (msg: string, type: 'success'|'error') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3000);
  };

  const handleFinalize = async () => {
      if(!confirm("Tem certeza? O documento será marcado como concluído.")) return;
      await saveData();
      const { error } = await supabase.from('adapted_exams').update({ adaptation_status: 'completed' }).eq('id', jobId);
      if(!error) router.push('/portal/secretariat');
  };

  return (
    <div className={`flex flex-col h-full bg-[#F3F4F6] relative transition-all duration-300 ${state.isZenMode ? 'fixed inset-0 z-50' : ''}`}>
      
      {/* 1. TOP BAR */}
      {!state.isZenMode && (
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-30 shrink-0">
          <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                  <ChevronLeft size={20} />
              </button>
              <div>
                  <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                     <FileText size={16} className="text-blue-600" /> {filename}
                  </h1>
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">Editor de Adaptação V2.1</p>
              </div>
          </div>
          <div className="flex items-center gap-4">
              <StatusBadge saving={state.isSaving} lastSaved={state.lastSaved} />
              <div className="h-6 w-px bg-slate-200" />
              <button onClick={handleFinalize} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-black transition-all flex items-center gap-2 active:scale-95">
                 <Download size={14} /> Finalizar
              </button>
          </div>
        </header>
      )}

      {/* 2. EDITOR TOOLBAR */}
      <div className={`bg-white/90 backdrop-blur-md border-b border-slate-200/60 px-6 py-2 flex items-center justify-between z-20 sticky top-0 transition-all duration-300 ${state.isZenMode ? 'px-8 py-3' : ''}`}>
          <div className="flex items-center gap-1">
              <div className="flex items-center bg-slate-100/50 p-1 rounded-lg border border-slate-200/50 mr-4">
                  <ToolButton icon={RotateCcw} onClick={() => dispatch({type: 'UNDO'})} disabled={state.history.length === 0} shortcut="Ctrl+Z" />
                  <ToolButton icon={RotateCw} onClick={() => dispatch({type: 'REDO'})} disabled={state.future.length === 0} shortcut="Ctrl+Y" />
              </div>

              {activeIdx !== null ? (
                  <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                       <div className="h-8 border-l border-slate-200 mx-1" />
                       <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md shadow-sm px-1 h-9">
                           <select 
                             className="text-xs border-none focus:ring-0 text-slate-700 w-24 font-medium bg-transparent cursor-pointer"
                             value={state.data.questions[activeIdx].css_style?.fontFamily}
                             onChange={(e) => dispatch({type: 'UPDATE_STYLE', payload: { index: activeIdx, field: 'fontFamily', value: e.target.value }})}
                           >
                              <option value="Arial">Arial</option>
                              <option value="Verdana">Verdana</option>
                              <option value="OpenDyslexic">OpenDyslexic</option>
                           </select>
                           <div className="w-px h-4 bg-slate-200 mx-1" />
                           <select 
                             className="text-xs border-none focus:ring-0 text-slate-700 w-16 font-medium bg-transparent cursor-pointer"
                             value={state.data.questions[activeIdx].css_style?.fontSize}
                             onChange={(e) => dispatch({type: 'UPDATE_STYLE', payload: { index: activeIdx, field: 'fontSize', value: e.target.value }})}
                           >
                              {['12px','14px','16px','18px','20px','24px'].map(s => <option key={s} value={s}>{s}</option>)}
                           </select>
                       </div>
                       <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                          <ToolButton icon={Bold} active={state.data.questions[activeIdx].css_style?.fontWeight === 'bold'} onClick={() => dispatch({type: 'UPDATE_STYLE', payload: { index: activeIdx, field: 'fontWeight', value: state.data.questions[activeIdx].css_style?.fontWeight === 'bold' ? 'normal' : 'bold' }})} />
                          <ToolButton icon={Italic} />
                       </div>
                       <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                          <ToolButton icon={AlignLeft} onClick={() => dispatch({type: 'UPDATE_STYLE', payload: { index: activeIdx, field: 'textAlign', value: 'left' }})} active={state.data.questions[activeIdx].css_style?.textAlign === 'left'} />
                          <ToolButton icon={AlignCenter} onClick={() => dispatch({type: 'UPDATE_STYLE', payload: { index: activeIdx, field: 'textAlign', value: 'center' }})} active={state.data.questions[activeIdx].css_style?.textAlign === 'center'} />
                          <ToolButton icon={AlignRight} onClick={() => dispatch({type: 'UPDATE_STYLE', payload: { index: activeIdx, field: 'textAlign', value: 'right' }})} active={state.data.questions[activeIdx].css_style?.textAlign === 'right'} />
                       </div>
                  </div>
              ) : (
                  <div className="flex items-center gap-2 text-slate-400 text-xs italic pl-4 border-l border-slate-200">
                      <Layout size={14} /> Selecione um bloco para formatar
                  </div>
              )}
          </div>
          <div className="flex items-center gap-2">
               <div className="flex items-center bg-slate-100 rounded-md px-2 py-1">
                   <button onClick={() => setZoom(z => Math.max(50, z-10))} className="p-1 hover:bg-slate-200 rounded"><ZoomOut size={14}/></button>
                   <span className="text-[10px] font-mono w-8 text-center">{zoom}%</span>
                   <button onClick={() => setZoom(z => Math.min(150, z+10))} className="p-1 hover:bg-slate-200 rounded"><ZoomIn size={14}/></button>
               </div>
               <div className="h-6 w-px bg-slate-200 mx-2" />
               <ToolButton icon={state.isZenMode ? Minimize2 : Maximize2} onClick={() => dispatch({type: 'SET_ZEN_MODE', payload: !state.isZenMode})} label="Zen Mode" />
               <ToolButton icon={state.isZenMode ? Settings2 : Layout} onClick={() => setSidebarOpen(!sidebarOpen)} active={sidebarOpen} label="Toggle Sidebar" />
          </div>
      </div>

      {/* 3. MAIN WORKSPACE */}
      <div className="flex-1 overflow-hidden flex relative">
         
         {/* CANVAS SCROLL AREA */}
         <div 
            className="flex-1 overflow-y-auto bg-slate-100/50 flex justify-center cursor-default pb-32" 
            onClick={() => setActiveIdx(null)}
         >
            {/* PAPER WRAPPER: Garante centralização e margens corretas no scroll */}
            <div className="py-12 px-8 min-h-min w-full flex justify-center items-start">
                
                {/* THE PAPER (INFINITE HEIGHT FIX) */}
                <div 
                  id="print-area"
                  className="bg-white shadow-[0_4px_30px_rgba(0,0,0,0.08)] border border-slate-200/80 transition-transform duration-200 ease-out origin-top relative"
                  style={{ 
                     width: '210mm',
                     minHeight: '297mm', // Altura mínima A4
                     height: 'auto',     // CRUCIAL: Permite crescer infinitamente
                     transform: `scale(${zoom / 100})`,
                     padding: '25mm',
                     // Fix para o scale não "comer" a margem inferior
                     marginBottom: `${(zoom - 100) * 5}px` 
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                   {/* Paper Header */}
                   <div className="border-b-4 border-slate-900 pb-4 mb-12 flex justify-between items-end group">
                      <div>
                          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">Avaliação</h1>
                          <div className="flex gap-4 mt-2 text-sm text-slate-500 font-medium">
                              <span>Aluno: {state.data.metadata.student_name || "_____________________"}</span>
                              <span>Data: ___/___/___</span>
                          </div>
                      </div>
                      <div className="text-right">
                          <div className="h-12 w-12 bg-slate-900 text-white flex items-center justify-center font-bold text-xl rounded-lg">A+</div>
                      </div>
                   </div>

                   {/* QUESTIONS RENDERER */}
                   <div className="space-y-8">
                      {state.data.questions.map((q, idx) => {
                          const isActive = activeIdx === idx;
                          return (
                              <div 
                                key={idx}
                                onClick={(e) => { e.stopPropagation(); setActiveIdx(idx); }}
                                className={`relative pl-4 -ml-4 rounded-r-lg transition-all duration-150 ${isActive ? 'bg-blue-50/20 border-l-4 border-blue-500' : 'hover:bg-slate-50 border-l-4 border-transparent hover:border-slate-200'}`}
                              >
                                 <span className={`absolute -left-10 top-0 font-bold text-lg select-none transition-colors ${isActive ? 'text-blue-600' : 'text-slate-300'}`}>{idx + 1}.</span>

                                 {/* Content Editor com AUTO-RESIZE */}
                                 {isActive ? (
                                    <AutoResizingTextarea
                                        value={q.adapted_content}
                                        onChange={(e: any) => dispatch({type: 'UPDATE_QUESTION', payload: {index: idx, field: 'adapted_content', value: e.target.value}})}
                                        className="w-full bg-transparent resize-none outline-none p-0 m-0 block"
                                        style={{
                                            fontFamily: q.css_style?.fontFamily,
                                            fontSize: q.css_style?.fontSize,
                                            fontWeight: q.css_style?.fontWeight,
                                            textAlign: q.css_style?.textAlign,
                                            lineHeight: q.css_style?.lineHeight || '1.5'
                                        }}
                                        autoFocus
                                    />
                                 ) : (
                                    <div 
                                        className="whitespace-pre-wrap"
                                        style={{
                                            fontFamily: q.css_style?.fontFamily,
                                            fontSize: q.css_style?.fontSize,
                                            fontWeight: q.css_style?.fontWeight,
                                            textAlign: q.css_style?.textAlign,
                                            lineHeight: q.css_style?.lineHeight || '1.5'
                                        }}
                                    >
                                        {q.adapted_content}
                                    </div>
                                 )}

                                 {q.visual_cues && (
                                     <div className={`mt-4 flex gap-4 p-4 rounded-lg border border-dashed transition-all ${isActive ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 bg-slate-50/30'}`}>
                                         <div className="flex-shrink-0 h-16 w-16 bg-slate-200 rounded flex items-center justify-center text-slate-400">
                                             <ImageIcon size={24} />
                                         </div>
                                         <div className="flex-1">
                                             <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Descrição Visual</label>
                                             {isActive ? (
                                                <AutoResizingTextarea 
                                                    value={q.visual_cues}
                                                    onChange={(e: any) => dispatch({type: 'UPDATE_QUESTION', payload: {index: idx, field: 'visual_cues', value: e.target.value}})}
                                                    className="w-full bg-transparent text-sm text-slate-600 outline-none resize-none font-medium"
                                                />
                                             ) : (
                                                <p className="text-sm text-slate-600 font-medium italic">{q.visual_cues}</p>
                                             )}
                                         </div>
                                     </div>
                                 )}
                              </div>
                          );
                      })}
                   </div>
                   
                   {/* Footer do Papel (Visual da Borda Inferior) */}
                   <div className="mt-20 pt-8 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-mono uppercase">
                      <span>StudyTrack Certified Adaptation</span>
                      <span>Page 1 of 1 (Continuous)</span>
                   </div>

                </div>
            </div>
         </div>

         {/* 4. SIDEBAR */}
         {sidebarOpen && (
             <aside className="w-[340px] bg-white border-l border-slate-200 shadow-xl z-10 flex flex-col animate-in slide-in-from-right duration-300">
                 <div className="h-12 border-b border-slate-100 flex items-center px-4 bg-slate-50/50 justify-between">
                     <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Painel de Controle</span>
                     <button onClick={() => setSidebarOpen(false)}><X size={16} className="text-slate-400 hover:text-red-500"/></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-6 space-y-8">
                     {activeIdx !== null ? (
                         <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                             <div>
                                 <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                                     <Sparkles className="text-purple-500" size={14} /> Inteligência Adaptativa
                                 </h3>
                                 <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 shadow-sm relative overflow-hidden">
                                     <p className="text-xs text-slate-700 leading-relaxed relative z-10">{state.data.questions[activeIdx].adaptation_justification}</p>
                                 </div>
                             </div>
                             <div>
                                 <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                                     <History className="text-blue-500" size={14} /> Conteúdo Original
                                 </h3>
                                 <div className="bg-slate-50 rounded-lg p-3 border-l-2 border-blue-400 text-xs text-slate-600 italic">"{state.data.questions[activeIdx].original_excerpt}"</div>
                                 <button className="mt-2 text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 uppercase tracking-wide" onClick={() => dispatch({type: 'UPDATE_QUESTION', payload: {index: activeIdx, field: 'adapted_content', value: state.data.questions[activeIdx].original_excerpt}})}>
                                    <RotateCcw size={10} /> Restaurar Original
                                 </button>
                             </div>
                         </div>
                     ) : (
                         <div className="space-y-6">
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                <h4 className="text-blue-800 font-bold text-sm mb-1">Resumo</h4>
                                <p className="text-xs text-blue-600/80 leading-relaxed">{state.data.metadata.summary}</p>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Condições</h4>
                                <div className="flex flex-wrap gap-2">
                                    {state.data.metadata.applied_conditions?.map((c, i) => <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full border border-slate-200">{c}</span>)}
                                </div>
                            </div>
                         </div>
                     )}
                 </div>
             </aside>
         )}
      </div>

      {toast && (
          <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 ${toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-500 text-white'}`}>
              {toast.type === 'success' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
              <span className="text-sm font-medium">{toast.msg}</span>
          </div>
      )}
    </div>
  );
}