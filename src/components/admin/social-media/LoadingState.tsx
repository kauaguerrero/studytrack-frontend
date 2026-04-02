'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

const DOTS_INTERVAL = 500;

export default function LoadingState({ message = 'Gerando seu post...' }: LoadingStateProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, DOTS_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-blue-100 dark:border-blue-900" />
        <Loader2
          className="absolute inset-0 w-16 h-16 text-blue-600 dark:text-blue-400 animate-spin"
          strokeWidth={2.5}
        />
      </div>
      <div>
        <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          {message}
          <span className="inline-block w-6 text-left">{dots}</span>
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Isso pode levar alguns segundos.
        </p>
      </div>
    </div>
  );
}
