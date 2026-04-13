import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { t } from '@/lib/i18n';
import { TopBar } from '@/components/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Medal, Award, BookOpen } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  completed_lessons: number;
  full_name: string;
}

export default function Leaderboard() {
  const { user, language } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    loadLeaderboard();
  }, []);

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
    points.forEach(p => {
      pointsByUser[p.user_id] = (pointsByUser[p.user_id] || 0) + p.points;
    });

    const lessonsByUser: Record<string, number> = {};
    progress.forEach(p => {
      lessonsByUser[p.user_id] = (lessonsByUser[p.user_id] || 0) + 1;
    });

    const allUserIds = new Set([...Object.keys(pointsByUser), ...Object.keys(lessonsByUser)]);

    const leaderboard = Array.from(allUserIds).map(uid => ({
      user_id: uid,
      total_points: pointsByUser[uid] || 0,
      completed_lessons: lessonsByUser[uid] || 0,
      full_name: profiles.find(p => p.user_id === uid)?.full_name || 'Unknown',
    })).sort((a, b) => b.total_points - a.total_points || b.completed_lessons - a.completed_lessons);

    setEntries(leaderboard);
  }

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <span className="text-2xl">🥇</span>;
    if (rank === 1) return <span className="text-2xl">🥈</span>;
    if (rank === 2) return <span className="text-2xl">🥉</span>;
    return <span className="w-8 h-8 flex items-center justify-center text-sm font-bold text-muted-foreground rounded-full bg-secondary">{rank + 1}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 0) return 'bg-gold/10 border-gold/30';
    if (rank === 1) return 'bg-silver/10 border-silver/30';
    if (rank === 2) return 'bg-bronze/10 border-bronze/30';
    return '';
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="container py-8 max-w-2xl">
        <h1 className="text-3xl font-heading font-bold mb-8 text-center">
          🏆 {t('nav.leaderboard', language)}
        </h1>

        <div className="space-y-3">
          {entries.map((entry, i) => (
            <Card key={entry.user_id} className={`glass-card ${getRankBg(i)} ${entry.user_id === user?.id ? 'ring-2 ring-primary' : ''} animate-slide-up`}
              style={{ animationDelay: `${i * 50}ms` }}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-shrink-0">{getRankIcon(i)}</div>
                <div className="flex-1">
                  <p className="font-heading font-semibold">
                    {entry.full_name}
                    {entry.user_id === user?.id && <span className="text-xs text-primary ml-2">(You)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {entry.completed_lessons} lessons completed
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-heading font-bold text-gradient">{entry.total_points}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </CardContent>
            </Card>
          ))}
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
