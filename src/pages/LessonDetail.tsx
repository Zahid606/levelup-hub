import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { t } from '@/lib/i18n';
import { TopBar } from '@/components/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, XCircle, Play } from 'lucide-react';

export default function LessonDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, language } = useAuth();
  const [lesson, setLesson] = useState<any>(null);
  const [content, setContent] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    loadLesson();
  }, [id, user]);

  async function loadLesson() {
    const [lessonRes, contentRes, questionsRes, answersRes] = await Promise.all([
      supabase.from('lessons').select('*').eq('id', id!).single(),
      supabase.from('lesson_content').select('*').eq('lesson_id', id!).order('sort_order'),
      supabase.from('quiz_questions').select('*').eq('lesson_id', id!).order('sort_order'),
      supabase.from('quiz_answers').select('question_id').eq('user_id', user!.id),
    ]);
    setLesson(lessonRes.data);
    setContent(contentRes.data || []);
    setQuestions(questionsRes.data || []);
    setAnsweredQuestions(new Set((answersRes.data || []).map(a => a.question_id)));
  }

  const getYoutubeId = (url: string) => {
    const match = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&\n?#]+)/);
    return match?.[1] || '';
  };

  const handleAnswer = async () => {
    if (selectedAnswer === null || !user) return;
    const q = questions[currentQ];
    const correct = selectedAnswer === q.correct_answer;
    setIsCorrect(correct);
    setAnswered(true);

    await supabase.from('quiz_answers').upsert({
      user_id: user.id,
      question_id: q.id,
      selected_answer: selectedAnswer,
      is_correct: correct,
      points_earned: correct ? q.points : 0,
    });

    if (correct) {
      await supabase.from('user_points').insert({
        user_id: user.id,
        points: q.points,
        reason: `Quiz: ${q.question}`,
      });
      toast.success(`+${q.points} ${t('points.total', language)}! 🎉`);
    }

    setAnsweredQuestions(prev => new Set([...prev, q.id]));
  };

  const nextQuestion = () => {
    setCurrentQ(prev => prev + 1);
    setSelectedAnswer(null);
    setAnswered(false);
  };

  const markComplete = async () => {
    if (!user || !id) return;
    await supabase.from('user_progress').upsert({
      user_id: user.id,
      lesson_id: id,
      completed: true,
      completed_at: new Date().toISOString(),
    });
    await supabase.from('user_points').insert({
      user_id: user.id, points: 50, reason: `Completed lesson: ${lesson?.title}`,
    });
    toast.success('Lesson completed! +50 points 🎉');
  };

  const getQuestionText = (q: any) => {
    if (language === 'ur' && q.question_ur) return q.question_ur;
    if (language === 'bn' && q.question_bn) return q.question_bn;
    return q.question;
  };

  if (!lesson) return <div className="min-h-screen bg-background"><TopBar /><div className="container py-8 text-center text-muted-foreground">{t('general.loading', language)}</div></div>;

  const getLessonTitle = () => {
    if (language === 'ur' && lesson.title_ur) return lesson.title_ur;
    if (language === 'bn' && lesson.title_bn) return lesson.title_bn;
    return lesson.title;
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="container py-8 max-w-4xl space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Lessons
        </Link>

        <h1 className="text-3xl font-heading font-bold">{getLessonTitle()}</h1>

        {/* Videos */}
        {content.length > 0 && (
          <div className="space-y-4">
            {content.map(c => (
              <Card key={c.id} className="glass-card overflow-hidden">
                {c.title && <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Play className="h-4 w-4 text-primary" />{c.title}</CardTitle></CardHeader>}
                <CardContent className={c.title ? 'pt-0' : 'p-0'}>
                  {c.youtube_url && (
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <iframe
                        src={`https://www.youtube.com/embed/${getYoutubeId(c.youtube_url)}`}
                        className="w-full h-full"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quiz Section */}
        {questions.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t('quiz.title', language)} ({currentQ + 1}/{questions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentQ < questions.length ? (
                <>
                  <p className="text-lg font-medium">{getQuestionText(questions[currentQ])}</p>
                  {answeredQuestions.has(questions[currentQ].id) && !answered ? (
                    <p className="text-sm text-muted-foreground">You already answered this question.</p>
                  ) : null}
                  <div className="space-y-2">
                    {(questions[currentQ].options as string[])?.map((opt: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => !answered && setSelectedAnswer(i)}
                        disabled={answered || answeredQuestions.has(questions[currentQ].id)}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${
                          answered && i === questions[currentQ].correct_answer
                            ? 'border-primary bg-primary/10'
                            : answered && i === selectedAnswer && !isCorrect
                            ? 'border-destructive bg-destructive/10'
                            : selectedAnswer === i
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                        {opt}
                      </button>
                    ))}
                  </div>

                  {answered && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${isCorrect ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                      {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                      {isCorrect ? t('quiz.correct', language) : t('quiz.wrong', language)}
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
          </Card>
        )}

        {/* Complete Lesson Button */}
        <Button onClick={markComplete} className="w-full gradient-primary text-primary-foreground text-lg h-14">
          <CheckCircle2 className="h-5 w-5 mr-2" />
          Mark as Complete (+50 points)
        </Button>
      </main>
    </div>
  );
}
