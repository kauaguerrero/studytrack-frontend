'use client';

// Torre de blocos estilo LEGO usada no painel do login: cada bloco é uma
// habilidade/ação que leva o aluno à aprovação. A montagem é guiada pelo
// progresso do formulário (0.25 carregou → 0.5 e-mail → 1.0 senha) e a
// desmontagem acontece quando as credenciais são apagadas.
// Visual adaptado do "interactive tech stack builder" (21st.dev).

import React from 'react';
import {
  motion, AnimatePresence, useMotionValue, useMotionTemplate, type MotionValue,
} from 'framer-motion';
import {
  User, Flame, Target, PenLine, FileCheck2, GraduationCap, type LucideIcon,
} from 'lucide-react';

const STUD_WIDTH = 65;
const ROW_HEIGHT = 80;
const COLS = 6;

const STUD_THEMES = {
  green: {
    wall: 'linear-gradient(90deg, #087028 0%, #10923b 20%, #1ab84d 38%, #20cc55 50%, #1ab84d 62%, #10923b 80%, #087028 100%)',
    cap: 'linear-gradient(135deg, #42f585 0%, #25dd62 40%, #18c04e 70%, #10a040 100%)',
    shadow: 'radial-gradient(ellipse, rgba(0,40,0,0.6) 0%, transparent 70%)',
    rim: 'rgba(255,255,255,0.7)',
  },
  yellow: {
    wall: 'linear-gradient(90deg, #a16207 0%, #ca8a04 20%, #eab308 38%, #facc15 50%, #eab308 62%, #ca8a04 80%, #a16207 100%)',
    cap: 'linear-gradient(135deg, #fef08a 0%, #fde047 40%, #eab308 70%, #ca8a04 100%)',
    shadow: 'radial-gradient(ellipse, rgba(80,50,0,0.6) 0%, transparent 70%)',
    rim: 'rgba(255,255,255,0.7)',
  },
  blue: {
    wall: 'linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 20%, #2563eb 38%, #3b82f6 50%, #2563eb 62%, #1d4ed8 80%, #1e3a8a 100%)',
    cap: 'linear-gradient(135deg, #93c5fd 0%, #60a5fa 40%, #3b82f6 70%, #2563eb 100%)',
    shadow: 'radial-gradient(ellipse, rgba(0,0,80,0.6) 0%, transparent 70%)',
    rim: 'rgba(255,255,255,0.7)',
  },
  red: {
    wall: 'linear-gradient(90deg, #7f1d1d 0%, #b91c1c 20%, #dc2626 38%, #ef4444 50%, #dc2626 62%, #b91c1c 80%, #7f1d1d 100%)',
    cap: 'linear-gradient(135deg, #fca5a5 0%, #f87171 40%, #ef4444 70%, #dc2626 100%)',
    shadow: 'radial-gradient(ellipse, rgba(80,0,0,0.6) 0%, transparent 70%)',
    rim: 'rgba(255,255,255,0.7)',
  },
  violet: {
    wall: 'linear-gradient(90deg, #581c87 0%, #7e22ce 20%, #9333ea 38%, #a855f7 50%, #9333ea 62%, #7e22ce 80%, #581c87 100%)',
    cap: 'linear-gradient(135deg, #d8b4fe 0%, #c084fc 40%, #a855f7 70%, #9333ea 100%)',
    shadow: 'radial-gradient(ellipse, rgba(40,0,80,0.6) 0%, transparent 70%)',
    rim: 'rgba(255,255,255,0.7)',
  },
  teal: {
    wall: 'linear-gradient(90deg, #115e59 0%, #0f766e 20%, #0d9488 38%, #14b8a6 50%, #0d9488 62%, #0f766e 80%, #115e59 100%)',
    cap: 'linear-gradient(135deg, #99f6e4 0%, #5eead4 40%, #2dd4bf 70%, #14b8a6 100%)',
    shadow: 'radial-gradient(ellipse, rgba(0,40,40,0.6) 0%, transparent 70%)',
    rim: 'rgba(255,255,255,0.7)',
  },
} as const;

type StudColor = keyof typeof STUD_THEMES;

