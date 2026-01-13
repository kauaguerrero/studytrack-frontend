'use server'

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// ==============================================================================
// 1. Interfaces e Tipos
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
    total_students: number; // <--- NOVO
    total_tasks: number;    // <--- NOVO
  };
}

export interface ClassroomDetails {
  id: string;
  name: string;
  year: string | number;
  invite_code: string;
  school: {
    name: string;
  } | null;
}

export interface Student {
  id: string;
  full_name: string;
  whatsapp_phone: string | null;
  last_active_at: string | null;
  tasks_pending: number;
  tasks_completed: number;
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

  // Busca otimizada trazendo IDs para contagem
  const { data, error } = await supabase
    .from('teacher_classrooms')
    .select(`
      id,
      subject,
      classroom:classrooms (
        id,
        name,
        year,
        school:schools (
          name,
          slug
        ),
        profiles (id, role),  
        tasks (id)            
      )
    `)
    .eq('teacher_id', user.id);

  if (error) {
    console.error('❌ Erro Crítico ao buscar turmas:', error.message);
    return [];
  }

  if (!data) return [];

  return data.map((item: any) => {
    // Lógica de Contagem no Server Side (Rápido e Seguro)
    const students = item.classroom?.profiles || [];
    const tasks = item.classroom?.tasks || [];

    // Filtra apenas quem tem role 'student' para não contar professores/admins
    const studentCount = students.filter((p: any) => p.role === 'student').length;
    const taskCount = tasks.length;

    return {
      id: item.id,
      subject: item.subject,
      classroom: {
        id: item.classroom?.id || 'unknown',
        name: item.classroom?.name || 'Turma Sem Nome',
        year: item.classroom?.year || new Date().getFullYear(),
        school: item.classroom?.school ? {
          name: item.classroom.school.name,
          slug: item.classroom.school.slug
        } : null,
        total_students: studentCount, // <--- Preenchemos aqui
        total_tasks: taskCount        // <--- Preenchemos aqui
      }
    };
  });
}

// ... (Mantenha as outras funções getClassroomDetails e getClassroomStudents iguais)
export async function getClassroomDetails(classroomId: string): Promise<ClassroomDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('classrooms')
    .select(`id, name, year, invite_code, school:schools ( name )`)
    .eq('id', classroomId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    year: data.year,
    invite_code: data.invite_code,
    school: data.school
  };
}

export async function getClassroomStudents(classroomId: string): Promise<Student[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, whatsapp_phone') 
    .eq('classroom_id', classroomId)
    .eq('role', 'student') 
    .order('full_name', { ascending: true });

  if (error) {
    console.error("Erro ao buscar alunos:", JSON.stringify(error, null, 2));
    return [];
  }

  return (data as any[]).map(student => ({
    id: student.id,
    full_name: student.full_name || 'Aluno sem nome',
    whatsapp_phone: student.whatsapp_phone,
    last_active_at: null,
    tasks_pending: 0, 
    tasks_completed: 0
  }));
}