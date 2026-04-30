import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { t } from '@/lib/i18n';
import { TopBar } from '@/components/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { BookOpen, Trophy, Star, Gift, CheckCircle2, Search } from 'lucide-react';

export default function StudentDashboard() {
  const { user, language } = useAuth();
  const [lessons, setLessons] = useState<any[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(() => new Set());
  const [totalPoints, setTotalPoints] = useState(0);
  const [giftCount, setGiftCount] = useState(0);
  const [gifts, setGifts] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    const [lessonsRes, progressRes, summaryRes] = await Promise.all([
      supabase.from('lessons').select('id,title,title_ur,title_bn,description,description_ur,description_bn,lesson_number,created_at').eq('is_published', true).order('lesson_number', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true }),
      supabase.from('user_progress').select('lesson_id').eq('user_id', user!.id).eq('completed', true),
      (supabase as any).rpc('get_student_dashboard_summary', { _user_id: user!.id }).maybeSingle(),
    ]);
    setLessons(lessonsRes.data || []);
    setCompletedLessonIds(new Set((progressRes.data || []).map((p: any) => p.lesson_id)));
    setTotalPoints(Number(summaryRes.data?.total_points || 0));
    const nextGiftCount = Number(summaryRes.data?.gift_count || 0);
    setGiftCount(nextGiftCount);
    if (nextGiftCount > 0) {
      supabase.from('gifts').select('id,gift_name,description').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(20)
        .then(({ data }) => setGifts(data || []));
    } else {
      setGifts([]);
    }
  }

  const completedCount = completedLessonIds.size;
  const progressPercent = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;

  const filteredLessons = useMemo(() => lessons
    .map((lesson, i) => ({ lesson, displayNum: lesson.lesson_number ?? (i + 1), idx: i }))
    .filter(({ lesson, displayNum }) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const numOnly = q.replace(/[^0-9]/g, '');
      return (
        (lesson.title || '').toLowerCase().includes(q) ||
        (lesson.title_ur || '').toLowerCase().includes(q) ||
        (lesson.title_bn || '').toLowerCase().includes(q) ||
        String(lesson.lesson_number ?? '').includes(q) ||
        String(displayNum).includes(q) ||
        (numOnly !== '' && (
          String(lesson.lesson_number ?? '') === numOnly ||
          String(displayNum) === numOnly
        ))
      );
    }), [lessons, search]);

  const getLessonTitle = (lesson: any) => {
    if (language === 'ur' && lesson.title_ur) return lesson.title_ur;
    if (language === 'bn' && lesson.title_bn) return lesson.title_bn;
    return lesson.title;
  };

  const getLessonDesc = (lesson: any) => {
    if (language === 'ur' && lesson.description_ur) return lesson.description_ur;
    if (language === 'bn' && lesson.description_bn) return lesson.description_bn;
    return lesson.description;
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="container py-8 space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up">
          <Card className="glass-card">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="gradient-primary rounded-xl p-3">
                <Star className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('points.total', language)}</p>
                <p className="text-3xl font-heading font-bold">{totalPoints}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="gradient-accent rounded-xl p-3">
                <Trophy className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.progress', language)}</p>
                <p className="text-3xl font-heading font-bold">{completedCount}/{lessons.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-secondary rounded-xl p-3 border border-border">
                <Gift className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('general.gifts', language)}</p>
                <p className="text-3xl font-heading font-bold">{giftCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overall Progress */}
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">{t('admin.progress', language)}</span>
              <span className="text-sm text-muted-foreground">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </CardContent>
        </Card>

        {/* Lessons Grid */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <h2 className="text-2xl font-heading font-bold">{t('lessons.title', language)}</h2>
            <div className="relative md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('general.search', language)} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLessons.map(({ lesson, displayNum, idx: i }) => {
              const isCompleted = completedLessonIds.has(lesson.id);
              const lessonNum = lesson.lesson_number ?? (i + 1);
              return (
                <Link key={lesson.id} to={`/lesson/${lesson.id}`}>
                  <Card className={`glass-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group cursor-pointer ${isCompleted ? 'border-primary/30' : ''}`}
                    style={{ animationDelay: `${i * 100}ms` }}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`rounded-xl p-2 ${isCompleted ? 'gradient-primary' : 'bg-secondary'}`}>
                          {isCompleted ? <CheckCircle2 className="h-5 w-5 text-primary-foreground" /> : <BookOpen className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {t('lessons.lesson', language)} {lessonNum}
                        </span>
                      </div>
                      <h3 className="font-heading font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                        {getLessonTitle(lesson)}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{getLessonDesc(lesson)}</p>
                      <div className="mt-4">
                        <Button variant={isCompleted ? "secondary" : "default"} size="sm" className={!isCompleted ? 'gradient-primary text-primary-foreground' : ''}>
                          {isCompleted ? t('lessons.completed', language) : t('lessons.start', language)}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
            {lessons.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('lessons.empty', language)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Gifts Section */}
        {gifts.length > 0 && (
          <div>
            <h2 className="text-2xl font-heading font-bold mb-4">{t('general.gifts', language)} 🎁</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gifts.map(gift => (
                <Card key={gift.id} className="glass-card border-accent/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Gift className="h-8 w-8 text-accent" />
                    <div>
                      <p className="font-semibold">{gift.gift_name}</p>
                      {gift.description && <p className="text-xs text-muted-foreground">{gift.description}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
