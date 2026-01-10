'use server'

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Definição clara do tipo para evitar erros de TS no frontend
export interface TeacherClassroom {
  id: string; 
  subject: string;
  classroom: {
    id: string;
    name: string;
    year: number;
    school: {
      name: string;
      slug: string;
    } | null; 
  };
}

export async function getTeacherClasses(): Promise<TeacherClassroom[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

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
        )
      )
    `)
    .eq('teacher_id', user.id);

  if (error) {
    console.error('Erro ao buscar turmas:', error);
    return [];
  }

  // Casting necessário para garantir a tipagem correta no retorno
  return (data as any[]).map(item => ({
    id: item.id,
    subject: item.subject,
    classroom: {
      id: item.classroom.id,
      name: item.classroom.name,
      year: item.classroom.year,
      school: item.classroom.school
    }
  }));
}