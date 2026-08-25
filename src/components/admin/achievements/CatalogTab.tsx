"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getAchievementIcon, getDifficultyStyle, formatChancePct } from "@/lib/achievement-icons";
import { fetchAdminJSON, buildOrgQuery } from "./api";
import Pagination from "./Pagination";
import type { CatalogResponse, CatalogAchievement } from "./types";

const LIMIT = 12;

// Mirror de CATEGORY_GROUPS/GROUP_LABELS (achievements_service.py) — grupo é
// mais grosso que `category` de propósito (8 baldes em vez de 15, a maioria
// com 1 única conquista, o que tornava o filtro por categoria inútil).
const GROUP_OPTIONS: { value: string; label: string }[] = [
  { value: "level", label: "Nível de conta" },
  { value: "questions", label: "Questões" },
  { value: "simulados", label: "Simulados" },
  { value: "streak", label: "Sequência" },
  { value: "essay", label: "Redação" },
  { value: "subjects", label: "Matérias" },
  { value: "habits", label: "Hábitos de estudo" },
  { value: "elite", label: "Conquistas de elite" },
];

const DIFFICULTY_OPTIONS: { value: string; label: string }[] = [
  { value: "common", label: "Comum" },
  { value: "uncommon", label: "Incomum" },
  { value: "rare", label: "Raro" },
  { value: "epic", label: "Épico" },
  { value: "legendary", label: "Lendário" },
  { value: "ultra_rare", label: "Ultra Raro" },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "default", label: "Ordem padrão" },
  { value: "rarity_desc", label: "Raridade: mais rara primeiro" },
  { value: "rarity_asc", label: "Raridade: mais comum primeiro" },
  { value: "completion_desc", label: "Desbloqueio: maior % primeiro" },
  { value: "completion_asc", label: "Desbloqueio: menor % primeiro" },
  { value: "title_asc", label: "Nome (A-Z)" },
];

const selectCls = "h-8 rounded-full border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-slate-700 dark:text-white outline-none focus:border-amber-400";

function AchievementCard({ a }: { a: CatalogAchievement }) {
  const Icon = getAchievementIcon(a.icon);
  const style = getDifficultyStyle(a.difficulty);
  const chance = formatChancePct(a.chance_pct);

  return (
    <div className={`rounded-2xl border p-4 ${style.cardBorder} ${style.cardBg}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.iconBg} ${style.iconText}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{a.title}</p>
            <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide ${style.chanceText}`}>
              {a.difficulty_label}
            </span>
          </div>
          <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500 dark:text-white/50">{a.description}</p>
        </div>
      </div>

      <div className="mt-3.5">
        <div className="mb-1 flex items-center justify-between text-[10.5px] font-semibold text-slate-500 dark:text-white/45">
          <span>{a.completion_pct}% dos alunos</span>
          <span>{a.completion_count} desbloquearam{chance ? ` · design: ${chance}` : ""}</span>
        </div>
        <Progress value={a.completion_pct} className="h-2" indicatorClassName={style.iconText.replaceAll("text-", "bg-")} />
      </div>
    </div>
  );
}

interface Props {
  apiUrl: string;
  orgId: string | null;
}

export default function CatalogTab({ apiUrl, orgId }: Props) {
  const [page, setPage] = useState(1);
  const [group, setGroup] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [sort, setSort] = useState("default");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [list, setList] = useState<CatalogAchievement[]>([]);
  const [total, setTotal] = useState(0);
  const [studentsInScope, setStudentsInScope] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), sort });
    if (group) params.set("group", group);
    if (difficulty) params.set("difficulty", difficulty);
    if (debouncedSearch) params.set("search", debouncedSearch);
    const path = `/api/admin/achievements/catalog?${params}${buildOrgQuery(orgId)}`;
    const res = await fetchAdminJSON<CatalogResponse>(apiUrl, path);
    if (res) {
      setList(res.achievements);
      setTotal(res.total);
      setStudentsInScope(res.students_in_scope);
    }
    setLoading(false);
  }, [apiUrl, page, group, difficulty, sort, debouncedSearch, orgId]);

  useEffect(() => { setPage(1); }, [group, difficulty, sort, debouncedSearch, orgId]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conquista..."
            className="h-8 w-full rounded-full border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-8 pr-3 text-xs text-slate-700 dark:text-white outline-none focus:border-amber-400"
          />
        </div>
        <select value={group} onChange={(e) => setGroup(e.target.value)} className={selectCls}>
          <option value="">Todos os grupos</option>
          {GROUP_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={selectCls}>
          <option value="">Todas as raridades</option>
          {DIFFICULTY_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectCls}>
          {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <p className="text-[11px] text-slate-400 dark:text-white/40">
        % de completude calculada sobre {studentsInScope} aluno{studentsInScope === 1 ? "" : "s"} no escopo selecionado
      </p>

      {loading ? (
        <div className="h-32 flex items-center justify-center">
          <div className="animate-pulse text-slate-400 text-sm">Carregando...</div>
        </div>
      ) : list.length === 0 ? (
        <p className="text-sm italic text-slate-400 dark:text-white/30">Nenhuma conquista encontrada com esses filtros</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {list.map((a) => <AchievementCard key={a.id} a={a} />)}
        </div>
      )}

      <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
    </div>
  );
}
