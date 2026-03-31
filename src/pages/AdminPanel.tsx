import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { t } from '@/lib/i18n';
import { TopBar } from '@/components/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Video, HelpCircle, Users, Gift, BarChart3, UserPlus, Search, Pencil } from 'lucide-react';

export default function AdminPanel() {
  const { user, language } = useAuth();
  const [lessons, setLessons] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [allProgress, setAllProgress] = useState<any[]>([]);
  const [allPoints, setAllPoints] = useState<any[]>([]);

  // Forms
  const [newLesson, setNewLesson] = useState({ title: '', title_ur: '', title_bn: '', description: '', description_ur: '', description_bn: '' });
  const [newVideo, setNewVideo] = useState({ lesson_id: '', title: '', youtube_url: '' });
  const [newQuiz, setNewQuiz] = useState({ lesson_id: '', question: '', question_ur: '', question_bn: '', options: ['', '', '', ''], correct_answer: 0, points: 10 });
  const [newGift, setNewGift] = useState({ user_id: '', gift_name: '', description: '' });
  const [newEmployee, setNewEmployee] = useState({ email: '', password: '', full_name: '' });
  const [dialogOpen, setDialogOpen] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [lessonsRes, profilesRes, progressRes, pointsRes] = await Promise.all([
      supabase.from('lessons').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
      supabase.from('user_progress').select('*'),
      supabase.from('user_points').select('*'),
    ]);
    setLessons(lessonsRes.data || []);
    setStudents(profilesRes.data || []);
    setAllProgress(progressRes.data || []);
    setAllPoints(pointsRes.data || []);
  }

  const addLesson = async () => {
    const { error } = await supabase.from('lessons').insert({
      ...newLesson, sort_order: lessons.length, is_published: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Lesson added!');
    setNewLesson({ title: '', title_ur: '', title_bn: '', description: '', description_ur: '', description_bn: '' });
    setDialogOpen('');
    loadAll();
  };

  const addVideo = async () => {
    const { error } = await supabase.from('lesson_content').insert({
      lesson_id: newVideo.lesson_id, title: newVideo.title, youtube_url: newVideo.youtube_url,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Video added!');
    setNewVideo({ lesson_id: '', title: '', youtube_url: '' });
    setDialogOpen('');
  };

  const addQuizQuestion = async () => {
    const { error } = await supabase.from('quiz_questions').insert({
      lesson_id: newQuiz.lesson_id,
      question: newQuiz.question,
      question_ur: newQuiz.question_ur || null,
      question_bn: newQuiz.question_bn || null,
      options: newQuiz.options,
      correct_answer: newQuiz.correct_answer,
      points: newQuiz.points,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Quiz question added!');
    setNewQuiz({ lesson_id: '', question: '', question_ur: '', question_bn: '', options: ['', '', '', ''], correct_answer: 0, points: 10 });
    setDialogOpen('');
  };

  const giveGift = async () => {
    const { error } = await supabase.from('gifts').insert({
      user_id: newGift.user_id, gift_name: newGift.gift_name, description: newGift.description, given_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Gift sent!');
    setNewGift({ user_id: '', gift_name: '', description: '' });
    setDialogOpen('');
  };

  const addEmployee = async () => {
    const { data, error } = await supabase.auth.signUp({
      email: newEmployee.email,
      password: newEmployee.password,
      options: { data: { full_name: newEmployee.full_name } },
    });
    if (error) { toast.error(error.message); return; }
    if (data.user) {
      await supabase.from('user_roles').insert({ user_id: data.user.id, role: 'employee' as any });
    }
    toast.success('Employee account created!');
    setNewEmployee({ email: '', password: '', full_name: '' });
    setDialogOpen('');
    loadAll();
  };

  const deleteLesson = async (id: string) => {
    await supabase.from('lessons').delete().eq('id', id);
    toast.success('Lesson deleted');
    loadAll();
  };

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from('lessons').update({ is_published: !current }).eq('id', id);
    loadAll();
  };

  const getStudentPoints = (userId: string) => allPoints.filter(p => p.user_id === userId).reduce((sum, p) => sum + p.points, 0);
  const getStudentProgress = (userId: string) => allProgress.filter(p => p.user_id === userId && p.completed).length;

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="container py-8 space-y-6">
        <h1 className="text-3xl font-heading font-bold">{t('admin.dashboard', language)}</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-3xl font-heading font-bold">{lessons.length}</p><p className="text-xs text-muted-foreground">Lessons</p></CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-3xl font-heading font-bold">{students.length}</p><p className="text-xs text-muted-foreground">Users</p></CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-3xl font-heading font-bold">{allProgress.filter(p => p.completed).length}</p><p className="text-xs text-muted-foreground">Completions</p></CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-3xl font-heading font-bold">{allPoints.reduce((s, p) => s + p.points, 0)}</p><p className="text-xs text-muted-foreground">Total Points</p></CardContent></Card>
        </div>

        <Tabs defaultValue="lessons">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="lessons">Lessons</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="gifts">Gifts</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
          </TabsList>

          {/* LESSONS TAB */}
          <TabsContent value="lessons" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Dialog open={dialogOpen === 'lesson'} onOpenChange={o => setDialogOpen(o ? 'lesson' : '')}>
                <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" />{t('admin.addLesson', language)}</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t('admin.addLesson', language)}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Title (English)" value={newLesson.title} onChange={e => setNewLesson({ ...newLesson, title: e.target.value })} />
                    <Input placeholder="عنوان (Urdu)" value={newLesson.title_ur} onChange={e => setNewLesson({ ...newLesson, title_ur: e.target.value })} />
                    <Input placeholder="শিরোনাম (Bengali)" value={newLesson.title_bn} onChange={e => setNewLesson({ ...newLesson, title_bn: e.target.value })} />
                    <Textarea placeholder="Description" value={newLesson.description} onChange={e => setNewLesson({ ...newLesson, description: e.target.value })} />
                    <Button onClick={addLesson} className="w-full gradient-primary text-primary-foreground">{t('general.save', language)}</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={dialogOpen === 'video'} onOpenChange={o => setDialogOpen(o ? 'video' : '')}>
                <DialogTrigger asChild><Button variant="secondary"><Video className="h-4 w-4 mr-1" />{t('admin.addVideo', language)}</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t('admin.addVideo', language)}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Select value={newVideo.lesson_id} onValueChange={v => setNewVideo({ ...newVideo, lesson_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Lesson" /></SelectTrigger>
                      <SelectContent>{lessons.map(l => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input placeholder="Video Title" value={newVideo.title} onChange={e => setNewVideo({ ...newVideo, title: e.target.value })} />
                    <Input placeholder="YouTube URL" value={newVideo.youtube_url} onChange={e => setNewVideo({ ...newVideo, youtube_url: e.target.value })} />
                    <Button onClick={addVideo} className="w-full gradient-primary text-primary-foreground">{t('general.save', language)}</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={dialogOpen === 'quiz'} onOpenChange={o => setDialogOpen(o ? 'quiz' : '')}>
                <DialogTrigger asChild><Button variant="secondary"><HelpCircle className="h-4 w-4 mr-1" />{t('admin.addQuiz', language)}</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>{t('admin.addQuiz', language)}</DialogTitle></DialogHeader>
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                    <Select value={newQuiz.lesson_id} onValueChange={v => setNewQuiz({ ...newQuiz, lesson_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Lesson" /></SelectTrigger>
                      <SelectContent>{lessons.map(l => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input placeholder="Question (English)" value={newQuiz.question} onChange={e => setNewQuiz({ ...newQuiz, question: e.target.value })} />
                    <Input placeholder="سوال (Urdu)" value={newQuiz.question_ur} onChange={e => setNewQuiz({ ...newQuiz, question_ur: e.target.value })} />
                    <Input placeholder="প্রশ্ন (Bengali)" value={newQuiz.question_bn} onChange={e => setNewQuiz({ ...newQuiz, question_bn: e.target.value })} />
                    {newQuiz.options.map((opt, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <span className="text-sm font-medium w-6">{String.fromCharCode(65 + i)}</span>
                        <Input placeholder={`Option ${i + 1}`} value={opt} onChange={e => {
                          const opts = [...newQuiz.options];
                          opts[i] = e.target.value;
                          setNewQuiz({ ...newQuiz, options: opts });
                        }} />
                      </div>
                    ))}
                    <Select value={String(newQuiz.correct_answer)} onValueChange={v => setNewQuiz({ ...newQuiz, correct_answer: parseInt(v) })}>
                      <SelectTrigger><SelectValue placeholder="Correct Answer" /></SelectTrigger>
                      <SelectContent>
                        {newQuiz.options.map((_, i) => <SelectItem key={i} value={String(i)}>Option {String.fromCharCode(65 + i)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="Points" value={newQuiz.points} onChange={e => setNewQuiz({ ...newQuiz, points: parseInt(e.target.value) || 10 })} />
                    <Button onClick={addQuizQuestion} className="w-full gradient-primary text-primary-foreground">{t('general.save', language)}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {lessons.map((lesson, i) => (
                <Card key={lesson.id} className="glass-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-muted-foreground">#{i + 1}</span>
                      <div>
                        <p className="font-semibold">{lesson.title}</p>
                        {lesson.description && <p className="text-xs text-muted-foreground">{lesson.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{lesson.is_published ? 'Published' : 'Draft'}</span>
                        <Switch checked={lesson.is_published} onCheckedChange={() => togglePublish(lesson.id, lesson.is_published)} />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteLesson(lesson.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* STUDENTS TAB */}
          <TabsContent value="students" className="space-y-3">
            {students.map(student => (
              <Card key={student.id} className="glass-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{student.full_name || 'No name'}</p>
                    <p className="text-xs text-muted-foreground">Joined: {new Date(student.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-primary">{getStudentPoints(student.user_id)}</p>
                      <p className="text-xs text-muted-foreground">Points</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold">{getStudentProgress(student.user_id)}/{lessons.length}</p>
                      <p className="text-xs text-muted-foreground">Lessons</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* GIFTS TAB */}
          <TabsContent value="gifts" className="space-y-4">
            <Dialog open={dialogOpen === 'gift'} onOpenChange={o => setDialogOpen(o ? 'gift' : '')}>
              <DialogTrigger asChild><Button className="gradient-accent text-accent-foreground"><Gift className="h-4 w-4 mr-1" />{t('admin.giveGift', language)}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t('admin.giveGift', language)}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Select value={newGift.user_id} onValueChange={v => setNewGift({ ...newGift, user_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Student" /></SelectTrigger>
                    <SelectContent>{students.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Gift Name" value={newGift.gift_name} onChange={e => setNewGift({ ...newGift, gift_name: e.target.value })} />
                  <Input placeholder="Description" value={newGift.description} onChange={e => setNewGift({ ...newGift, description: e.target.value })} />
                  <Button onClick={giveGift} className="w-full gradient-accent text-accent-foreground">{t('general.save', language)}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* EMPLOYEES TAB */}
          <TabsContent value="employees" className="space-y-4">
            <Dialog open={dialogOpen === 'employee'} onOpenChange={o => setDialogOpen(o ? 'employee' : '')}>
              <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground"><UserPlus className="h-4 w-4 mr-1" />{t('admin.manageEmployees', language)}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Full Name" value={newEmployee.full_name} onChange={e => setNewEmployee({ ...newEmployee, full_name: e.target.value })} />
                  <Input type="email" placeholder="Email" value={newEmployee.email} onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })} />
                  <Input type="password" placeholder="Password" value={newEmployee.password} onChange={e => setNewEmployee({ ...newEmployee, password: e.target.value })} />
                  <Button onClick={addEmployee} className="w-full gradient-primary text-primary-foreground">{t('general.save', language)}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
