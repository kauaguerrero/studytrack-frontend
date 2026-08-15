'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { RegionData, MetricLayer, SelectedRegion } from '../types';
import type { Lead, LeadStatusCRM } from '../../prospeccao/types';
import { choroplethColor, metricValue, STATE_CENTROIDS, FUNNEL_ORDER, FUNNEL_LABELS, FUNNEL_COLORS, CHANNEL_LABELS } from '../constants';

const NATIONAL_W = 1000;
const NATIONAL_H = 912;
const CITY_W = 800;
const CITY_H = 640;

// ── Pin visual specs — cor sempre é a fase exata do CRM (FUNNEL_COLORS);
// só o raio/opacidade/glow variam pra destacar "fechado" (conversão) e
// esmaecer "perdido" (lead morto).
const DEFAULT_PIN_R = 4.5;
const PIN_R: Partial<Record<LeadStatusCRM, number>> = {
  fechado: 5.5,
  perdido: 3.5,
};
const PIN_OPACITY: Partial<Record<LeadStatusCRM, number>> = {
  perdido: 0.55,
};

function pinFill(status: LeadStatusCRM): string {
  return FUNNEL_COLORS[status] ?? '#94a3b8';
}

// ── Deterministic jitter (stable across re-renders for the same lead ID) ─────

function jitter(id: string, range: number): [number, number] {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  const u = ((h >>> 0) & 0xFFFF) / 0xFFFF;
  const v = ((h >>> 16) & 0xFFFF) / 0xFFFF;
  return [(u * 2 - 1) * range, (v * 2 - 1) * range];
}

// ── Map file types ────────────────────────────────────────────────────────────

interface StatePath { uf: string; name: string; d: string }

interface Municipio {
  ibgeCode: string;
  nome: string;
  path: string;
  bbox: [number, number, number, number] | null;
}

interface CityMapFile { uf: string; viewBox: string; municipios: Municipio[] }

function normalizeName(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

// ── Projection: lat/lng → Simplemaps SVG (1000×912) ──────────────────────────
// Parameters derived from the 3 city calibration points embedded in the SVG
// (circle elements with class="lat|lng" containing exact geographic coordinates).
// Equirectangular x + Mercator y — matches the actual Simplemaps projection.
const PROJ_SCALE_X    = 20.139;
const PROJ_TX         = 1536.1;
const PROJ_MERC_SCALE = 1153.8;
const PROJ_TY         =  147.6;

function projectNational(lat: number, lng: number): [number, number] {
  const x = PROJ_SCALE_X * lng + PROJ_TX;
  const y = PROJ_MERC_SCALE * (-Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))) + PROJ_TY;
  return [x, y];
}

// ── State bounding boxes [xmin, xmax, ymin, ymax] no SVG Simplemaps 1000×912 ──
// Calculados dos paths SVG com rastreamento de coordenadas relativas.
// Clamp de segurança — com a projeção correta raramente é acionado.
const STATE_SVG_BBOX: Record<string, [number, number, number, number]> = {
  AC: [ 45.5, 193.9, 291.4, 373.5], AL: [766.1, 828.2, 326.3, 360.4],
  AM: [ 49.6, 402.0, 102.6, 346.8], AP: [432.5, 531.7,  58.1, 172.2],
  BA: [598.2, 783.7, 320.1, 523.1], CE: [701.4, 786.2, 203.8, 306.3],
  DF: [563.8, 583.5, 463.5, 475.0], ES: [692.6, 800.0, 513.6, 586.3],
  GO: [463.8, 611.5, 399.4, 547.9], MA: [554.5, 694.0, 168.9, 356.6],
  MG: [508.5, 733.3, 437.4, 621.5], MS: [364.8, 510.3, 499.1, 646.9],
  MT: [295.3, 524.4, 295.9, 516.9], PA: [348.5, 608.4,  95.1, 346.9],
  PB: [755.8, 835.4, 269.2, 315.1], PE: [702.9, 835.2, 294.5, 339.6],
  PI: [610.1, 722.2, 203.0, 368.4], PR: [436.3, 568.8, 613.4, 706.1],
  RJ: [632.6, 711.2, 575.6, 631.6], RN: [758.6, 870.0, 129.7, 288.5],
  RO: [190.2, 331.3, 309.3, 425.5], RR: [230.8, 350.5,  41.4, 176.2],
  RS: [375.9, 535.2, 714.4, 870.3], SC: [451.8, 561.8, 689.6, 766.5],
  SE: [765.9, 802.9, 340.4, 382.2], SP: [465.4, 646.7, 554.2, 674.8],
  TO: [514.2, 614.6, 251.8, 419.7],
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso));
}