const LegoStud = ({ color = 'green', yOffset = 0 }: { color?: StudColor; yOffset?: number }) => {
  const t = STUD_THEMES[color];
  const studHeight = 16;
  const studCapHeight = 16;

  return (
    <div className="relative flex flex-1 items-end justify-center" style={{ transform: `translateY(${yOffset}px)` }}>
      <div
        className="absolute bottom-[-3px] left-1/2 z-0 w-[75%] -translate-x-1/2 rounded-[50%]"
        style={{ height: '10px', background: t.shadow }}
      />
      <div className="relative z-10" style={{ width: '72%', maxWidth: '42px', marginBottom: '-1px' }}>
        <div
          className="relative w-full overflow-hidden"
          style={{ height: `${studHeight}px`, borderRadius: '50% / 20%', background: t.wall }}
        >
          <div
            className="absolute left-[20%] top-0 h-full w-[25%]"
            style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.25), transparent)' }}
          />
        </div>
        <div
          className="absolute left-0 flex w-full items-center justify-center overflow-hidden rounded-[50%]"
          style={{
            top: `-${studCapHeight / 2}px`,
            height: `${studCapHeight}px`,
            background: t.cap,
            boxShadow: 'inset 0px 2px 4px rgba(255,255,255,0.6), inset 0px -2px 4px rgba(0,0,0,0.2), 0px 1px 1px rgba(0,0,0,0.4)',
            borderTop: `1px solid ${t.rim}`,
          }}
        >
          <span
            className="pointer-events-none select-none text-[10px] font-black tracking-widest opacity-80"
            style={{
              color: 'rgba(0,0,0,0.15)',
              textShadow: '0px 1px 0px rgba(255,255,255,0.6)',
              transform: 'scaleY(0.55) translateY(-1px)',
            }}
          >
            ST
          </span>
        </div>
      </div>
    </div>
  );
};

interface LegoBlockProps {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  topColor: string;
  faceGradient: string;
  bottomColor: string;
  topHeight?: number;
  bottomHeight?: number;
  className?: string;
  children: React.ReactNode;
  studs?: number;
  studColor?: StudColor;
  hideStuds?: number[];
}

const LegoBlock = ({
  mouseX, mouseY,
  topColor, faceGradient, bottomColor,
  topHeight = 19, bottomHeight = 15,
  className = '',
  children, studs = 0, studColor = 'green', hideStuds = [],
}: LegoBlockProps) => {
  const highlightBg = useMotionTemplate`radial-gradient(circle 120px at ${mouseX}% ${mouseY}%, rgba(255,255,255,0.25), transparent)`;

  return (
    <div className={`relative w-full ${className}`}>
      <div
        className="relative w-full"
        style={{
          height: `${topHeight}px`,
          background: `linear-gradient(to bottom, ${topColor}, color-mix(in srgb, ${topColor} 100%, black))`,
          boxShadow: 'inset 0px 0px 4px rgba(0,0,0,0.28)',
          borderRadius: '4px 4px 0 0',
        }}
      >
        {studs > 0 && (
          <div className="absolute bottom-full left-0 flex w-full">
            {[...Array(studs)].map((_, i) => (
              hideStuds.includes(i)
                ? <div key={i} className="flex-1" />
                : <LegoStud key={i} color={studColor} yOffset={12} />
            ))}
          </div>
        )}
      </div>
      <div
        className="relative w-full overflow-hidden border-x border-black/5"
        style={{ background: faceGradient, boxShadow: 'inset 0px 2px 6px rgba(255,255,255,0.47)' }}
      >
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 opacity-60"
          style={{ background: highlightBg }}
        />
        <div className="relative z-30">{children}</div>
      </div>
      <div
        className="relative w-full"
        style={{
          height: `${bottomHeight}px`,
          background: bottomColor,
          boxShadow: 'inset 0px 2px 4px rgba(0,0,0,0.28), 0px 3px 6px rgba(0,0,0,0.3)',
          borderRadius: '0 0 4px 4px',
        }}
      />
    </div>
  );
};

// ─── Habilidades que constroem a aprovação ───────────────────────────────────
// threshold: fração de progresso do login em que o bloco entra na torre.
// row/col: posição fixa na grade de 6 studs (base = row -1).

interface Skill {
  id: string;
  name: string;
  icon: LucideIcon;
  studs: number;
  row: number;
  col: number;
  threshold: number;
  topColor: string;
  faceGradient: string;
  bottomColor: string;
  studColor: StudColor;
  iconBg: string;
}

