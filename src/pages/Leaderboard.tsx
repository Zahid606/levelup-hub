import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { t } from '@/lib/i18n';
import { TopBar } from '@/components/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  full_name: string;
}

export default function Leaderboard() {
  const { user, language } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    // Get all points grouped by user
    const { data: points } = await supabase.from('user_points').select('user_id, points');
    if (!points) return;

    const pointsByUser: Record<string, number> = {};
    points.forEach(p => {
      pointsByUser[p.user_id] = (pointsByUser[p.user_id] || 0) + p.points;
    });

    const userIds = Object.keys(pointsByUser);
    if (userIds.length === 0) return;

    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);

    const leaderboard = userIds.map(uid => ({
      user_id: uid,
      total_points: pointsByUser[uid],
      full_name: profiles?.find(p => p.user_id === uid)?.full_name || 'Unknown',
    })).sort((a, b) => b.total_points - a.total_points);

    setEntries(leaderboard);
  }

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="h-6 w-6 text-gold" />;
    if (rank === 1) return <Medal className="h-6 w-6 text-silver" />;
    if (rank === 2) return <Award className="h-6 w-6 text-bronze" />;
    return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank + 1}</span>;
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
                    <span className="text-muted-foreground mr-2">{getOrdinal(i + 1)}</span>
                    {entry.full_name}
                    {entry.user_id === user?.id && <span className="text-xs text-primary ml-2">(You)</span>}
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
