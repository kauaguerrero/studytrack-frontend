'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, Loader2, PenTool, AlignLeft, ListChecks } from 'lucide-react';
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
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mx-auto max-w-5xl my-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Header Visual */}
      <div className="flex items-center gap-4 pb-6 border-b border-slate-100 mb-8">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
            <PenTool size={22}/>
        </div>
        <div>
            <h3 className="text-xl font-bold text-slate-900">Editor Manual de Questões</h3>
            <p className="text-sm text-slate-500">Crie itens personalizados seguindo o padrão da sua escola.</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* 1. Metadados (Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-1">
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">Matéria</label>
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700"
                  value={form.subject}
                  onChange={e => setForm({...form, subject: e.target.value})}
                >
                   {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">Tópico</label>
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700 disabled:opacity-50"
                  value={form.discipline}
                  onChange={e => setForm({...form, discipline: e.target.value})}
                  disabled={!form.subject}
                >
                   <option value="">Selecione o tópico...</option>
                   {topics.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">Dificuldade</label>
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                        <AlignLeft size={18} className="text-emerald-600" /> 
                        Texto Base / Contexto <span className="text-slate-400 font-normal ml-auto text-xs">(Opcional)</span>
                    </label>
                    <textarea 
                        className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all h-40 resize-none placeholder:text-slate-400 text-slate-700 leading-relaxed text-sm bg-slate-50/30"
                        placeholder="Insira aqui um texto de apoio, poema, citação ou dados que contextualizem a questão..."
                        value={form.context}
                        onChange={e => setForm({...form, context: e.target.value})}
                    />
                </div>
                <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                        <AlignLeft size={18} className="text-emerald-600" />
                        Comando da Questão <span className="text-red-500">*</span>
                    </label>
                    <textarea 
                        className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all h-32 resize-none placeholder:text-slate-400 font-medium text-slate-800 leading-relaxed text-base shadow-sm"
                        placeholder="Digite a pergunta ou o comando principal aqui..."
                        value={form.statement}
                        onChange={e => setForm({...form, statement: e.target.value})}
                    />
                </div>
            </div>

            <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-200 h-fit">
                 <div className="flex justify-between items-center mb-5">
                    <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2">
                        <ListChecks size={18} /> Alternativas
                    </h4>
                    <span className="text-[10px] bg-white px-2 py-1 rounded border border-slate-200 text-slate-500 font-medium shadow-sm">Clique na letra correta</span>
                 </div>
                 <div className="space-y-3">
                    {form.alternatives.map((alt, idx) => (
                      <div key={alt.letter} className="flex gap-3 group items-stretch">
                         <button 
                           onClick={() => setForm({...form, correct_alternative: alt.letter})}
                           className={`w-12 shrink-0 rounded-xl font-bold border-2 transition-all flex items-center justify-center text-lg ${
                             form.correct_alternative === alt.letter 
                             ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200 transform scale-105' 
                             : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-500'
                           }`}
                           title="Marcar como correta"
                         >
                           {alt.letter}
                         </button>
                         <input 
                           className={`flex-1 p-3 px-4 border rounded-xl outline-none transition-all text-sm ${
                             form.correct_alternative === alt.letter 
                             ? 'border-emerald-500 bg-white ring-1 ring-emerald-100 text-emerald-900 font-medium' 
                             : 'border-slate-200 focus:border-emerald-400 bg-white'
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
        <div className="pt-6 border-t border-slate-100 flex flex-col gap-4">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Explicação do Gabarito (Feedback)</label>
                <textarea 
                    className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50/30 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none h-24 resize-none transition-all placeholder:text-slate-400 text-sm"
                    placeholder="Opcional: Explique o raciocínio por trás da resposta correta para ajudar o aluno..."
                    value={form.explanation}
                    onChange={e => setForm({...form, explanation: e.target.value})}
                />
            </div>
            
            <div className="flex justify-end pt-2">
                <button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-10 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all flex items-center gap-3 disabled:opacity-70 hover:-translate-y-0.5 active:translate-y-0"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                    Salvar Questão
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}