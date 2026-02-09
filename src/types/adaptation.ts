// src/types/adaptation.ts

export interface AdaptationStyle {
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: string;
  backgroundColor?: string;
  highlightKeywords?: boolean;
}

export interface AdaptedQuestion {
  id: number | string;
  original_excerpt: string;
  cognitive_skill?: string;
  
  // Conteúdo Editável
  adapted_content: string; // Texto do enunciado
  visual_cues: string; // Descrição da imagem ou Alt-text
  adaptation_justification: string; // Por que mudou?
  
  // Estilização (Meta-CSS)
  css_style: AdaptationStyle;
}

export interface AdaptedExamData {
  summary?: string;
  student_name?: string;
  applied_conditions?: string[];
  version?: string;
  metadata?: Record<string, unknown>;
  questions?: AdaptedQuestion[];
}

export interface AdaptationJob {
  id: string;
  original_filename: string;
  student_id?: string;
  adaptation_status: 'processing' | 'review_required' | 'completed' | 'failed' | 'error';
  final_json_data?: AdaptedExamData | null;
  created_at: string;
}