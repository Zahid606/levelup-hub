import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from '@/lib/router-compat';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { t } from '@/lib/i18n';
import { TopBar } from '@/components/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Play, Lock, Star, List } from 'lucide-react';
import { StudentSupportPanel } from '@/components/StudentSupportPanel';


declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

function useYouTubeAPI() {
  const [ready, setReady] = useState(!!window.YT?.Player);
  useEffect(() => {
    if (window.YT?.Player) { setReady(true); return; }
    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    window.onYouTubeIframeAPIReady = () => setReady(true);
  }, []);
  return ready;
}

const lessonListCache = new Map<string, any[]>();

function VideoPlayer({ videoId, contentId, videoPoints, onComplete, isCompleted }: {
  videoId: string; contentId: string; videoPoints: number;
  onComplete: (contentId: string, points: number) => void; isCompleted: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const maxReachedRef = useRef(0);
  const lastWarnRef = useRef(0);
  const completedRef = useRef(isCompleted);
  const [watchPercent, setWatchPercent] = useState(isCompleted ? 100 : 0);
  const ytReady = useYouTubeAPI();

  useEffect(() => { completedRef.current = isCompleted; }, [isCompleted]);

  useEffect(() => {
    if (!ytReady || !containerRef.current || isCompleted) return;
    const divId = `yt-${contentId}`;
    if (!document.getElementById(divId)) {
      const el = document.createElement('div');
      el.id = divId;
      containerRef.current.appendChild(el);
    }

    const finish = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      clearInterval(intervalRef.current);
      setWatchPercent(100);
      onComplete(contentId, videoPoints);
    };

    playerRef.current = new window.YT.Player(divId, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        rel: 0,
        modestbranding: 1,
        disablekb: 1,           // Disable keyboard controls (no arrow key skip)
        iv_load_policy: 3,      // Disable annotations
        playsinline: 1,         // Keep inline playback on iOS so tracking keeps working
        fs: 1,
      },

      events: {
        onStateChange: (e: any) => {
          if (e.data === window.YT.PlayerState.ENDED) {
            // Reaching the end always counts as 100%
            maxReachedRef.current = Math.max(maxReachedRef.current, playerRef.current?.getDuration?.() || 0);
            finish();
            return;
          }
          // A drag on the progress bar shows up as a BUFFERING/PAUSED event —
          // correct the position immediately so the jump is barely visible.
          if (!completedRef.current && e.target?.getCurrentTime) {
            const ct = e.target.getCurrentTime();
            if (ct > maxReachedRef.current + 1) {
              e.target.seekTo(maxReachedRef.current, true);
              const now = Date.now();
              if (now - lastWarnRef.current > 2500) {
                lastWarnRef.current = now;
                toast.error('Skipping is not allowed! Watch the full video.');
              }
            }
          }
          if (e.data === window.YT.PlayerState.PLAYING) {
            clearInterval(intervalRef.current);
            // Poll often so a forward seek is corrected almost instantly.
            intervalRef.current = setInterval(() => {
              const p = playerRef.current;
              if (!p?.getCurrentTime || !p?.getDuration) return;
              const currentTime = p.getCurrentTime();
              const duration = p.getDuration();
              if (!duration) return;

              // Anti-cheat: if user skipped forward beyond what they've watched, seek back at once
              if (currentTime > maxReachedRef.current + 1) {
                p.seekTo(maxReachedRef.current, true);
                const now = Date.now();
                if (now - lastWarnRef.current > 2500) {
                  lastWarnRef.current = now;
                  toast.error('Skipping is not allowed! Watch the full video.');
                }
                return;
              }
              maxReachedRef.current = Math.max(maxReachedRef.current, currentTime);

              const remaining = duration - maxReachedRef.current;
              const pct = Math.min(100, Math.floor((maxReachedRef.current / duration) * 100));
              // The last poll can land just short of the end — treat the final
              // 2 seconds (or 99%+) as fully watched so it never sticks at 99%.
              if (remaining <= 2 || pct >= 99) { finish(); return; }
              setWatchPercent(pct);
            }, 250);
          } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        },
        onReady: (e: any) => {
          // Lock playback speed to 1x
          e.target.setPlaybackRate(1);
        },
      },
    });
    return () => { clearInterval(intervalRef.current); playerRef.current?.destroy?.(); };
  }, [ytReady, videoId, contentId, isCompleted]);


  // Anti-cheat: disable right-click on video area
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  if (isCompleted) {
    return (
      <div className="aspect-video rounded-lg overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="w-full h-full" allowFullScreen
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2" onContextMenu={handleContextMenu}>
      <div ref={containerRef} className="aspect-video rounded-lg overflow-hidden" />
      <div className="flex items-center gap-2">
        <Progress value={watchPercent} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground">{watchPercent}%</span>
        {watchPercent >= 100 && <CheckCircle2 className="h-4 w-4 text-primary" />}
      </div>
    </div>
  );
}

