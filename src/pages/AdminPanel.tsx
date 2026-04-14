import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { t } from '@/lib/i18n';
import { TopBar } from '@/components/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Video, HelpCircle, Gift, UserPlus, Search, Pencil, PieChart, Eye, EyeOff, KeyRound, Download, Shield, ShieldCheck, Heart, Filter } from 'lucide-react';
import { AdminAnalytics } from '@/components/AdminAnalytics';
import { StudentActivityLog } from '@/components/StudentActivityLog';
import { LessonVideoManager } from '@/components/LessonVideoManager';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const ROLE_CONFIG = {
  admin: { label: 'Admin', icon: Shield, color: 'text-red-500', desc: 'Full access' },
  employee: { label: 'Employee', icon: ShieldCheck, color: 'text-blue-500', desc: 'Full access' },
  volunteer: { label: 'Volunteer', icon: Heart, color: 'text-pink-500', desc: 'Add/edit only' },
};

export default function AdminPanel() {
  const { user, language, isAdmin, isEmployee, isVolunteer } = useAuth();
  const canDelete = isAdmin || isEmployee; // volunteers cannot delete

  const [lessons, setLessons] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [allProgress, setAllProgress] = useState<any[]>([]);
  const [allPoints, setAllPoints] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<any[]>([]);
  const [staffRoles, setStaffRoles] = useState<any[]>([]);

  const [newLesson, setNewLesson] = useState({ title: '', title_ur: '', title_bn: '', description: '', description_ur: '', description_bn: '' });
  const [editingLesson, setEditingLesson] = useState<any | null>(null);
  const [newVideo, setNewVideo] = useState({ lesson_id: '', title: '', youtube_url: '' });
  const [newQuiz, setNewQuiz] = useState({ lesson_id: '', question: '', question_ur: '', question_bn: '', options: ['', '', '', ''], correct_answer: 0, points: 10 });
  const [newGift, setNewGift] = useState({ user_id: '', gift_name: '', description: '' });
  const [newStaff, setNewStaff] = useState({ email: '', password: '', full_name: '', role: 'employee' });
  const [newStudent, setNewStudent] = useState({ email: '', password: '', full_name: '' });
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState('');
  const [searchLessons, setSearchLessons] = useState('');
  const [searchStudents, setSearchStudents] = useState('');
  const [editingPoints, setEditingPoints] = useState<{ userId: string; points: string } | null>(null);
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [resetPasswordStudent, setResetPasswordStudent] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Student filters
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [filterAgeMin, setFilterAgeMin] = useState('');
  const [filterAgeMax, setFilterAgeMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [lessonsRes, profilesRes, progressRes, pointsRes, answersRes, rolesRes] = await Promise.all([
      supabase.from('lessons').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
      supabase.from('user_progress').select('*'),
      supabase.from('user_points').select('*'),
      supabase.from('quiz_answers').select('*'),
      supabase.from('user_roles').select('*'),
    ]);
    setLessons(lessonsRes.data || []);
    setStudents(profilesRes.data || []);
    setAllProgress(progressRes.data || []);
    setAllPoints(pointsRes.data || []);
    setQuizAnswers(answersRes.data || []);
    setStaffRoles(rolesRes.data || []);
  }

  const addLesson = async () => {
    const { error } = await supabase.from('lessons').insert({ ...newLesson, sort_order: lessons.length, is_published: true });
    if (error) { toast.error(error.message); return; }
    toast.success('Lesson added!');
    setNewLesson({ title: '', title_ur: '', title_bn: '', description: '', description_ur: '', description_bn: '' });
    setDialogOpen(''); loadAll();
  };

  const updateLesson = async () => {
    if (!editingLesson) return;
    const { error } = await supabase.from('lessons').update({
      title: editingLesson.title, title_ur: editingLesson.title_ur, title_bn: editingLesson.title_bn,
      description: editingLesson.description, description_ur: editingLesson.description_ur, description_bn: editingLesson.description_bn,
    }).eq('id', editingLesson.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Lesson updated!');
    setEditingLesson(null); loadAll();
  };

  const addVideo = async () => {
    const { error } = await supabase.from('lesson_content').insert({ lesson_id: newVideo.lesson_id, title: newVideo.title, youtube_url: newVideo.youtube_url });
    if (error) { toast.error(error.message); return; }
    toast.success('Video added!');
    setNewVideo({ lesson_id: '', title: '', youtube_url: '' }); setDialogOpen('');
  };

  const addQuizQuestion = async () => {
    const { error } = await supabase.from('quiz_questions').insert({
      lesson_id: newQuiz.lesson_id, question: newQuiz.question,
      question_ur: newQuiz.question_ur || null, question_bn: newQuiz.question_bn || null,
      options: newQuiz.options, correct_answer: newQuiz.correct_answer, points: newQuiz.points,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Quiz question added!');
    setNewQuiz({ lesson_id: '', question: '', question_ur: '', question_bn: '', options: ['', '', '', ''], correct_answer: 0, points: 10 });
    setDialogOpen('');
  };

  const giveGift = async () => {
    const { error } = await supabase.from('gifts').insert({ user_id: newGift.user_id, gift_name: newGift.gift_name, description: newGift.description, given_by: user?.id });
    if (error) { toast.error(error.message); return; }
    toast.success('Gift sent!');
    setNewGift({ user_id: '', gift_name: '', description: '' }); setDialogOpen('');
  };

  const addStaffMember = async () => {
    const { data, error } = await supabase.auth.signUp({ email: newStaff.email, password: newStaff.password, options: { data: { full_name: newStaff.full_name } } });
    if (error) { toast.error(error.message); return; }
    if (data.user) await supabase.from('user_roles').insert({ user_id: data.user.id, role: newStaff.role as any });
    toast.success(`${ROLE_CONFIG[newStaff.role as keyof typeof ROLE_CONFIG]?.label || 'Staff'} account created!`);
    setNewStaff({ email: '', password: '', full_name: '', role: 'employee' }); setDialogOpen(''); loadAll();
  };

  const addStudent = async () => {
    const { error } = await supabase.auth.signUp({ email: newStudent.email, password: newStudent.password, options: { data: { full_name: newStudent.full_name } } });
    if (error) { toast.error(error.message); return; }
    toast.success('Student account created!');
    setNewStudent({ email: '', password: '', full_name: '' }); setDialogOpen(''); loadAll();
  };

  const deleteStudent = async (userId: string) => {
    if (!canDelete) { toast.error('Volunteers cannot delete content'); return; }
    await Promise.all([
      supabase.from('quiz_answers').delete().eq('user_id', userId),
      supabase.from('user_progress').delete().eq('user_id', userId),
      supabase.from('user_points').delete().eq('user_id', userId),
      supabase.from('gifts').delete().eq('user_id', userId),
    ]);
    await supabase.from('user_roles').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('user_id', userId);
    toast.success('Student removed'); loadAll();
  };

  const updateStudent = async () => {
    if (!editingStudent) return;
    const { error } = await supabase.from('profiles').update({ full_name: editingStudent.full_name }).eq('user_id', editingStudent.user_id);
    if (error) { toast.error(error.message); return; }
    toast.success('Student updated!');
    setEditingStudent(null); loadAll();
  };

  const deleteLesson = async (id: string) => {
    if (!canDelete) { toast.error('Volunteers cannot delete content'); return; }
    await supabase.from('lessons').delete().eq('id', id);
    toast.success('Lesson deleted'); loadAll();
  };

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from('lessons').update({ is_published: !current }).eq('id', id); loadAll();
  };

  const getStudentPoints = (userId: string) => allPoints.filter(p => p.user_id === userId).reduce((sum, p) => sum + p.points, 0);
  const getStudentProgress = (userId: string) => allProgress.filter(p => p.user_id === userId && p.completed).length;
  const getUserRole = (userId: string) => {
    const role = staffRoles.find(r => r.user_id === userId);
    return role?.role || 'student';
  };

  // Filtered students
  const filteredStudents = students.filter(s => {
    const matchSearch = (s.full_name || '').toLowerCase().includes(searchStudents.toLowerCase());
    const matchCountry = filterCountry === 'all' || s.country === filterCountry;
    const matchGender = filterGender === 'all' || s.gender === filterGender;
    const matchAgeMin = !filterAgeMin || (s.age && s.age >= parseInt(filterAgeMin));
    const matchAgeMax = !filterAgeMax || (s.age && s.age <= parseInt(filterAgeMax));
    return matchSearch && matchCountry && matchGender && matchAgeMin && matchAgeMax;
  });

  const uniqueCountries = [...new Set(students.map(s => s.country).filter(Boolean))].sort();

  const updateStudentPoints = async (userId: string, newTotal: number) => {
    const currentTotal = getStudentPoints(userId);
    const diff = newTotal - currentTotal;
    if (diff === 0) { setEditingPoints(null); return; }
    const { error } = await supabase.from('user_points').insert({ user_id: userId, points: diff, reason: 'Admin adjustment' });
    if (error) { toast.error(error.message); return; }
    toast.success('Points updated!'); setEditingPoints(null); loadAll();
  };

  const handleResetPassword = async () => {
    if (!resetPasswordStudent || !newPassword) return;
    setResettingPassword(true);
    try {
      const res = await supabase.functions.invoke('admin-reset-password', {
        body: { user_id: resetPasswordStudent.user_id, new_password: newPassword },
      });
      if (res.error) throw new Error(res.error.message || 'Failed to reset password');
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`Password reset for ${resetPasswordStudent.full_name || 'student'}!`);
      setResetPasswordStudent(null); setNewPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResettingPassword(false);
    }
  };

  // Export to Excel
  const exportStudentsToExcel = () => {
    const data = filteredStudents.map(s => ({
      'Name': s.full_name || 'N/A',
      'Country': s.country || 'N/A',
      'City': s.city || 'N/A',
      'Gender': s.gender || 'N/A',
      'Age': s.age || 'N/A',
      'Phone': s.phone || 'N/A',
      'Points': getStudentPoints(s.user_id),
      'Lessons Completed': getStudentProgress(s.user_id),
      'Joined': new Date(s.created_at).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `students_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Excel exported!');
  };

  const filteredLessons = lessons.filter(l => l.title.toLowerCase().includes(searchLessons.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="container py-8 space-y-6">
        <h1 className="text-3xl font-heading font-bold">{t('admin.dashboard', language)}</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-3xl font-heading font-bold">{lessons.length}</p><p className="text-xs text-muted-foreground">Lessons</p></CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-3xl font-heading font-bold">{students.length}</p><p className="text-xs text-muted-foreground">Users</p></CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-3xl font-heading font-bold">{allProgress.filter(p => p.completed).length}</p><p className="text-xs text-muted-foreground">Completions</p></CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-3xl font-heading font-bold">{allPoints.reduce((s, p) => s + p.points, 0)}</p><p className="text-xs text-muted-foreground">Total Points</p></CardContent></Card>
        </div>

        <Tabs defaultValue="lessons">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="lessons">Lessons</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="analytics"><PieChart className="h-4 w-4 mr-1 inline" />Analytics</TabsTrigger>
            <TabsTrigger value="gifts">Gifts</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
          </TabsList>

          {/* LESSONS TAB */}
          <TabsContent value="lessons" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Dialog open={dialogOpen === 'lesson'} onOpenChange={o => setDialogOpen(o ? 'lesson' : '')}>
                <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" />{t('admin.addLesson', language)}</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>{t('admin.addLesson', language)}</DialogTitle></DialogHeader>
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                    <Input placeholder="Title (English)" value={newLesson.title} onChange={e => setNewLesson({ ...newLesson, title: e.target.value })} />
                    <Input placeholder="عنوان (Urdu)" value={newLesson.title_ur} onChange={e => setNewLesson({ ...newLesson, title_ur: e.target.value })} />
                    <Input placeholder="শিরোনাম (Bengali)" value={newLesson.title_bn} onChange={e => setNewLesson({ ...newLesson, title_bn: e.target.value })} />
                    <Textarea placeholder="Description (English)" value={newLesson.description} onChange={e => setNewLesson({ ...newLesson, description: e.target.value })} />
                    <Textarea placeholder="تفصیل (Urdu)" value={newLesson.description_ur} onChange={e => setNewLesson({ ...newLesson, description_ur: e.target.value })} />
                    <Textarea placeholder="বিবরণ (Bengali)" value={newLesson.description_bn} onChange={e => setNewLesson({ ...newLesson, description_bn: e.target.value })} />
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
                          const opts = [...newQuiz.options]; opts[i] = e.target.value;
                          setNewQuiz({ ...newQuiz, options: opts });
                        }} />
                      </div>
                    ))}
                    <Select value={String(newQuiz.correct_answer)} onValueChange={v => setNewQuiz({ ...newQuiz, correct_answer: parseInt(v) })}>
                      <SelectTrigger><SelectValue placeholder="Correct Answer" /></SelectTrigger>
                      <SelectContent>{newQuiz.options.map((_, i) => <SelectItem key={i} value={String(i)}>Option {String.fromCharCode(65 + i)}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" placeholder="Points" value={newQuiz.points} onChange={e => setNewQuiz({ ...newQuiz, points: parseInt(e.target.value) || 10 })} />
                    <Button onClick={addQuizQuestion} className="w-full gradient-primary text-primary-foreground">{t('general.save', language)}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search lessons..." value={searchLessons} onChange={e => setSearchLessons(e.target.value)} className="pl-9" />
            </div>

            <div className="space-y-3">
              {filteredLessons.map((lesson, i) => (
                <Card key={lesson.id} className="glass-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-muted-foreground">#{i + 1}</span>
                      <div>
                        <p className="font-semibold">{lesson.title}</p>
                        {lesson.title_ur && <p className="text-xs text-muted-foreground" dir="rtl">{lesson.title_ur}</p>}
                        {lesson.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{lesson.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground hidden sm:inline">{lesson.is_published ? 'Published' : 'Draft'}</span>
                      <Switch checked={lesson.is_published} onCheckedChange={() => togglePublish(lesson.id, lesson.is_published)} />
                      <Button variant="ghost" size="sm" onClick={() => setEditingLesson({ ...lesson })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {canDelete && (
                        <Button variant="ghost" size="sm" onClick={() => deleteLesson(lesson.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Dialog open={!!editingLesson} onOpenChange={o => { if (!o) setEditingLesson(null); }}>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Edit Lesson</DialogTitle></DialogHeader>
                {editingLesson && (
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                    <Input placeholder="Title (English)" value={editingLesson.title} onChange={e => setEditingLesson({ ...editingLesson, title: e.target.value })} />
                    <Input placeholder="عنوان (Urdu)" value={editingLesson.title_ur || ''} onChange={e => setEditingLesson({ ...editingLesson, title_ur: e.target.value })} />
                    <Input placeholder="শিরোনাম (Bengali)" value={editingLesson.title_bn || ''} onChange={e => setEditingLesson({ ...editingLesson, title_bn: e.target.value })} />
                    <Textarea placeholder="Description (English)" value={editingLesson.description || ''} onChange={e => setEditingLesson({ ...editingLesson, description: e.target.value })} />
                    <Textarea placeholder="تفصیل (Urdu)" value={editingLesson.description_ur || ''} onChange={e => setEditingLesson({ ...editingLesson, description_ur: e.target.value })} />
                    <Textarea placeholder="বিবরণ (Bengali)" value={editingLesson.description_bn || ''} onChange={e => setEditingLesson({ ...editingLesson, description_bn: e.target.value })} />
                    <div className="border-t border-border pt-3">
                      <LessonVideoManager lessonId={editingLesson.id} lessonTitle={editingLesson.title} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={updateLesson} className="flex-1 gradient-primary text-primary-foreground">{t('general.save', language)}</Button>
                      <Button onClick={() => setEditingLesson(null)} variant="secondary" className="flex-1">{t('general.cancel', language)}</Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* STUDENTS TAB */}
          <TabsContent value="students" className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search students..." value={searchStudents} onChange={e => setSearchStudents(e.target.value)} className="pl-9" />
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-1" /> Filters
              </Button>
              <Button variant="outline" size="sm" onClick={exportStudentsToExcel}>
                <Download className="h-4 w-4 mr-1" /> Export Excel
              </Button>
              <Dialog open={dialogOpen === 'student'} onOpenChange={o => setDialogOpen(o ? 'student' : '')}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary text-primary-foreground"><UserPlus className="h-4 w-4 mr-1" />Add Student</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Student</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Full Name" value={newStudent.full_name} onChange={e => setNewStudent({ ...newStudent, full_name: e.target.value })} />
                    <Input type="email" placeholder="Email" value={newStudent.email} onChange={e => setNewStudent({ ...newStudent, email: e.target.value })} />
                    <div className="relative">
                      <Input type={showStudentPassword ? 'text' : 'password'} placeholder="Password" value={newStudent.password} onChange={e => setNewStudent({ ...newStudent, password: e.target.value })} className="pr-10" />
                      <button type="button" onClick={() => setShowStudentPassword(!showStudentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showStudentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button onClick={addStudent} className="w-full gradient-primary text-primary-foreground">{t('general.save', language)}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <Card className="glass-card">
                <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Country</label>
                    <Select value={filterCountry} onValueChange={setFilterCountry}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Countries</SelectItem>
                        {uniqueCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Gender</label>
                    <Select value={filterGender} onValueChange={setFilterGender}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Age Min</label>
                    <Input type="number" placeholder="Min" value={filterAgeMin} onChange={e => setFilterAgeMin(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Age Max</label>
                    <Input type="number" placeholder="Max" value={filterAgeMax} onChange={e => setFilterAgeMax(e.target.value)} className="h-8 text-xs" />
                  </div>
                </CardContent>
              </Card>
            )}

            <p className="text-xs text-muted-foreground">{filteredStudents.length} student(s) found</p>

            {filteredStudents.map(student => (
              <Card key={student.id} className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{student.full_name || 'No name'}</p>
                      <p className="text-xs text-muted-foreground">
                        {student.gender && <span className="capitalize">{student.gender}</span>}
                        {student.age && <span> • Age {student.age}</span>}
                        {student.country && <span> • {student.country}</span>}
                        {student.city && <span>, {student.city}</span>}
                        {student.phone && <span> • 📱 {student.phone}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined: {new Date(student.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm flex-shrink-0">
                      <div className="text-center">
                        {editingPoints?.userId === student.user_id ? (
                          <div className="flex items-center gap-1">
                            <Input type="number" value={editingPoints.points} onChange={e => setEditingPoints({ ...editingPoints, points: e.target.value })} className="w-20 h-7 text-sm"
                              onKeyDown={e => { if (e.key === 'Enter') updateStudentPoints(student.user_id, parseInt(editingPoints.points) || 0); if (e.key === 'Escape') setEditingPoints(null); }} />
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => updateStudentPoints(student.user_id, parseInt(editingPoints.points) || 0)}>✓</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 cursor-pointer" onClick={() => setEditingPoints({ userId: student.user_id, points: String(getStudentPoints(student.user_id)) })}>
                            <p className="font-bold text-primary">{getStudentPoints(student.user_id)}</p>
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">Points</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold">{getStudentProgress(student.user_id)}/{lessons.length}</p>
                        <p className="text-xs text-muted-foreground">Lessons</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setResetPasswordStudent(student)} title="Reset Password">
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingStudent({ ...student })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {canDelete && (
                        <Button variant="ghost" size="sm" onClick={() => deleteStudent(student.user_id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Edit Student Dialog */}
            <Dialog open={!!editingStudent} onOpenChange={o => { if (!o) setEditingStudent(null); }}>
              <DialogContent>
                <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
                {editingStudent && (
                  <div className="space-y-3">
                    <Input placeholder="Full Name" value={editingStudent.full_name || ''} onChange={e => setEditingStudent({ ...editingStudent, full_name: e.target.value })} />
                    <div className="flex gap-2">
                      <Button onClick={updateStudent} className="flex-1 gradient-primary text-primary-foreground">{t('general.save', language)}</Button>
                      <Button onClick={() => setEditingStudent(null)} variant="secondary" className="flex-1">{t('general.cancel', language)}</Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog open={!!resetPasswordStudent} onOpenChange={o => { if (!o) { setResetPasswordStudent(null); setNewPassword(''); } }}>
              <DialogContent>
                <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
                {resetPasswordStudent && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Reset password for <strong>{resetPasswordStudent.full_name || 'student'}</strong>
                    </p>
                    <div className="relative">
                      <Input type={showNewPassword ? 'text' : 'password'} placeholder="New Password (min 6 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} className="pr-10" />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleResetPassword} disabled={resettingPassword || newPassword.length < 6} className="flex-1 gradient-primary text-primary-foreground">
                        <KeyRound className="h-4 w-4 mr-1" />
                        {resettingPassword ? 'Resetting...' : 'Reset Password'}
                      </Button>
                      <Button onClick={() => { setResetPasswordStudent(null); setNewPassword(''); }} variant="secondary" className="flex-1">{t('general.cancel', language)}</Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="space-y-6">
            <AdminAnalytics students={students} allProgress={allProgress} allPoints={allPoints} lessons={lessons} quizAnswers={quizAnswers} />
            <StudentActivityLog students={students} quizAnswers={quizAnswers} allProgress={allProgress} allPoints={allPoints} lessons={lessons} />
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

          {/* STAFF TAB */}
          <TabsContent value="staff" className="space-y-4">
            <div className="flex gap-2 flex-wrap items-center">
              <Dialog open={dialogOpen === 'staff'} onOpenChange={o => setDialogOpen(o ? 'staff' : '')}>
                <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground"><UserPlus className="h-4 w-4 mr-1" />Add Staff</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Full Name" value={newStaff.full_name} onChange={e => setNewStaff({ ...newStaff, full_name: e.target.value })} />
                    <Input type="email" placeholder="Email" value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} />
                    <div className="relative">
                      <Input type={showStaffPassword ? 'text' : 'password'} placeholder="Password" value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} className="pr-10" />
                      <button type="button" onClick={() => setShowStaffPassword(!showStaffPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
                        {showStaffPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Select value={newStaff.role} onValueChange={v => setNewStaff({ ...newStaff, role: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">
                          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-500" /> Employee (Full access)</span>
                        </SelectItem>
                        <SelectItem value="volunteer">
                          <span className="flex items-center gap-2"><Heart className="h-4 w-4 text-pink-500" /> Volunteer (Add/edit only)</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={addStaffMember} className="w-full gradient-primary text-primary-foreground">{t('general.save', language)}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Role Legend */}
            <div className="flex gap-4 flex-wrap">
              {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                    <span className="font-medium">{cfg.label}</span> — {cfg.desc}
                  </div>
                );
              })}
            </div>

            {/* Staff List */}
            {staffRoles.filter(r => r.role !== 'student').map(role => {
              const profile = students.find(s => s.user_id === role.user_id);
              const cfg = ROLE_CONFIG[role.role as keyof typeof ROLE_CONFIG];
              if (!cfg) return null;
              const Icon = cfg.icon;
              return (
                <Card key={role.id} className="glass-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${cfg.color}`} />
                      <div>
                        <p className="font-semibold">{profile?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{cfg.label} — {cfg.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
