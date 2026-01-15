'use client';

import { useEffect, useState } from 'react';
import { Crown, User } from 'lucide-react';

interface RankingItem {
    rank: number;
    name: string;
    completed: boolean;
    progress: number;
}

export function GoalRanking({ groupId, condensed = false }: { groupId: string, condensed?: boolean }) {
    const [ranking, setRanking] = useState<RankingItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRanking = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/goals/ranking/${groupId}`);
                if (res.ok) {
                    const data = await res.json();
                    setRanking(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchRanking();
    }, [groupId]);

    if (loading) return <div className="text-xs text-slate-400 animate-pulse">Carregando ranking...</div>;
    if (ranking.length === 0) return null;

    return (
        <div className="w-full">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Crown size={12} className="text-yellow-500" /> Top 5 da Turma
            </h4>
            <div className="flex flex-wrap gap-2">
                {ranking.map((user) => (
                    <div 
                        key={user.rank} 
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium
                            ${user.rank === 1 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-white border-slate-200 text-slate-600'}
                        `}
                    >
                        <span className="font-bold opacity-60">#{user.rank}</span>
                        <span className="truncate max-w-[80px]">{user.name.split(' ')[0]}</span>
                        {user.completed && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>}
                    </div>
                ))}
            </div>
        </div>
    );
}