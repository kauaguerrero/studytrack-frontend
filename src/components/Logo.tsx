'use client'

import { useState } from "react";

export function Logo() {
  const [error, setError] = useState(false);

  return (
    <div className="flex items-center gap-0.25">
      {/* Se não deu erro, mostra a imagem */}
      {!error ? (
        <img 
          src="/logost-transparente-sombra.png" 
          alt="Logo StudyTrack" 
          className="w-14 h-14 rounded-xl object-cover"
          onError={() => setError(true)}
        />
      ) : (
        // Fallback: Ajustado para o mesmo tamanho do ícone
        <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-sm text-xl">
          ST
        </div>
      )}
      
      <h1 className="text-3xl font-bold text-blue-600 tracking-tight">
        StudyTrack
      </h1>
    </div>
  );
}