"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Database, Brain, Users, BarChart3 } from "lucide-react";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [dist, setDist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { Authorization: `Bearer ${session.access_token}` };

      // 1. Busca Estatísticas Gerais (Financeiro, IA, Infra)
      const resStats = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/stats?period=30d`, { headers });
      const dataStats = await resStats.json();

      // 2. Busca Distribuição de Questões
      const resDist = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/stats/distribution`, { headers });
      const dataDist = await resDist.json();

      if (resStats.ok) setStats(dataStats);
      if (resDist.ok) setDist(dataDist);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <div className="p-8">Carregando dados do SaaS...</div>;
  if (!stats) return <div className="p-8 text-red-500">Acesso Negado ou Erro na API. Verifique se sua role é 'admin'.</div>;

  return (
    <div className="p-6 space-y-8 bg-gray-50/50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">StudyTrack Master Control</h1>
        <Badge variant={stats.financial.net_profit_brl > 0 ? "default" : "destructive"} className="text-lg px-4 py-1">
          Lucro Líquido: R$ {stats.financial.net_profit_brl}
        </Badge>
      </div>

      {/* --- SEÇÃO 1: FINANCEIRO E IA --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Bruta</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.financial.gross_revenue_brl}</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo IA (Real)</CardTitle>
            <Brain className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.financial.ai_cost_brl}</div>
            <p className="text-xs text-muted-foreground">
               {stats.financial.is_free_tier ? "Tier Gratuito Ativo ✅" : "Pagando por Excesso ⚠️"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Processados</CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ai_usage.total_tokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{stats.ai_usage.total_requests} requisições totais</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Totais</CardTitle>
            <Users className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.users.breakdown.pro || 0} Pro / {stats.users.breakdown.free || 0} Free
            </p>
          </CardContent>
        </Card>
      </div>

      {/* --- SEÇÃO 2: INFRAESTRUTURA --- */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
            <CardHeader><CardTitle>Saúde do Banco de Dados</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between">
                    <span>Tamanho DB:</span>
                    <span className="font-mono">{(stats.infrastructure.db_size_bytes / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div className="flex justify-between">
                    <span>Respostas Salvas:</span>
                    <span className="font-mono">{stats.infrastructure.rows_history}</span>
                </div>
                <div className="flex justify-between">
                    <span>Tarefas Geradas:</span>
                    <span className="font-mono">{stats.infrastructure.rows_tasks}</span>
                </div>
            </CardContent>
        </Card>

        {/* --- SEÇÃO 3: QUESTÕES (DISTRIBUIÇÃO) --- */}
        {dist && (
            <Card className="md:col-span-2">
                <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3/> Banco de Questões ({dist.total})</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold mb-2 text-sm text-gray-500">Por Matéria</h4>
                            <div className="space-y-1 h-48 overflow-y-auto pr-2">
                                {dist.by_subject.map((s: any) => (
                                    <div key={s.name} className="flex justify-between text-sm border-b pb-1">
                                        <span className="truncate w-32">{s.name}</span>
                                        <Badge variant="secondary">{s.count}</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2 text-sm text-gray-500">Por Dificuldade</h4>
                            <div className="space-y-1">
                                {dist.by_difficulty.map((d: any) => (
                                    <div key={d.name} className="flex justify-between text-sm">
                                        <span>{d.name}</span>
                                        <span className="font-bold">{d.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}