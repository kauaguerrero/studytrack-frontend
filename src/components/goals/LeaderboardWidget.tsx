import { useState, useEffect } from 'react';
import { Trophy, Medal, User } from "lucide-react";
import { LeaderboardEntry, LeaderboardScope } from "@/types/gamification";

interface LeaderboardWidgetProps {
    userId: string;
}

export default function LeaderboardWidget({ userId }: LeaderboardWidgetProps) {
  const [scope, setScope] = useState<LeaderboardScope>('class');
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) fetchLeaderboard();
  }, [userId, scope]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/goals/leaderboard?user_id=${userId}&scope=${scope}`);
      if (res.ok) {
        const data = await res.json();
        setLeaders(data);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" fill="currentColor" />;
      case 2: return <Medal className="h-5 w-5 text-slate-400" fill="currentColor" />;
      case 3: return <Medal className="h-5 w-5 text-amber-700" fill="currentColor" />;
      default: return <span className="font-bold text-slate-400 w-5 text-center text-sm">#{rank}</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm h-full">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Trophy className="text-blue-600" size={18} />
            Ranking
        </h3>
        <div className="flex bg-slate-200/50 p-1 rounded-lg">
            <button 
                onClick={() => setScope('class')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${scope === 'class' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Turma
            </button>
            <button 
                onClick={() => setScope('school')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${scope === 'school' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Escola
            </button>
        </div>
      </div>
      
      <div className="p-2">
        {loading ? (
            <div className="space-y-3 p-2">
                 {[1,2,3,4].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
            </div>
        ) : leaders.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
                Nenhum dado de ranking disponível.
            </div>
        ) : (
            <div className="space-y-1">
                {leaders.map((user) => {
                    const isMe = user.id === userId;
                    return (
                        <div key={user.id} className={`flex items-center justify-between p-3 rounded-xl transition-colors ${isMe ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-6 flex justify-center">
                                    {getRankIcon(user.rank)}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                    <span className="text-xs font-bold text-slate-600">
                                        {user.full_name.substring(0,2).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-sm font-bold leading-none ${isMe ? 'text-blue-700' : 'text-slate-700'}`}>
                                        {isMe ? 'Você' : user.full_name.split(' ')[0]}
                                    </span>
                                    {isMe && <span className="text-[10px] text-blue-500 font-medium">Sua posição: {user.rank}º</span>}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block text-sm font-black text-slate-800">{user.total_points}</span>
                                <span className="text-[10px] text-slate-400 font-medium">pts</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
}