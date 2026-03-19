// src/app/api/admin/tasks/[taskId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  // 1. Aguarde a resolução da Promise antes de extrair os dados
  const { taskId } = await context.params;

  try {
    // 2. Sua lógica de negócio entra aqui
    // const body = await request.json();
    
    return NextResponse.json({ success: true, taskId });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao atualizar status da tarefa' }, 
      { status: 500 }
    );
  }
}