// ── Tooltip SVG element ───────────────────────────────────────────────────────

function PinTooltip({ lead, cx, cy, svgW, svgH }: {
  lead: Lead; cx: number; cy: number; svgW: number; svgH: number;
}) {
  const name = lead.nome_fantasia ?? lead.razao_social;
  const loc = [lead.municipio, lead.uf].filter(Boolean).join(', ');
  const statusLabel = FUNNEL_LABELS[lead.status_crm] ?? lead.status_crm;

  const sortedContacts = [...lead.lead_contacts].sort(
    (a, b) => new Date(b.contact_date).getTime() - new Date(a.contact_date).getTime()
  );
  const last = sortedContacts[0] ?? null;
  const lastStr = last
    ? `${formatDate(last.contact_date)} · ${CHANNEL_LABELS[last.channel] ?? last.channel}`
    : 'Sem contatos';

  const W = 190;
  const H = last ? 82 : 66;
  const PAD = 12;

  // Flip to left if near right edge; flip up if near bottom edge
  const x = cx > svgW * 0.65 ? cx - W - PAD : cx + PAD;
  const y = Math.min(cy - H / 2, svgH - H - 6);

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={x} y={y} width={W} height={H} rx={5} ry={5}
        fill="white" stroke="#e2e8f0" strokeWidth={0.8}
        filter="drop-shadow(0 2px 6px rgba(0,0,0,.15))" />

      {/* Name */}
      <text x={x + 10} y={y + 18} fontSize={11} fontWeight="600" fill="#1e293b"
        fontFamily="system-ui,sans-serif">
        {name.length > 24 ? name.slice(0, 23) + '…' : name}
      </text>

      {/* Location */}
      <text x={x + 10} y={y + 33} fontSize={9} fill="#64748b" fontFamily="system-ui,sans-serif">
        {loc.length > 30 ? loc.slice(0, 29) + '…' : loc || '—'}
      </text>

      {/* Status */}
      <text x={x + 10} y={y + 48} fontSize={9} fill="#94a3b8" fontFamily="system-ui,sans-serif">
        {statusLabel}
      </text>

      {/* Last contact */}
      {last && (
        <text x={x + 10} y={y + 66} fontSize={9} fill="#94a3b8" fontFamily="system-ui,sans-serif">
          Último: {lastStr.length > 28 ? lastStr.slice(0, 27) + '…' : lastStr}
        </text>
      )}
    </g>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BrazilMap({
  region,
  regions,
  activeMetric,
  leads,
  filteredLeadId,
  onStateClick,
  onPinClick,
}: {
  region: SelectedRegion;
  regions: RegionData[];
  activeMetric: MetricLayer;
  leads: Lead[];
  filteredLeadId?: string | null;
  onStateClick: (uf: string, name: string) => void;
  onPinClick: (lead: Lead) => void;
}) {
  const [statePaths, setStatePaths] = useState<StatePath[]>([]);
  const [natCoords, setNatCoords] = useState<Map<string, [number, number]>>(new Map());
  const [cityMap, setCityMap] = useState<CityMapFile | null>(null);
  const [loadingCities, setLoadingCities] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const cityCache = useRef<Map<string, CityMapFile>>(new Map());

  // Load simplemaps SVG paths for national background
  useEffect(() => {
    fetch('/geo/brazil-states.svg')
      .then(r => r.text())
      .then(svgText => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const paths: StatePath[] = [];
        doc.querySelectorAll('path[id]').forEach(el => {
          const id = el.getAttribute('id') ?? '';
          if (id.startsWith('BR') && id.length === 4) {
            const d = el.getAttribute('d') ?? '';
            if (d) paths.push({ d, uf: id.slice(2), name: el.getAttribute('name') ?? '' });
          }
        });
        setStatePaths(paths);
      })
      .catch(err => console.error('Failed to load brazil-states.svg:', err));
  }, []);

  // Load national municipality coordinates lookup (for accurate national-level pin positioning)
  useEffect(() => {
    fetch('/maps/national-coords.json')
      .then(r => r.json())
      .then((data: Record<string, [number, number]>) => setNatCoords(new Map(Object.entries(data))))
      .catch(err => console.error('Failed to load national-coords.json:', err));
  }, []);

  // Load pre-computed city map for the selected state
  useEffect(() => {
    if (region.level !== 'state' || !region.uf) return;
    const uf = region.uf;
    if (cityCache.current.has(uf)) { setCityMap(cityCache.current.get(uf)!); return; }
    setLoadingCities(true);
    fetch(`/maps/cities/${uf.toLowerCase()}.json`)
      .then(r => r.json())
      .then((data: CityMapFile) => { cityCache.current.set(uf, data); setCityMap(data); })
      .catch(err => console.error(`Failed to load city map for ${uf}:`, err))
      .finally(() => setLoadingCities(false));
  }, [region]);

  const activeCityMap = region.level === 'state' && cityMap?.uf === region.uf ? cityMap : null;

  // ── Build city bbox center map for state-level pin positioning ────────────
  const cityBboxCenter = new Map<string, [number, number]>();
  if (activeCityMap) {
    for (const mun of activeCityMap.municipios) {
      if (!mun.bbox) continue;
      cityBboxCenter.set(normalizeName(mun.nome), [
        (mun.bbox[0] + mun.bbox[2]) / 2,
        (mun.bbox[1] + mun.bbox[3]) / 2,
      ]);
    }
  }

  // ── Compute pin positions for visible leads ───────────────────────────────
  interface PositionedLead {
    lead: Lead;
    cx: number;
    cy: number;
  }

  // When filteredLeadId is set, only show that lead
  const visibleLeads = filteredLeadId
    ? leads.filter(l => l.id === filteredLeadId)
    : leads;

  const positionedLeads: PositionedLead[] = [];

  if (region.level === 'national') {
    for (const lead of visibleLeads) {
      let cx: number, cy: number;

      const bb = STATE_SVG_BBOX[lead.uf ?? ''];

      if (lead.lat != null && lead.lng != null) {
        // Priority 1: geocoded coordinates → projeção calibrada pelos pontos do SVG
        const [jx, jy] = jitter(lead.id, 5);
        const [px, py] = projectNational(lead.lat, lead.lng);
        cx = px + jx;
        cy = py + jy;
      } else {
        // Priority 2: centroide IBGE (national-coords.json)
        const cityKey = lead.municipio
          ? `${lead.uf ?? ''}:${normalizeName(lead.municipio)}`
          : null;
        const natPos = cityKey ? natCoords.get(cityKey) : undefined;
        if (natPos) {
          const [jx, jy] = jitter(lead.id, 8);
          cx = natPos[0] + jx;
          cy = natPos[1] + jy;
        } else {
          // Priority 3: centroide do estado (último recurso)
          const centroid = STATE_CENTROIDS[lead.uf ?? ''];
          if (!centroid) continue;
          const [jx, jy] = jitter(lead.id, 22);
          cx = centroid[0] + jx;
          cy = centroid[1] + jy;
        }
      }

      // Clamp de segurança — mantém pins dentro do bbox do estado no SVG
      if (bb) {
        cx = Math.max(bb[0] + 4, Math.min(bb[1] - 4, cx));
        cy = Math.max(bb[2] + 4, Math.min(bb[3] - 4, cy));
      }

      positionedLeads.push({ lead, cx, cy });
    }
  } else if (region.level === 'state' && region.uf) {
    const ufLeads = visibleLeads.filter(l => l.uf === region.uf);
    for (const lead of ufLeads) {
      const pos = lead.municipio ? cityBboxCenter.get(normalizeName(lead.municipio)) : undefined;
      if (!pos) continue;
      const [jx, jy] = jitter(lead.id, 9);
      positionedLeads.push({ lead, cx: pos[0] + jx, cy: pos[1] + jy });
    }
  }

  // Render order segue a progressão do funil — fases mais avançadas desenham
  // por cima das mais iniciais (mais leads em 'novo' não deve encobrir os
  // poucos já em negociação avançada).
  positionedLeads.sort(
    (a, b) => FUNNEL_ORDER.indexOf(a.lead.status_crm) - FUNNEL_ORDER.indexOf(b.lead.status_crm)
  );

  // ── Choropleth data for national view ────────────────────────────────────
  const maxValue = Math.max(1, ...regions.map(r => metricValue(r, activeMetric)));
  const regionMap = new Map(regions.map(r => [r.key, r]));

  const svgW = region.level === 'state' ? CITY_W : NATIONAL_W;
  const svgH = region.level === 'state' ? CITY_H : NATIONAL_H;
  const viewBox = `0 0 ${svgW} ${svgH}`;

  const hoveredEntry = hoveredId ? positionedLeads.find(p => p.lead.id === hoveredId) : null;

  return (
    <div className="relative w-full bg-slate-100 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
      {loadingCities && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-white dark:bg-zinc-800 rounded-lg px-3 py-1.5 shadow-sm text-xs text-slate-500 dark:text-zinc-400">
          <span className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          Carregando cidades…
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={region.level + (region.uf ?? '')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <svg
            viewBox={viewBox}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            onMouseLeave={() => setHoveredId(null)}
            aria-label={region.level === 'national' ? 'Mapa do Brasil' : `Mapa de ${region.name ?? region.uf}`}
          >
            <defs>
              {/* Green glow filter for "fechado" pins */}
              <filter id="pin-glow-verde" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2.8" result="blur" />
                <feFlood floodColor="#4ade80" floodOpacity="0.7" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* ── National: state choropleth background (Simplemaps SVG) ──── */}
            {region.level === 'national' && statePaths.map(sp => {
              const r = regionMap.get(sp.uf);
              const value = r ? metricValue(r, activeMetric) : 0;
              return (
                <path
                  key={sp.uf}
                  d={sp.d}
                  fill={choroplethColor(value, maxValue, activeMetric)}
                  stroke="#000000"
                  strokeWidth={1}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onStateClick(sp.uf, sp.name)}
                  className="hover:brightness-90 transition-[filter]"
                >
                  <title>{sp.name}</title>
                </path>
              );
            })}

            {/* ── State: municipality polygon background ───────────────────── */}
            {region.level === 'state' && activeCityMap?.municipios.map(mun => (
              <path
                key={mun.ibgeCode}
                d={mun.path}
                fill="#f1f5f9"
                stroke="#94a3b8"
                strokeWidth={0.7}
              />
            ))}

            {/* ── Lead pins — cor = fase exata do CRM, ordenados pelo funil ─── */}
            {positionedLeads.map(({ lead, cx, cy }) => {
              const status = lead.status_crm;
              const r = PIN_R[status] ?? DEFAULT_PIN_R;
              const opacity = PIN_OPACITY[status] ?? 1;
              const isHovered = lead.id === hoveredId;
              return (
                <circle
                  key={lead.id}
                  cx={cx}
                  cy={cy}
                  r={isHovered ? r * 1.5 : r}
                  fill={pinFill(status)}
                  stroke="#000000"
                  strokeWidth={1}
                  opacity={isHovered ? 1 : opacity}
                  filter={status === 'fechado' ? 'url(#pin-glow-verde)' : undefined}
                  style={{ cursor: 'pointer', transition: 'r 0.1s, opacity 0.1s' }}
                  onMouseEnter={() => setHoveredId(lead.id)}
                  onClick={() => onPinClick(lead)}
                />
              );
            })}

            {/* ── Tooltip for hovered pin (rendered last = always on top) ─── */}
            {hoveredEntry && (
              <PinTooltip
                lead={hoveredEntry.lead}
                cx={hoveredEntry.cx}
                cy={hoveredEntry.cy}
                svgW={svgW}
                svgH={svgH}
              />
            )}
          </svg>
        </motion.div>
      </AnimatePresence>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-white/85 dark:bg-zinc-900/85 backdrop-blur-sm px-3 py-2 text-[11px] text-slate-500 dark:text-zinc-400">
        {region.level === 'national' && (
          <span className="flex items-center gap-1.5 mr-1">
            <span className="inline-block w-14 h-2 rounded" style={{ background: 'linear-gradient(to right, #f1f5f9, #7c3aed)' }} />
            volume
          </span>
        )}
        {FUNNEL_ORDER.map(status => {
          const r = PIN_R[status as LeadStatusCRM] ?? DEFAULT_PIN_R;
          const opacity = PIN_OPACITY[status as LeadStatusCRM] ?? 1;
          return (
            <span key={status} className="flex items-center gap-1.5">
              <svg width="12" height="12" style={{ overflow: 'visible', flexShrink: 0 }}>
                {status === 'fechado' && <circle cx="6" cy="6" r="7" fill={FUNNEL_COLORS.fechado} fillOpacity="0.3" />}
                <circle cx="6" cy="6" r={r - 0.5} fill={pinFill(status as LeadStatusCRM)} stroke="#000000" strokeWidth={1} opacity={opacity} />
              </svg>
              {FUNNEL_LABELS[status] ?? status}
            </span>
          );
        })}
      </div>
    </div>
  );
}