// Duas fileiras de 3+3 studs (largura simétrica — nenhum nome fica espremido)
// mais o bloco de topo centralizado. Thresholds espaçados em 5 degraus: 2
// caem enquanto o e-mail é digitado (0–0.5), 3 caem enquanto a senha é
// digitada (0.5–1.0), o último só quando ela atinge o mínimo exigido.
const SKILLS: Skill[] = [
  {
    id: 'constancia', name: 'Constância', icon: Flame, studs: 3, row: 0, col: 0, threshold: 0.15,
    topColor: '#38bdf8',
    faceGradient: 'linear-gradient(180deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%)',
    bottomColor: '#075985',
    studColor: 'blue',
    iconBg: 'bg-black/20 shadow-inner',
  },
  {
    id: 'foco', name: 'Foco', icon: Target, studs: 3, row: 0, col: 3, threshold: 0.35,
    topColor: '#f87171',
    faceGradient: 'linear-gradient(180deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
    bottomColor: '#7f1d1d',
    studColor: 'red',
    iconBg: 'bg-black/20 shadow-inner',
  },
  {
    id: 'simulados', name: 'Simulados', icon: FileCheck2, studs: 3, row: 1, col: 0, threshold: 0.6,
    topColor: '#2dd4bf',
    faceGradient: 'linear-gradient(180deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)',
    bottomColor: '#115e59',
    studColor: 'teal',
    iconBg: 'bg-black/20 shadow-inner',
  },
  {
    id: 'redacao', name: 'Redação', icon: PenLine, studs: 3, row: 1, col: 3, threshold: 0.8,
    topColor: '#c084fc',
    faceGradient: 'linear-gradient(180deg, #a855f7 0%, #9333ea 50%, #7e22ce 100%)',
    bottomColor: '#581c87',
    studColor: 'violet',
    iconBg: 'bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]',
  },
  {
    id: 'aprovacao', name: 'Aprovação', icon: GraduationCap, studs: 4, row: 2, col: 1, threshold: 1,
    topColor: '#4ade80',
    faceGradient: 'linear-gradient(180deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
    bottomColor: '#14532d',
    studColor: 'green',
    iconBg: 'bg-black/20 shadow-inner',
  },
];

function SkillBlock({ skill, hiddenStuds, mouseX, mouseY }: {
  skill: Skill;
  hiddenStuds: number[];
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}) {
  // 3 tiers de tamanho: blocos estreitos usam ícone/texto menores pra sobrar
  // espaço pro nome (ex. "Constância", "Simulados") não cortar.
  const tier = skill.studs <= 2 ? 'sm' : skill.studs === 3 ? 'md' : 'lg';
  const Icon = skill.icon;

  const sizing = {
    sm: { gap: 'gap-2 px-2.5', icon: 'h-6 w-6 rounded-md', iconSize: 16, text: 'text-[13px]' },
    md: { gap: 'gap-2.5 px-3', icon: 'h-7 w-7 rounded-md', iconSize: 17, text: 'text-[14.5px]' },
    lg: { gap: 'gap-3 px-4', icon: 'h-9 w-9 rounded-lg', iconSize: 24, text: 'text-[17px]' },
  }[tier];

  return (
    <div style={{ width: skill.studs * STUD_WIDTH }}>
      <LegoBlock
        mouseX={mouseX}
        mouseY={mouseY}
        topColor={skill.topColor}
        faceGradient={skill.faceGradient}
        bottomColor={skill.bottomColor}
        studs={skill.studs}
        studColor={skill.studColor}
        hideStuds={hiddenStuds}
      >
        <div className={`flex h-[60px] w-full items-center ${sizing.gap}`}>
          <div className={`${sizing.icon} ${skill.iconBg} flex shrink-0 items-center justify-center`}>
            <Icon className="text-white drop-shadow-sm" size={sizing.iconSize} />
          </div>
          <h4 className={`truncate font-sans font-bold tracking-wide text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] ${sizing.text}`}>
            {skill.name}
          </h4>
        </div>
      </LegoBlock>
    </div>
  );
}

