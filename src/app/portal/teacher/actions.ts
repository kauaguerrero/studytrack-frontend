'use server'

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// ==============================================================================
// 1. Interfaces
// ==============================================================================

export interface TeacherClassroom {
  id: string; // ID da relação teacher_classroom
  subject: string;
  classroom: {
    id: string; // ID da classroom real
    name: string;
    year: string | number;
    school: {
      name: string;
      slug: string;
    } | null;
    total_students: number;
  };
  metrics: {
    avg_quality: number;
    avg_adherence: number;
    avg_streak: number;
  };
}

export interface Student {
  id: string;
  full_name: string;
  whatsapp_phone: string | null;
  last_active_at: string | null;
  streak: number;
  adherence: {
    completed: number;
    total: number;
  };
  quality: {
    correct: number;
    total: number;
    percentage: number;
  };
}

// ==============================================================================
// 2. Funções de Busca (Server Actions)
// ==============================================================================

export async function getTeacherClasses(): Promise<TeacherClassroom[]> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  // A MÁGICA ACONTECE AQUI:
  // Em vez de calcular tudo na mão, buscamos os metadados da relação
  // E fazemos um JOIN com nossa View SQL otimizada (view_classroom_metrics)
  
  const { data, error } = await supabase
    .from('teacher_classrooms')
    .select(`
      id,
      subject,
      classroom_id,
      classroom:classrooms (
        school:schools ( name, slug )
      ),
      metrics:view_classroom_metrics!classroom_id (
        classroom_name,
        classroom_year,
        student_count,
        avg_streak,
        avg_adherence,
        avg_quality
      )
    `)
    .eq('teacher_id', user.id);

  if (error) {
    console.error('❌ Erro ao buscar turmas (View):', error.message);
    return [];
  }

  if (!data) return [];

  // Mapeamento simples (O(n) leve) apenas para ajustar estrutura
  // O "metrics" vem como array ou objeto dependendo da relação, assumimos objeto único aqui por ser 1:1 na view por ID
  return data.map((item: any) => {
    // view_classroom_metrics retorna um array ou objeto único. 
    // Como unimos por ID, deve vir 1 registro ou null.
    const stats = Array.isArray(item.metrics) ? item.metrics[0] : item.metrics;
    
    return {
      id: item.id,
      subject: item.subject,
      classroom: {
        id: item.classroom_id,
        name: stats?.classroom_name || 'Turma Carregando...',
        year: stats?.classroom_year || new Date().getFullYear(),
        school: item.classroom?.school ? {
          name: item.classroom.school.name,
          slug: item.classroom.school.slug
        } : null,
        total_students: stats?.student_count || 0,
      },
      metrics: {
        avg_quality: stats?.avg_quality || 0,
        avg_adherence: stats?.avg_adherence || 0,
        avg_streak: stats?.avg_streak || 0
      }
    };
  });
}

// --- MANTIVE AS OUTRAS FUNÇÕES IGUAIS POIS ELAS BUSCAM DETALHES DE 1 TURMA SÓ ---
// (Não tem problema de performance buscar detalhes de 1 item sob demanda)

export interface ClassroomDetails {
  id: string;
  name: string;
  year: string | number;
  invite_code: string;
  school: { name: string } | null;
}

export async function getClassroomDetails(classroomId: string): Promise<ClassroomDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('classrooms')
    .select(`id, name, year, invite_code, school:schools ( name )`)
    .eq('id', classroomId)
    .single();

  if (error || !data) return null;

  // --- CORREÇÃO AQUI ---
  // O TypeScript reclama que 'school' é um array, então forçamos a verificação
  const schoolData = data.school as any;
  const school = Array.isArray(schoolData) ? schoolData[0] : schoolData;

  return {
    id: data.id,
    name: data.name,
    year: data.year,
    invite_code: data.invite_code,
    school: school || null
  };
}

// Mantendo a busca de lista de alunos (StudentList) igual, 
// pois ela já é paginada ou limitada ao contexto de uma única turma.
export async function getClassroomStudents(classroomId: string): Promise<Student[]> {
  const supabase = await createClient();
  const todayStr = new Date().toISOString().split('T')[0];
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, whatsapp_phone, last_active_at, current_streak') 
    .eq('classroom_id', classroomId)
    .eq('role', 'student') 
    .order('full_name', { ascending: true });

  if (error || !profiles) {
    return [];
  }

  if (profiles.length === 0) return [];

  const studentIds = profiles.map(p => p.id);

  const { data: tasks } = await supabase
    .from('plan_tasks')
    .select('user_id, status')
    .in('user_id', studentIds)
    .eq('scheduled_date', todayStr);

  const { data: answers } = await supabase
    .from('user_answers')
    .select('user_id, is_correct')
    .in('user_id', studentIds);

  return profiles.map(student => {
    const studentTasks = tasks?.filter(t => t.user_id === student.id) || [];
    const totalTasks = studentTasks.length;
    const completedTasks = studentTasks.filter(t => t.status === 'completed').length;

    const studentAnswers = answers?.filter(a => a.user_id === student.id) || [];
    const totalQuestions = studentAnswers.length;
    const correctQuestions = studentAnswers.filter(a => a.is_correct).length;
    
    const accuracy = totalQuestions > 0 
        ? Math.round((correctQuestions / totalQuestions) * 100) 
        : 0;

    return {
        id: student.id,
        full_name: student.full_name || 'Aluno sem nome',
        whatsapp_phone: student.whatsapp_phone,
        last_active_at: student.last_active_at,
        streak: student.current_streak || 0,
        adherence: { completed: completedTasks, total: totalTasks },
        quality: { correct: correctQuestions, total: totalQuestions, percentage: accuracy }
    };
  });
}