'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface ChartDataItem {
  date: string;
  questions: number;
  fullDate: string;
}

export function ActivityChart({ chartData }: { chartData: ChartDataItem[] }) {
  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" /> Ritmo de Estudos
            </CardTitle>
            <CardDescription>Volume de questões nos últimos 30 dias</CardDescription>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-indigo-500" />
              Alto Foco
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-indigo-200" />
              Normal
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pl-0">
        <div className="h-[350px] w-full pr-4">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  minTickGap={30}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9', radius: 4 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl border border-slate-700 z-50">
                          <p className="font-bold mb-1">{data.fullDate}</p>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Questões:</span>
                            <span className="font-mono text-indigo-300 font-bold">{data.questions}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="questions" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.questions >= 20 ? '#6366f1' : '#c7d2fe'}
                      className="transition-all duration-300 hover:opacity-80"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <CalendarDays className="w-10 h-10 text-slate-300" />
              <p>Sem dados de atividade no período.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
