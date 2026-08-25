"use client";

import { useEffect, useState } from "react";
import { X, Trophy } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fetchAdminJSON } from "./api";
import type { OrgOption } from "./types";
import HistoryTab from "./HistoryTab";
import DashboardTab from "./DashboardTab";
import CatalogTab from "./CatalogTab";

interface Props {
  apiUrl: string;
  onClose: () => void;
}

const tabTriggerCls =
  "rounded-full text-xs font-bold py-1.5 text-slate-500 dark:text-slate-400 " +
  "data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm " +
  "dark:data-[state=active]:bg-slate-900";

export default function AchievementsDetailModal({ apiUrl, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<"history" | "dashboard" | "catalog">("history");
  const [orgId, setOrgId] = useState<string>("all");
  const [orgs, setOrgs] = useState<OrgOption[]>([]);

  useEffect(() => {
    fetchAdminJSON<{ organizations: OrgOption[] }>(apiUrl, "/api/admin/achievements/organizations")
      .then((res) => { if (res) setOrgs(res.organizations); });
  }, [apiUrl]);

  const effectiveOrgId = orgId === "all" ? null : orgId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'color-mix(in srgb, #F59E0B 16%, white)' }}
            >
              <Trophy className="h-[18px] w-[18px]" style={{ color: '#B45309' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Conquistas dos Alunos</p>
              <p className="text-xs text-slate-400">Histórico, dashboard e catálogo — base B2B</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Filtro de organização — compartilhado pelas 3 abas */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Organização</p>
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="h-8 rounded-full border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-slate-700 dark:text-white outline-none focus:border-amber-400"
            >
              <option value="all">Geral (todas as orgs)</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-3 h-auto bg-slate-100 dark:bg-slate-800 rounded-full p-1">
              <TabsTrigger value="history" className={tabTriggerCls}>Histórico</TabsTrigger>
              <TabsTrigger value="dashboard" className={tabTriggerCls}>Dashboard</TabsTrigger>
              <TabsTrigger value="catalog" className={tabTriggerCls}>Catálogo</TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="mt-4">
              <HistoryTab apiUrl={apiUrl} orgId={effectiveOrgId} />
            </TabsContent>
            <TabsContent value="dashboard" className="mt-4">
              <DashboardTab apiUrl={apiUrl} orgId={effectiveOrgId} />
            </TabsContent>
            <TabsContent value="catalog" className="mt-4">
              <CatalogTab apiUrl={apiUrl} orgId={effectiveOrgId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
