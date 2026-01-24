'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, Loader2, PenTool, AlignLeft, ListChecks, HelpCircle, BookOpen } from 'lucide-react';
import { getSubjects, getTopics } from '@/constants/taxonomy';

interface ManualFormProps {
  onSuccess: (question: any) => void;
}

export function ManualQuestionForm({ onSuccess }: ManualFormProps) {
  const [loading, setLoading] = useState(false);
  
  // Estado do formulário
  const [form, setForm] = useState({
    subject: 'Matemática',
    discipline: '',
    difficulty: 'Médio',
    statement: '', // Representa o Comando/Pergunta
    context: '',   // Texto base
    alternatives: [
      { letter: 'A', text: '' }, { letter: 'B', text: '' }, { letter: 'C', text: '' }, { letter: 'D', text: '' }, { letter: 'E', text: '' }
    ],
    correct_alternative: '',
    explanation: ''
  });

  // Reset de tópico ao mudar matéria
  useEffect(() => {
    setForm(prev => ({ ...prev, discipline: '' }));
  }, [form.subject]);

  const handleSubmit = async () => {
    if (!form.statement) return alert("O enunciado (comando) é obrigatório.");
    if (!form.correct_alternative) return alert("Selecione a alternativa correta.");
    if (form.alternatives.some(a => !a.text.trim())) return alert("Preencha todas as alternativas.");

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      // Payload limpo enviado ao backend
      // O backend fará o de-para: statement -> alternatives_intro
      const payload = {
         ...form,
         alternatives: form.alternatives.map(a => ({...a, isCorrect: a.letter === form.correct_alternative}))
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/enterprise/assessment/questions/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        onSuccess(data.question);
      } else {
        alert("Erro ao salvar: " + (data.error || "Erro desconhecido"));
      }
    } catch (e) {
      console.error(e);
      alert("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const subjects = getSubjects();
  const topics = getTopics(form.subject);

  return (
    <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 mx-auto max-w-6xl my-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Visual */}
      <div className="flex items-center gap-5 pb-8 border-b border-slate-100 mb-10">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center shadow-sm border border-emerald-200 transform rotate-3">
            <PenTool size={32} strokeWidth={1.5}/>
        </div>
        <div>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">Editor Manual</h3>
            <p className="text-lg text-slate-500 font-medium">Crie itens personalizados seguindo o padrão da sua escola.</p>
        </div>
      </div>

      <div className="space-y-10">
        {/* 1. Metadados (Grid com Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide px-1">Matéria</label>
                <select 
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all font-bold text-slate-800 cursor-pointer text-base"
                  value={form.subject}
                  onChange={e => setForm({...form, subject: e.target.value})}
                >
                   {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide px-1">Tópico</label>
                <select 
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all font-bold text-slate-800 cursor-pointer text-base disabled:opacity-50"
                  value={form.discipline}
                  onChange={e => setForm({...form, discipline: e.target.value})}
                  disabled={!form.subject}
                >
                   <option value="">Selecione o tópico...</option>
                   {topics.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide px-1">Dificuldade</label>
                <select 
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all font-bold text-slate-800 cursor-pointer text-base"
                  value={form.difficulty}
                  onChange={e => setForm({...form, difficulty: e.target.value})}
                >
                   <option>Fácil</option>
                   <option>Médio</option>
                   <option>Difícil</option>
                </select>
            </div>
        </div>

        {/* 2. Conteúdo (Split Layout) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            <div className="space-y-8">
                <div>
                    <label className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3">
                        <BookOpen size={20} className="text-emerald-600" /> 
                        Texto Base / Contexto <span className="text-slate-400 font-normal ml-auto text-xs bg-slate-100 px-2 py-1 rounded uppercase tracking-wide">Opcional</span>
                    </label>
                    <textarea 
                        className="w-full p-5 border-2 border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all h-48 resize-none placeholder:text-slate-400 text-slate-700 leading-relaxed text-base bg-slate-50 focus:bg-white"
                        placeholder="Insira aqui um texto de apoio, poema, citação ou dados que contextualizem a questão..."
                        value={form.context}
                        onChange={e => setForm({...form, context: e.target.value})}
                    />
                </div>
                <div>
                    <label className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3">
                        <AlignLeft size={20} className="text-emerald-600" />
                        Comando da Questão <span className="text-red-500 text-lg">*</span>
                    </label>
                    <textarea 
                        className="w-full p-5 border-2 border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all h-40 resize-none placeholder:text-slate-400 font-medium text-slate-800 leading-relaxed text-lg shadow-sm focus:bg-white"
                        placeholder="Digite a pergunta ou o comando principal aqui..."
                        value={form.statement}
                        onChange={e => setForm({...form, statement: e.target.value})}
                    />
                </div>
            </div>

            <div className="bg-slate-50 p-6 md:p-8 rounded-[2rem] border border-slate-200 h-fit">
                 <div className="flex justify-between items-center mb-6">
                    <h4 className="font-extrabold text-slate-800 text-lg uppercase tracking-wide flex items-center gap-3">
                        <div className="bg-white p-2 rounded-lg shadow-sm"><ListChecks size={20} className="text-emerald-600"/></div>
                        Alternativas
                    </h4>
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full font-bold shadow-sm border border-emerald-200">Selecione a correta</span>
                 </div>
                 <div className="space-y-4">
                    {form.alternatives.map((alt, idx) => (
                      <div key={alt.letter} className={`flex gap-4 group items-stretch transition-all duration-300 ${form.correct_alternative === alt.letter ? 'transform scale-[1.02]' : ''}`}>
                          <button 
                            onClick={() => setForm({...form, correct_alternative: alt.letter})}
                            className={`w-14 shrink-0 rounded-2xl font-bold border-2 transition-all flex items-center justify-center text-xl shadow-sm ${
                              form.correct_alternative === alt.letter 
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-200 ring-4 ring-emerald-100' 
                              : 'bg-white border-slate-300 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={`Marcar ${alt.letter} como correta`}
                          >
                            {alt.letter}
                          </button>
                          <input 
                            className={`flex-1 p-4 px-5 border-2 rounded-2xl outline-none transition-all text-base ${
                              form.correct_alternative === alt.letter 
                              ? 'border-emerald-500 bg-white shadow-md text-emerald-900 font-semibold' 
                              : 'border-slate-200 focus:border-emerald-400 bg-white text-slate-700'
                            }`}
                            placeholder={`Digite a alternativa ${alt.letter}...`}
                            value={alt.text}
                            onChange={e => {
                              const newAlts = [...form.alternatives];
                              newAlts[idx].text = e.target.value;
                              setForm({...form, alternatives: newAlts});
                            }}
                          />
                      </div>
                    ))}
                 </div>
            </div>
        </div>

        {/* 3. Footer */}
        <div className="pt-8 border-t border-slate-100 flex flex-col gap-6">
            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                <label className="flex items-center gap-2 text-sm font-bold text-blue-800 mb-3 uppercase tracking-wide">
                    <HelpCircle size={18}/> Feedback / Explicação do Gabarito
                </label>
                <textarea 
                    className="w-full p-4 border border-blue-200 rounded-xl bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none h-28 resize-none transition-all placeholder:text-blue-300 text-blue-900 text-sm"
                    placeholder="Opcional: Explique o raciocínio por trás da resposta correta para ajudar o aluno no pós-prova..."
                    value={form.explanation}
                    onChange={e => setForm({...form, explanation: e.target.value})}
                />
            </div>
            
            <div className="flex justify-end pt-4">
                <button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full md:w-auto px-12 py-5 bg-emerald-600 text-white text-lg font-bold rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all flex items-center justify-center gap-3 disabled:opacity-70 hover:-translate-y-1 active:translate-y-0"
                >
                    {loading ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle size={24} />}
                    Salvar Questão na Prova
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}