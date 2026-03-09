'use client'

import { useState } from "react";
import Image from "next/image";

export function Logo() {
  const [error, setError] = useState(false);

  return (
    <div className="flex items-center gap-0.25">
      {!error ? (
        <Image
          src="/logost-transparente-sombra.png"
          alt="Logo StudyTrack"
          width={56}
          height={56}
          className="rounded-xl object-cover"
          priority
          onError={() => setError(true)}
        />
      ) : (
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