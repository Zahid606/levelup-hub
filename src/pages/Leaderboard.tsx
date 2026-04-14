import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { t } from '@/lib/i18n';
import { TopBar } from '@/components/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, BookOpen, Star } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  completed_lessons: number;
  full_name: string;
}

export default function Leaderboard() {
  const { user, language } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => { loadLeaderboard(); }, []);

  async function loadLeaderboard() {
    const [pointsRes, profilesRes, progressRes] = await Promise.all([
      supabase.from('user_points').select('user_id, points'),
      supabase.from('profiles').select('user_id, full_name'),
      supabase.from('user_progress').select('user_id, completed').eq('completed', true),
    ]);

    const points = pointsRes.data || [];
    const profiles = profilesRes.data || [];
    const progress = progressRes.data || [];

    const pointsByUser: Record<string, number> = {};
    points.forEach(p => { pointsByUser[p.user_id] = (pointsByUser[p.user_id] || 0) + p.points; });

    const lessonsByUser: Record<string, number> = {};
    progress.forEach(p => { lessonsByUser[p.user_id] = (lessonsByUser[p.user_id] || 0) + 1; });

    const allUserIds = new Set([...Object.keys(pointsByUser), ...Object.keys(lessonsByUser)]);

    const leaderboard = Array.from(allUserIds).map(uid => ({
      user_id: uid,
      total_points: pointsByUser[uid] || 0,
      completed_lessons: lessonsByUser[uid] || 0,
      full_name: profiles.find(p => p.user_id === uid)?.full_name || 'Unknown',
    })).sort((a, b) => b.total_points - a.total_points || b.completed_lessons - a.completed_lessons);

    setEntries(leaderboard);
  }

  const getRankDisplay = (rank: number) => {
    if (rank === 0) return <span className="text-3xl">🥇</span>;
    if (rank === 1) return <span className="text-3xl">🥈</span>;
    if (rank === 2) return <span className="text-3xl">🥉</span>;
    return (
      <span className="w-9 h-9 flex items-center justify-center text-sm font-bold text-muted-foreground rounded-full bg-secondary border border-border">
        {rank + 1}
      </span>
    );
  };

  const getRankBg = (rank: number) => {
    if (rank === 0) return 'border-yellow-400/40 bg-yellow-50/10';
    if (rank === 1) return 'border-gray-400/40 bg-gray-50/10';
    if (rank === 2) return 'border-orange-400/40 bg-orange-50/10';
    return '';
  };

  const getRankLabel = (rank: number) => {
    if (rank === 0) return '1st Place';
    if (rank === 1) return '2nd Place';
    if (rank === 2) return '3rd Place';
    return `${rank + 1}th`;
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className={`container py-6 ${isMobile ? 'px-3 max-w-full' : 'max-w-2xl py-8'}`}>
        <h1 className={`font-heading font-bold mb-6 text-center ${isMobile ? 'text-2xl' : 'text-3xl mb-8'}`}>
          🏆 {t('nav.leaderboard', language)}
        </h1>

        {/* Top 3 podium for desktop */}
        {!isMobile && entries.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[1, 0, 2].map(idx => {
              const entry = entries[idx];
              const isMe = entry.user_id === user?.id;
              return (
                <Card key={entry.user_id} className={`glass-card text-center ${getRankBg(idx)} ${isMe ? 'ring-2 ring-primary' : ''} ${idx === 0 ? 'scale-105' : ''}`}>
                  <CardContent className="p-5 space-y-2">
                    <div className="text-4xl">{getRankDisplay(idx)}</div>
                    <p className="font-heading font-bold text-sm truncate">
                      {entry.full_name}
                      {isMe && <span className="text-primary text-xs ml-1">(You)</span>}
                    </p>
                    <p className="text-2xl font-heading font-bold text-gradient">{entry.total_points}</p>
                    <p className="text-xs text-muted-foreground">{getRankLabel(idx)}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <BookOpen className="h-3 w-3" /> {entry.completed_lessons} lessons
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="space-y-2">
          {entries.map((entry, i) => {
            // Skip top 3 on desktop (shown in podium)
            if (!isMobile && i < 3 && entries.length >= 3) return null;
            const isMe = entry.user_id === user?.id;
            return (
              <Card key={entry.user_id}
                className={`glass-card ${getRankBg(i)} ${isMe ? 'ring-2 ring-primary' : ''} animate-slide-up`}
                style={{ animationDelay: `${i * 30}ms` }}>
                <CardContent className={`flex items-center gap-3 ${isMobile ? 'p-3' : 'p-4 gap-4'}`}>
                  <div className="flex-shrink-0">{getRankDisplay(i)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-heading font-semibold truncate ${isMobile ? 'text-sm' : ''}`}>
                      {entry.full_name}
                      {isMe && <span className="text-xs text-primary ml-1">(You)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {entry.completed_lessons} lessons
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-heading font-bold text-gradient ${isMobile ? 'text-lg' : 'text-xl'}`}>
                      {entry.total_points}
                    </p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Mobile: show top 3 inline */}
          {entries.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No points earned yet. Start learning to climb the ranks!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
