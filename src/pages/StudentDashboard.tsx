import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { t } from '@/lib/i18n';
import { TopBar } from '@/components/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { BookOpen, Trophy, Star, Gift, CheckCircle2 } from 'lucide-react';

export default function StudentDashboard() {
  const { user, language } = useAuth();
  const [lessons, setLessons] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [gifts, setGifts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    const [lessonsRes, progressRes, pointsRes, giftsRes] = await Promise.all([
      supabase.from('lessons').select('*').eq('is_published', true).order('created_at', { ascending: false }),
      supabase.from('user_progress').select('*').eq('user_id', user!.id),
      supabase.from('user_points').select('points').eq('user_id', user!.id),
      supabase.from('gifts').select('*').eq('user_id', user!.id),
    ]);
    setLessons(lessonsRes.data || []);
    setProgress(progressRes.data || []);
    setTotalPoints((pointsRes.data || []).reduce((sum, p) => sum + p.points, 0));
    setGifts(giftsRes.data || []);
  }

  const completedCount = progress.filter(p => p.completed).length;
  const progressPercent = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;

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
                <p className="text-3xl font-heading font-bold">{gifts.length}</p>
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
          <h2 className="text-2xl font-heading font-bold mb-6">{t('lessons.title', language)}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lessons.map((lesson, i) => {
              const isCompleted = progress.some(p => p.lesson_id === lesson.id && p.completed);
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
                          {t('lessons.lesson', language)} {i + 1}
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
                <p>No lessons available yet. Check back soon!</p>
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
