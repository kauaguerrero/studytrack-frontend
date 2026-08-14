'use client';

// Pilha de palavras skewed/3D que se revelam ao passar o mouse — efeito
// visual do painel direito do login do parceiro. Cada linha compartilha uma
// palavra com a anterior (top da linha N = bottom da linha N-1), formando
// uma "corrente" que sobe ao hover.

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type React from 'react';

interface LayeredTextProps {
  lines?: Array<{ top: string; bottom: string }>;
  fontSize?: string;
  lineHeight?: number;
  className?: string;
}

const DEFAULT_LINES = [
  { top: ' ', bottom: 'FOCO' },
  { top: 'FOCO', bottom: 'ROTINA' },
  { top: 'ROTINA', bottom: 'ESFORÇO' },
  { top: 'ESFORÇO', bottom: 'EVOLUÇÃO' },
  { top: 'EVOLUÇÃO', bottom: 'APROVAÇÃO' },
  { top: 'APROVAÇÃO', bottom: 'CONQUISTA' },
  { top: 'CONQUISTA', bottom: ' ' },
];

export function LayeredText({
  lines = DEFAULT_LINES,
  fontSize = '52px',
  lineHeight = 46,
  className = '',
}: LayeredTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateTranslateX = (index: number) => {
    const baseOffset = 26;
    const centerIndex = Math.floor(lines.length / 2);
    return (index - centerIndex) * baseOffset;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const paragraphs = container.querySelectorAll('p');

    const timeline = gsap.timeline({ paused: true });
    timeline.to(paragraphs, {
      y: -lineHeight * 0.7,
      duration: 0.8,
      ease: 'power2.out',
      stagger: 0.08,
    });

    const handleMouseEnter = () => timeline.play();
    const handleMouseLeave = () => timeline.reverse();

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      timeline.kill();
    };
  }, [lines, lineHeight]);

  return (
    <div
      ref={containerRef}
      className={`mx-auto select-none font-sans font-black uppercase tracking-[-1.5px] text-white antialiased cursor-pointer ${className}`}
      style={{ fontSize }}
    >
      <ul className="m-0 flex list-none flex-col items-center p-0">
        {lines.map((line, index) => {
          const translateX = calculateTranslateX(index);
          const isEven = index % 2 === 0;
          return (
            <li
              key={index}
              className="relative overflow-hidden"
              style={{
                height: `${lineHeight}px`,
                transform: `translateX(${translateX}px) skew(${isEven ? '60deg, -30deg' : '0deg, -30deg'}) scaleY(${isEven ? 0.66667 : 1.33333})`,
              }}
            >
              <p
                className="m-0 whitespace-nowrap px-[15px] align-top"
                style={{ height: `${lineHeight}px`, lineHeight: `${lineHeight - 4}px` }}
              >
                {line.top}
              </p>
              <p
                className="m-0 whitespace-nowrap px-[15px] align-top"
                style={{ height: `${lineHeight}px`, lineHeight: `${lineHeight - 4}px` }}
              >
                {line.bottom}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
