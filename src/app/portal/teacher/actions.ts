'use server'

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { reportError } from '@/lib/reportError';

// ==============================================================================
// 1. Interfaces
// ==============================================================================

export interface TeacherClassroom {
  id: string; 
  subject: string;
  classroom: {
    id: string; 
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

export interface ClassroomDetails {
  id: string;
  name: string;
  year: string | number;
  invite_code: string;
  school: { name: string } | null;
}

// Interfaces para o Dashboard Geral
export interface GeneralStudent {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp_phone: string | null;
  classroom_name: string;
  last_active_at: string | null;
  streak: number;
}

export interface GradeEntry {
  student_name: string;
  classroom_name: string;
  activity_title: string;
  grade: number | null;
  status: string;
  delivered_at: string | null;
}

// ==============================================================================
// 2. Funções de Busca: TURMAS (Mantém lógica original via View)
// ==============================================================================

export async function getTeacherClasses(): Promise<TeacherClassroom[]> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

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
    console.error('❌ Erro Query Turmas:', error);
    await reportError("TeacherActionRpcError", String(error), { flow: "get_teacher_classes" });
    return [];
  }

  if (!data) return [];

  return data.map((item: any) => {
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

export async function getClassroomDetails(classroomId: string): Promise<ClassroomDetails | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('classrooms')
    .select(`id, name, year, invite_code, school:schools ( name )`)
    .eq('id', classroomId)
    .single();

  if (error || !data) return null;

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

// ==============================================================================
// 3. Funções de Busca: ALUNOS E NOTAS (Via RPC / Funções Seguras)
// ==============================================================================

// A. Alunos de uma Turma Específica
export async function getClassroomStudents(classroomId: string): Promise<Student[]> {
  const supabase = await createClient();
  
  console.log(`🔍 [RPC] Buscando alunos da sala: ${classroomId}`);

  const { data, error } = await supabase
    .rpc('get_classroom_students_secure', { 
        target_classroom_id: classroomId 
    });

  if (error) {
    console.error('❌ [RPC] Erro crítico get_classroom_students_secure:', error.message);
    await reportError("TeacherActionRpcError", String(error), { flow: "get_classroom_students_secure" });
    return [];
  }

  if (!data || data.length === 0) return [];

  return data.map((row: any) => {
    const totalQuestions = Number(row.quality_total || 0);
    const correctQuestions = Number(row.quality_correct || 0);
    const accuracy = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0;

    return {
        id: row.id,
        full_name: row.full_name || 'Aluno sem nome',
        whatsapp_phone: row.whatsapp_phone,
        last_active_at: row.last_active_at,
        streak: Number(row.streak || 0),
        adherence: { 
            completed: Number(row.adherence_completed || 0), 
            total: Number(row.adherence_total || 0) 
        },
        quality: { 
            correct: correctQuestions, 
            total: totalQuestions, 
            percentage: accuracy 
        }
    };
  });
}

// B. Todos os Meus Alunos (Painel Geral)
export async function getAllMyStudents(): Promise<GeneralStudent[]> {
  const supabase = await createClient();
  
  console.log('🔍 [RPC] Buscando TODOS os alunos (Geral)...');

  const { data, error } = await supabase.rpc('get_all_my_students_secure');

  if (error) {
    console.error('❌ [RPC] Erro get_all_my_students_secure:', error.message);
    await reportError("TeacherActionRpcError", String(error), { flow: "get_all_my_students_secure" });
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    full_name: row.full_name || 'Aluno Desconhecido',
    email: row.email,
    whatsapp_phone: row.whatsapp_phone,
    classroom_name: row.classroom_name,
    last_active_at: row.last_active_at,
    streak: Number(row.streak || 0)
  }));
}

// C. Todas as Notas (Painel Geral)
export async function getAllMyGrades(): Promise<GradeEntry[]> {
  const supabase = await createClient();
  
  console.log('🔍 [RPC] Buscando TODAS as notas (Geral)...');

  const { data, error } = await supabase.rpc('get_all_my_grades_secure');

  if (error) {
    console.error('❌ [RPC] Erro get_all_my_grades_secure:', error.message);
    await reportError("TeacherActionRpcError", String(error), { flow: "get_all_my_grades_secure" });
    return [];
  }

  return (data || []).map((row: any) => ({
    student_name: row.student_name || 'Aluno',
    classroom_name: row.classroom_name || 'Turma',
    activity_title: row.activity_title || 'Atividade',
    grade: row.grade !== null ? Number(row.grade) : null,
    status: row.status,
    delivered_at: row.delivered_at
  }));
}