export function LegoApprovalStack({ progress, className = '' }: { progress: number; className?: string }) {
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);

  const present = SKILLS.filter((s) => progress >= s.threshold - 0.001);

  // Mapa de ocupação por linha — decide quais studs ficam escondidos por
  // haver bloco encaixado em cima.
  const occ: (string | null)[][] = [];
  for (const s of present) {
    if (!occ[s.row]) occ[s.row] = Array(COLS).fill(null);
    for (let i = 0; i < s.studs; i++) occ[s.row][s.col + i] = s.id;
  }
  const hiddenFor = (row: number, col: number, studs: number): number[] => {
    const above = occ[row + 1];
    if (!above) return [];
    const hidden: number[] = [];
    for (let i = 0; i < studs; i++) if (above[col + i]) hidden.push(i);
    return hidden;
  };
  const baseHidden = occ[0] ? occ[0].map((v, i) => (v ? i : -1)).filter((i) => i >= 0) : [];

  const towerHeight = occ.length * ROW_HEIGHT;

  return (
    <div
      className={className}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mouseX.set(((e.clientX - r.left) / r.width) * 100);
        mouseY.set(((e.clientY - r.top) / r.height) * 100);
      }}
    >
      <div
        className="relative w-[390px] rounded-xl shadow-[0_30px_60px_-10px_rgba(0,0,0,0.6),0_10px_20px_rgba(0,0,0,0.4)] transition-all duration-700 ease-out"
        style={{ marginTop: `${towerHeight + 40}px` }}
      >
        {/* Blocos empilhados */}
        <div className="absolute left-0 z-20 h-0 w-full" style={{ bottom: 'calc(100% - 14px)' }}>
          <AnimatePresence>
            {present.map((s) => (
              <motion.div
                key={s.id}
                className="absolute"
                style={{
                  bottom: s.row * ROW_HEIGHT,
                  left: s.col * STUD_WIDTH,
                  zIndex: s.row * 10,
                  transformOrigin: 'bottom center',
                }}
                initial={{ y: -460, x: 0, rotate: 0, opacity: 0 }}
                animate={{
                  // Cai balançando de leve (pêndulo) antes de encaixar com squash & bounce.
                  y: [-460, -460, -320, -200, -90, -20, 0, -12, 0],
                  x: [0, 0, -10, 8, -5, 0, 0, 0, 0],
                  rotate: [0, 0, -5, 4, -2, 0, 0, 0, 0],
                  scaleX: [1, 1, 1, 1, 1, 1, 1.12, 0.95, 1],
                  scaleY: [1, 1, 1, 1, 1, 1, 0.86, 1.06, 1],
                  opacity: [0, 1, 1, 1, 1, 1, 1, 1, 1],
                  filter: [
                    'drop-shadow(0px 0px 0px rgba(0,0,0,0))',
                    'drop-shadow(0px 45px 24px rgba(0,0,0,0.4))',
                    'drop-shadow(0px 38px 22px rgba(0,0,0,0.4))',
                    'drop-shadow(0px 28px 18px rgba(0,0,0,0.38))',
                    'drop-shadow(0px 16px 14px rgba(0,0,0,0.36))',
                    'drop-shadow(0px 8px 10px rgba(0,0,0,0.34))',
                    'drop-shadow(0px 3px 5px rgba(0,0,0,0.4))',
                    'drop-shadow(0px 10px 8px rgba(0,0,0,0.22))',
                    'drop-shadow(0px 6px 10px rgba(0,0,0,0.45))',
                  ],
                }}
                exit={{ y: -260, opacity: 0, rotate: 6, transition: { duration: 0.4, ease: 'easeIn' } }}
                transition={{
                  duration: 1,
                  times: [0, 0.1, 0.3, 0.45, 0.6, 0.72, 0.85, 0.93, 1],
                  ease: 'easeOut',
                  delay: s.col * 0.07 + s.row * 0.12,
                }}
              >
                <SkillBlock skill={s} hiddenStuds={hiddenFor(s.row, s.col, s.studs)} mouseX={mouseX} mouseY={mouseY} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Bloco base — o aluno */}
        <LegoBlock
          mouseX={mouseX}
          mouseY={mouseY}
          topColor="#eab308"
          faceGradient="linear-gradient(180deg, #facc15 0%, #eab308 50%, #ca8a04 100%)"
          bottomColor="#a16207"
          studs={6}
          studColor="yellow"
          hideStuds={baseHidden}
          className="relative z-10"
        >
          <div className="flex items-center justify-between px-5 py-4 pt-5">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/20 shadow-inner">
                <User className="h-6 w-6 text-white drop-shadow-md" size={24} />
              </div>
              <div className="text-white drop-shadow-md">
                <h3 className="truncate font-sans text-[17px] font-bold tracking-wide drop-shadow-md">Sua aprovação</h3>
                <p className="mt-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-100/90 drop-shadow-sm">
                  {present.length}/{SKILLS.length} conquistas
                </p>
              </div>
            </div>
          </div>
        </LegoBlock>
      </div>
    </div>
  );
}
