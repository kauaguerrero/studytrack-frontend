'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users, Search, Edit3, FileText, AlertCircle, CheckCircle2,
  User, Calendar, BookOpen, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// --- COMPONENTS ---

const StudentCard = ({ student, onEdit }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="hover:shadow-md transition-shadow border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User size={24} className="text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-900 text-lg truncate">
                {student.profiles?.full_name || 'Nome não informado'}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {student.profiles?.email || 'Email não informado'}
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>Desde {format(new Date(student.created_at), "MMM yyyy", { locale: ptBR })}</span>
                </div>
              </div>
            </div>
          </div>
          <Button
            onClick={() => onEdit(student)}
            variant="outline"
            size="sm"
            className="ml-4"
          >
            <Edit3 size={14} className="mr-2" />
            Editar
          </Button>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="grid grid-cols-1 gap-4 text-sm">
            <div>
              <span className="font-medium text-slate-700">Condição:</span>
              <p className="text-slate-600 mt-1">{student.condition_name}</p>
            </div>
            {student.specific_needs && Object.keys(student.specific_needs).length > 0 && (
              <div>
                <span className="font-medium text-slate-700">Necessidades Específicas:</span>
                <p className="text-slate-600 mt-1 text-xs font-mono bg-slate-50 p-2 rounded">
                  {JSON.stringify(student.specific_needs, null, 2)}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const EditStudentModal = ({ student, isOpen, onClose, onSave }: any) => {
  const [formData, setFormData] = useState({
    condition_name: '',
    specific_needs: {}
  });

  useEffect(() => {
    if (student) {
      setFormData({
        condition_name: student.condition_name || '',
        specific_needs: student.specific_needs || {}
      });
    }
  }, [student]);

  const handleSave = async () => {
    // Implementar salvamento
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Editar Aluno NEE</h2>
          <p className="text-slate-600 mt-1">{student?.profiles?.full_name}</p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Condição
            </label>
            <input
              type="text"
              value={formData.condition_name}
              onChange={(e) => setFormData({...formData, condition_name: e.target.value})}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Necessidades Específicas (JSON)
            </label>
            <textarea
              value={JSON.stringify(formData.specific_needs, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setFormData({...formData, specific_needs: parsed});
                } catch {
                  // Invalid JSON, keep current value
                }
              }}
              rows={6}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder='{"font_size": "large", "avoid_colors": ["red"]}'
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <Button onClick={onClose} variant="outline">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Salvar Alterações
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function StudentsNEEPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [examCounts, setExamCounts] = useState<Record<string, number>>({});
  const supabase = createClient();

  useEffect(() => {
    async function fetchStudents() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) {
          toast.error("Sessão expirada. Faça login novamente.");
          setStudents([]);
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
        const res = await fetch(`${apiUrl}/api/enterprise/inclusion/nee/students`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("Erro ao buscar alunos NEE:", err);
          toast.error(err?.error || "Falha ao carregar alunos NEE.");
          setStudents([]);
          return;
        }

        const data = await res.json();
        const studentsWithDiagnosticsData = Array.isArray(data?.students) ? data.students : [];
        setStudents(studentsWithDiagnosticsData);
        setExamCounts({});

      } catch (err) {
        console.error("Failed to fetch students", err);
        toast.error("Erro ao carregar alunos NEE.");
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

  const handleEdit = (student: any) => {
    setEditingStudent(student);
  };

  const handleSave = async (formData: any) => {
    if (!editingStudent) return;

    try {
      const { error } = await supabase
        .from('student_diagnostics')
        .update({
          condition_name: formData.condition_name,
          specific_needs: formData.specific_needs,
          created_at: new Date().toISOString()
        })
        .eq('id', editingStudent.id);

      if (error) throw error;

      // Atualizar lista local
      setStudents(students.map(s =>
        s.id === editingStudent.id
          ? { ...s, ...formData }
          : s
      ));

    } catch (err) {
      console.error("Failed to update student", err);
      toast.error("Erro ao salvar alterações.");
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Alunos com Necessidades Especiais</h1>
            <p className="text-slate-500 text-base mt-1">Gerencie os diagnósticos e adaptações dos alunos.</p>
          </div>
          <Link href="/portal/secretariat">
            <Button variant="outline" className="border-slate-200">
              <ChevronRight size={16} className="mr-2 rotate-180" />
              Voltar ao Dashboard
            </Button>
          </Link>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-slate-200 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
                Total de Alunos NEE
              </CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-slate-900">{students.length}</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
                Média de Diagnósticos
              </CardTitle>
              <BookOpen className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-slate-900">
                {students.length > 0 ? '1.0' : '0'}
              </div>
              <p className="text-xs text-slate-500 mt-1">diagnóstico por aluno</p>
            </CardContent>
          </Card>
        </div>

        {/* STUDENTS LIST */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Alunos Cadastrados</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Buscar alunos..."
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 bg-slate-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : students.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Users size={48} className="text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum aluno cadastrado</h3>
                <p className="text-slate-500">Os alunos com necessidades especiais aparecerão aqui quando forem diagnosticados.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {students.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>

        {/* EDIT MODAL */}
        <EditStudentModal
          student={editingStudent}
          isOpen={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          onSave={handleSave}
        />

      </div>
    </div>
  );
}