export default function LessonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, language } = useAuth();
  const [lesson, setLesson] = useState<any>(null);
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [isCorrect, setIsCorrect] = useState(false);
  const [completedVideos, setCompletedVideos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id || !user) return;
    loadLesson();
    window.scrollTo({ top: 0 });
  }, [id, user]);

  async function loadLesson() {
    const cachedLessonList = lessonListCache.get('published');
    if (cachedLessonList) setAllLessons(cachedLessonList);
    const [lessonRes, allLessonsRes, contentRes, questionsRes] = await Promise.all([
      supabase.from('lessons').select('id,title,title_ur,title_bn,description,description_ur,description_bn,lesson_number,created_at').eq('id', id!).single(),
      cachedLessonList ? Promise.resolve({ data: cachedLessonList }) : supabase.from('lessons').select('id, title, title_ur, title_bn, lesson_number, created_at').eq('is_published', true).order('lesson_number', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true }),
      supabase.from('lesson_content').select('id,title,youtube_url,video_points,sort_order').eq('lesson_id', id!).order('sort_order'),
      supabase.from('quiz_questions').select('id,question,question_ur,question_bn,options,options_ur,options_bn,correct_answer,points,sort_order').eq('lesson_id', id!).order('sort_order'),
    ]);
    const questionIds = (questionsRes.data || []).map((q: any) => q.id);
    const contentIds = (contentRes.data || []).map((c: any) => c.id);
    const [answersRes, videoCompRes] = await Promise.all([
      questionIds.length ? supabase.from('quiz_answers').select('question_id').eq('user_id', user!.id).in('question_id', questionIds) : Promise.resolve({ data: [] }),
      contentIds.length ? supabase.from('video_completions').select('content_id').eq('user_id', user!.id).in('content_id', contentIds) : Promise.resolve({ data: [] }),
    ]);
    setLesson(lessonRes.data);
    if (!cachedLessonList) lessonListCache.set('published', allLessonsRes.data || []);
    setAllLessons(allLessonsRes.data || []);
    setContent(contentRes.data || []);
    setQuestions(questionsRes.data || []);
    setAnsweredQuestions(new Set((answersRes.data || []).map(a => a.question_id)));
    setCompletedVideos(new Set((videoCompRes.data || []).map((v: any) => v.content_id)));
  }

  const getYoutubeId = (url: string) => {
    if (!url) return '';
    const clean = url.trim();
    // Supports: watch?v=, youtu.be/, /embed/, /v/, /live/, /shorts/
    const match = clean.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|live\/|shorts\/|watch\?v=|watch\?.+&v=))([A-Za-z0-9_-]{6,})/,
    );
    if (match?.[1]) return match[1];
    // Bare video id pasted directly
    if (/^[A-Za-z0-9_-]{11}$/.test(clean)) return clean;
    return '';
  };


  const handleVideoComplete = useCallback(async (contentId: string, points: number) => {
    if (!user || completedVideos.has(contentId)) return;
    setCompletedVideos(prev => new Set([...prev, contentId]));

    const { error: saveError } = await supabase
      .from('video_completions')
      .upsert({ user_id: user.id, content_id: contentId }, { onConflict: 'user_id,content_id', ignoreDuplicates: true });

    if (saveError) {
      toast.error('Could not save your progress. Please check your connection.');
      setCompletedVideos(prev => { const next = new Set(prev); next.delete(contentId); return next; });
      return;
    }

    if (points > 0) {
      await supabase.from('user_points').insert({ user_id: user.id, points, reason: `Watched video` });
      toast.success(`+${points} ${t('points.total', language)} for watching! 🎬`);
    }

    // Check if all videos are now completed → auto-complete lesson & unlock quiz
    const updatedCompleted = new Set([...completedVideos, contentId]);
    const allDone = content.every(c => updatedCompleted.has(c.id));
    if (allDone && id) {
      await supabase.from('user_progress').upsert({
        user_id: user.id, lesson_id: id, completed: true, completed_at: new Date().toISOString()
      }, { onConflict: 'user_id,lesson_id' });
      toast.success('Lesson completed — quiz unlocked! 🎉');
    }
  }, [user, completedVideos, content, language, id]);


  const allVideosCompleted = content.length === 0 || content.every(c => completedVideos.has(c.id));

  const handleAnswer = async () => {
    if (selectedAnswer === null || !user) return;
    const q = questions[currentQ];
    const correct = selectedAnswer === q.correct_answer;
    setIsCorrect(correct);
    setAnswered(true);

    await supabase.from('quiz_answers').upsert({
      user_id: user.id, question_id: q.id, selected_answer: selectedAnswer,
      is_correct: correct, points_earned: correct ? q.points : 0,
    });

    if (correct) {
      await supabase.from('user_points').insert({ user_id: user.id, points: q.points, reason: `Quiz: ${q.question}` });
      toast.success(`+${q.points} ${t('points.total', language)}! 🎉`);
    }
    setAnsweredQuestions(prev => new Set([...prev, q.id]));
  };

  const nextQuestion = () => { setCurrentQ(p => p + 1); setSelectedAnswer(null); setAnswered(false); };

  const getQuestionText = (q: any) => {
    if (language === 'ur' && q.question_ur) return q.question_ur;
    if (language === 'bn' && q.question_bn) return q.question_bn;
    return q.question;
  };

  const getOptions = (q: any): string[] => {
    const en = (q.options as string[]) || [];
    const ur = (q.options_ur as string[]) || [];
    const bn = (q.options_bn as string[]) || [];
    if (language === 'ur') return en.map((o, i) => (ur[i] && ur[i].trim()) ? ur[i] : o);
    if (language === 'bn') return en.map((o, i) => (bn[i] && bn[i].trim()) ? bn[i] : o);
    return en;
  };

  if (!lesson) return <div className="min-h-screen bg-background"><TopBar /><div className="container py-8 text-center text-muted-foreground">{t('general.loading', language)}</div></div>;

  const getLessonTitle = () => {
    if (language === 'ur' && lesson.title_ur) return lesson.title_ur;
    if (language === 'bn' && lesson.title_bn) return lesson.title_bn;
    return lesson.title;
  };

  return (
    <div className="min-h-screen bg-background" onContextMenu={e => e.preventDefault()}>
      <TopBar />
      <main className="container py-8 max-w-4xl space-y-6">
        {(() => {
          const idx = allLessons.findIndex(l => l.id === id);
          const prev = idx > 0 ? allLessons[idx - 1] : null;
          const next = idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1] : null;
          const lessonNum = lesson.lesson_number ?? (idx >= 0 ? idx + 1 : null);
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-1">
                  <List className="h-4 w-4" /> {t('general.backToLessons', language)}
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={!prev} onClick={() => prev && navigate(`/lesson/${prev.id}`)} className="gap-1">
                    <ArrowLeft className="h-4 w-4" /> {t('general.previous', language)}
                  </Button>
                  <Button variant="outline" size="sm" disabled={!next} onClick={() => next && navigate(`/lesson/${next.id}`)} className="gap-1">
                    {t('general.next', language)} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                {lessonNum != null && (
                  <p className="text-sm font-medium text-primary mb-1">
                    {t('lessons.lesson', language)} {lessonNum}{allLessons.length > 0 && idx >= 0 ? ` / ${allLessons.length}` : ''}
                  </p>
                )}
                <h1 className="text-3xl font-heading font-bold">{getLessonTitle()}</h1>
              </div>
            </div>
          );
        })()}

        {/* Videos */}
        {content.length > 0 && (
          <div className="space-y-4">
            {content.map(c => (
              <Card key={c.id} className="glass-card overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Play className="h-4 w-4 text-primary" />
                      {c.title || 'Video'}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-normal">
                      <Star className="h-3.5 w-3.5 text-accent" />
                      {(c as any).video_points || 10} pts
                      {completedVideos.has(c.id) && <CheckCircle2 className="h-4 w-4 text-primary ml-1" />}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {(() => {
                    const vid = getYoutubeId(c.youtube_url || '');
                    if (!vid) {
                      return (
                        <p className="text-sm text-muted-foreground">
                          This video link is not valid yet. Please contact your supervisor.
                        </p>
                      );
                    }
                    return (
                      <VideoPlayer
                        videoId={vid}
                        contentId={c.id}
                        videoPoints={(c as any).video_points || 10}
                        onComplete={handleVideoComplete}
                        isCompleted={completedVideos.has(c.id)}
                      />
                    );
                  })()}
                </CardContent>

              </Card>
            ))}
          </div>
        )}

        {/* Quiz Section */}
        {questions.length > 0 && (
          <Card className={`glass-card ${!allVideosCompleted ? 'opacity-60' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {!allVideosCompleted && <Lock className="h-5 w-5 text-muted-foreground" />}
                {t('quiz.title', language)} ({currentQ + 1}/{questions.length})
              </CardTitle>
              {!allVideosCompleted && (
                <p className="text-sm text-muted-foreground">
                  Watch all videos to unlock the quiz ({completedVideos.size}/{content.length} completed)
                </p>
              )}
            </CardHeader>
            {allVideosCompleted && (
              <CardContent className="space-y-4">
                {currentQ < questions.length ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-medium">{getQuestionText(questions[currentQ])}</p>
                      <span className="text-sm font-semibold text-accent flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        {questions[currentQ].points} pts
                      </span>
                    </div>
                    {answeredQuestions.has(questions[currentQ].id) && !answered && (
                      <p className="text-sm text-muted-foreground">You already answered this question.</p>
                    )}
                    <div className="space-y-2">
                      {getOptions(questions[currentQ])?.map((opt: string, i: number) => (
                        <button key={i} onClick={() => !answered && setSelectedAnswer(i)}
                          disabled={answered || answeredQuestions.has(questions[currentQ].id)}
                          className={`w-full text-left p-4 rounded-lg border transition-all ${
                            answered && i === questions[currentQ].correct_answer ? 'border-primary bg-primary/10'
                            : answered && i === selectedAnswer && !isCorrect ? 'border-destructive bg-destructive/10'
                            : selectedAnswer === i ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                          }`}>
                          <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                        </button>
                      ))}
                    </div>
                    {answered && (
                      <div className={`flex items-center gap-2 p-3 rounded-lg ${isCorrect ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                        {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        {isCorrect ? `${t('quiz.correct', language)} +${questions[currentQ].points} pts` : t('quiz.wrong', language)}
                      </div>
                    )}
                    <div className="flex gap-2">
                      {!answered && !answeredQuestions.has(questions[currentQ].id) && (
                        <Button onClick={handleAnswer} disabled={selectedAnswer === null} className="gradient-primary text-primary-foreground">
                          {t('quiz.submit', language)}
                        </Button>
                      )}
                      {(answered || answeredQuestions.has(questions[currentQ].id)) && currentQ < questions.length - 1 && (
                        <Button onClick={nextQuestion} variant="secondary">{t('quiz.next', language)}</Button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground">Quiz completed!</p>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {id && <StudentSupportPanel lessonId={id} />}
      </main>

    </div>
  );
}
