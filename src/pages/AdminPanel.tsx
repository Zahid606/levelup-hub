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
import { Plus, Trash2, Video, HelpCircle, Gift, UserPlus, Search, Pencil, PieChart, Eye, EyeOff, KeyRound, Download, Shield, ShieldCheck, Heart, Filter, Star, Crown } from 'lucide-react';
import { AdminAnalytics } from '@/components/AdminAnalytics';
import { StudentActivityLog } from '@/components/StudentActivityLog';
import { LessonVideoManager } from '@/components/LessonVideoManager';
// xlsx + file-saver are loaded on-demand inside the export handler to keep the
// initial admin bundle small.

const ROLE_CONFIG = {
  admin: { label: 'Admin', icon: Shield, color: 'text-red-500', desc: 'Full access' },
  manager: { label: 'Manager', icon: Crown, color: 'text-amber-500', desc: 'Full access' },
  employee: { label: 'Employee', icon: ShieldCheck, color: 'text-blue-500', desc: 'Full access' },
  volunteer: { label: 'Volunteer', icon: Heart, color: 'text-pink-500', desc: 'Lessons & add students only' },
};

export default function AdminPanel() {
  const { user, language, isAdmin, isManager, isVolunteer } = useAuth();
  const hasFullAccess = isAdmin || isManager;
  const hasLimitedVolunteerAccess = isVolunteer && !hasFullAccess;
  const canAddLesson = hasFullAccess || hasLimitedVolunteerAccess;
  const canAddStudent = hasFullAccess || hasLimitedVolunteerAccess;
  const canDelete = hasFullAccess; // volunteers cannot delete

  const [lessons, setLessons] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [allProgress, setAllProgress] = useState<any[]>([]);
  const [allPoints, setAllPoints] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<any[]>([]);
  const [staffRoles, setStaffRoles] = useState<any[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [editingQuiz, setEditingQuiz] = useState<any | null>(null);
  const [gifts, setGifts] = useState<any[]>([]);
  const [giftHistory, setGiftHistory] = useState<any[]>([]);
  const [editingGift, setEditingGift] = useState<any | null>(null);
  const [totalAccounts, setTotalAccounts] = useState<number>(0);
  const [totalCompletions, setTotalCompletions] = useState<number>(0);
  const [totalPointSum, setTotalPointSum] = useState<number>(0);
  const [filterQuizLesson, setFilterQuizLesson] = useState<string>('all');
  const [studentMetricsLoaded, setStudentMetricsLoaded] = useState(false);
  const [staffLoaded, setStaffLoaded] = useState(false);
  const [giftsLoaded, setGiftsLoaded] = useState(false);

  const [newLesson, setNewLesson] = useState<{ title: string; title_ur: string; title_bn: string; description: string; description_ur: string; description_bn: string; lesson_number: string }>({ title: '', title_ur: '', title_bn: '', description: '', description_ur: '', description_bn: '', lesson_number: '' });
  const [editingLesson, setEditingLesson] = useState<any | null>(null);
  const [newVideo, setNewVideo] = useState({ lesson_id: '', title: '', youtube_url: '', video_points: 10 });
  const [newQuiz, setNewQuiz] = useState({ lesson_id: '', question: '', question_ur: '', question_bn: '', options: ['', '', '', ''], options_ur: ['', '', '', ''], options_bn: ['', '', '', ''], correct_answer: 0, points: 10 });
  const [newGift, setNewGift] = useState({ user_id: '', gift_name: '', description: '' });
  const [newStaff, setNewStaff] = useState({ email: '', password: '', full_name: '', role: 'manager' });
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
  const [filterCity, setFilterCity] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [filterAgeMin, setFilterAgeMin] = useState('');
  const [filterAgeMax, setFilterAgeMax] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterJoinedFrom, setFilterJoinedFrom] = useState('');
  const [filterJoinedTo, setFilterJoinedTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { loadAll(); }, [hasFullAccess, hasLimitedVolunteerAccess]);

  async function loadAll() {
    const studentTable = hasFullAccess ? 'profiles' : 'student_basic_profiles';
    const [lessonsRes, profilesRes, summaryRes, quizRes] = await Promise.all([
      supabase.from('lessons').select('id,title,title_ur,title_bn,description,description_ur,description_bn,lesson_number,sort_order,is_published,created_at').order('lesson_number', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true }),
      (supabase as any).from(studentTable).select('id,user_id,full_name,email,phone,gender,age,city,country,created_at'),
      (supabase as any).rpc('get_admin_dashboard_summary').maybeSingle(),
      hasFullAccess ? supabase.from('quiz_questions').select('*').order('sort_order', { ascending: true }) : Promise.resolve({ data: [] }),
    ]);
    setLessons(lessonsRes.data || []);
    setStudents(profilesRes.data || []);
    setQuizQuestions((quizRes as any).data || []);
    setTotalAccounts(Number(summaryRes.data?.total_accounts || profilesRes.data?.length || 0));
    setTotalCompletions(Number(summaryRes.data?.completions_count || 0));
    setTotalPointSum(Number(summaryRes.data?.total_points || 0));
    setStudentMetricsLoaded(false);
    setStaffLoaded(false);
    setGiftsLoaded(false);
  }

  async function loadStudentMetrics() {
    if (!hasFullAccess || studentMetricsLoaded) return;
    const [progressRes, pointsRes, answersRes] = await Promise.all([
      supabase.from('user_progress').select('user_id,lesson_id,completed').eq('completed', true),
      supabase.from('user_points').select('user_id,points'),
      supabase.from('quiz_answers').select('*'),
    ]);
    setAllProgress(progressRes.data || []);
    setAllPoints(pointsRes.data || []);
    setQuizAnswers(answersRes.data || []);
    setStudentMetricsLoaded(true);
  }

  async function loadStaffData() {
    if (!hasFullAccess || staffLoaded) return;
    const { data } = await supabase.from('user_roles').select('*');
    setStaffRoles(data || []);
    setStaffLoaded(true);
  }

  async function loadGiftsData() {
    if (!hasFullAccess || giftsLoaded) return;
    const [giftsRes, historyRes] = await Promise.all([
      supabase.from('gifts').select('*').order('created_at', { ascending: false }).limit(300),
      (supabase as any).from('gift_history').select('*').order('changed_at', { ascending: false }).limit(200),
    ]);
    setGifts((giftsRes as any).data || []);
    setGiftHistory((historyRes as any).data || []);
    setGiftsLoaded(true);
  }

  const handleTabChange = (value: string) => {
    if (value === 'students' || value === 'analytics') void loadStudentMetrics();
    if (value === 'staff') void loadStaffData();
    if (value === 'gifts') void loadGiftsData();
  };

  const addLesson = async () => {
    if (!canAddLesson) { toast.error('You do not have permission to add lessons'); return; }
    const payload: any = {
      title: newLesson.title,
      title_ur: newLesson.title_ur,
      title_bn: newLesson.title_bn,
      description: newLesson.description,
      description_ur: newLesson.description_ur,
      description_bn: newLesson.description_bn,
      lesson_number: newLesson.lesson_number ? parseInt(newLesson.lesson_number) : null,
      sort_order: lessons.length,
      is_published: true,
    };
    const { error } = await supabase.from('lessons').insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success('Lesson added!');
    setNewLesson({ title: '', title_ur: '', title_bn: '', description: '', description_ur: '', description_bn: '', lesson_number: '' });
    setDialogOpen(''); loadAll();
  };

  const updateLesson = async () => {
    if (!hasFullAccess) { toast.error('Only managers and admins can edit lessons'); return; }
    if (!editingLesson) return;
    const { error } = await supabase.from('lessons').update({
      title: editingLesson.title, title_ur: editingLesson.title_ur, title_bn: editingLesson.title_bn,
      description: editingLesson.description, description_ur: editingLesson.description_ur, description_bn: editingLesson.description_bn,
      lesson_number: editingLesson.lesson_number === '' || editingLesson.lesson_number == null ? null : parseInt(String(editingLesson.lesson_number)),
    } as any).eq('id', editingLesson.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Lesson updated!');
    setEditingLesson(null); loadAll();
  };

  const addVideo = async () => {
    if (!hasFullAccess) { toast.error('Only managers and admins can add videos'); return; }
    const { error } = await supabase.from('lesson_content').insert({ lesson_id: newVideo.lesson_id, title: newVideo.title, youtube_url: newVideo.youtube_url, video_points: newVideo.video_points } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Video added!');
    setNewVideo({ lesson_id: '', title: '', youtube_url: '', video_points: 10 }); setDialogOpen('');
  };

  const addQuizQuestion = async () => {
    if (!hasFullAccess) { toast.error('Only managers and admins can add quizzes'); return; }
    const { error } = await supabase.from('quiz_questions').insert({
      lesson_id: newQuiz.lesson_id, question: newQuiz.question,
      question_ur: newQuiz.question_ur || null, question_bn: newQuiz.question_bn || null,
      options: newQuiz.options,
      options_ur: newQuiz.options_ur,
      options_bn: newQuiz.options_bn,
      correct_answer: newQuiz.correct_answer, points: newQuiz.points,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Quiz question added!');
    setNewQuiz({ lesson_id: '', question: '', question_ur: '', question_bn: '', options: ['', '', '', ''], options_ur: ['', '', '', ''], options_bn: ['', '', '', ''], correct_answer: 0, points: 10 });
    setDialogOpen('');
  };

  const updateQuizQuestion = async () => {
    if (!hasFullAccess) { toast.error('Only managers and admins can edit quizzes'); return; }
    if (!editingQuiz) return;
    const { error } = await supabase.from('quiz_questions').update({
      question: editingQuiz.question,
      question_ur: editingQuiz.question_ur || null,
      question_bn: editingQuiz.question_bn || null,
      options: editingQuiz.options,
      options_ur: editingQuiz.options_ur,
      options_bn: editingQuiz.options_bn,
      correct_answer: editingQuiz.correct_answer,
      points: editingQuiz.points,
      lesson_id: editingQuiz.lesson_id,
    } as any).eq('id', editingQuiz.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Quiz updated!');
    setEditingQuiz(null); loadAll();
  };

  const deleteQuizQuestion = async (id: string) => {
    if (!canDelete) { toast.error('Only managers and admins can delete quizzes'); return; }
    if (!confirm('Delete this quiz question?')) return;
    const { error } = await supabase.from('quiz_questions').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Quiz deleted'); loadAll();
  };

  const giveGift = async () => {
    if (!hasFullAccess) { toast.error('Only managers and admins can give gifts'); return; }
    const { error } = await supabase.from('gifts').insert({ user_id: newGift.user_id, gift_name: newGift.gift_name, description: newGift.description, given_by: user?.id });
    if (error) { toast.error(error.message); return; }
    toast.success('Gift sent!');
    setNewGift({ user_id: '', gift_name: '', description: '' }); setDialogOpen(''); loadAll();
  };

  const updateGift = async () => {
    if (!hasFullAccess) { toast.error('Only managers and admins can edit gifts'); return; }
    if (!editingGift) return;
    const { error } = await supabase.from('gifts').update({
      gift_name: editingGift.gift_name,
      description: editingGift.description,
    }).eq('id', editingGift.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Gift updated!');
    setEditingGift(null); loadAll();
  };

  const deleteGift = async (id: string) => {
    if (!hasFullAccess) { toast.error('Only managers and admins can delete gifts'); return; }
    if (!confirm('Delete this gift? It will be recorded in history.')) return;
    const { error } = await supabase.from('gifts').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Gift removed'); loadAll();
  };

  const deleteStaff = async (userId: string) => {
    if (!hasFullAccess) { toast.error('Only managers and admins can remove staff'); return; }
    if (userId === user?.id) { toast.error('You cannot remove your own account'); return; }
    if (!confirm('Remove this worker? Their account and data will be permanently deleted.')) return;
    const { data, error } = await supabase.functions.invoke('staff-delete-user', { body: { user_id: userId } });
    if (error) { toast.error(error.message); return; }
    if ((data as any)?.error) { toast.error((data as any).error); return; }
    toast.success('Worker removed'); loadAll();
  };


  const addStaffMember = async () => {
    if (!hasFullAccess) { toast.error('Only managers and admins can add staff'); return; }
    const { data, error } = await supabase.functions.invoke('staff-create-user', {
      body: { email: newStaff.email, password: newStaff.password, full_name: newStaff.full_name, role: newStaff.role },
    });
    if (error) { toast.error(error.message); return; }
    if ((data as any)?.error) { toast.error((data as any).error); return; }
    toast.success(`${ROLE_CONFIG[newStaff.role as keyof typeof ROLE_CONFIG]?.label || 'Staff'} account created!`);
    setNewStaff({ email: '', password: '', full_name: '', role: 'manager' }); setDialogOpen(''); loadAll();
  };

  const addStudent = async () => {
    if (!canAddStudent) { toast.error('You do not have permission to add students'); return; }
    const { data, error } = await supabase.functions.invoke('staff-create-user', {
      body: { email: newStudent.email, password: newStudent.password, full_name: newStudent.full_name, role: 'student' },
    });
    if (error) { toast.error(error.message); return; }
    if ((data as any)?.error) { toast.error((data as any).error); return; }
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
    if (!hasFullAccess) { toast.error('Only managers and admins can edit student records'); return; }
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
    if (!hasFullAccess) { toast.error('Only managers and admins can publish or unpublish lessons'); return; }
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
    const q = searchStudents.toLowerCase();
    const matchSearch = !q || (s.full_name || '').toLowerCase().includes(q) || (hasFullAccess && ((s.email || '').toLowerCase().includes(q) || (s.phone || '').toLowerCase().includes(q)));
    const matchCountry = filterCountry === 'all' || s.country === filterCountry;
    const matchCity = filterCity === 'all' || s.city === filterCity;
    const matchGender = filterGender === 'all' || s.gender === filterGender;
    const matchAgeMin = !filterAgeMin || (s.age && s.age >= parseInt(filterAgeMin));
    const matchAgeMax = !filterAgeMax || (s.age && s.age <= parseInt(filterAgeMax));
    const matchEmail = !filterEmail || (hasFullAccess && (s.email || '').toLowerCase().includes(filterEmail.toLowerCase()));
    const matchPhone = !filterPhone || (hasFullAccess && (s.phone || '').toLowerCase().includes(filterPhone.toLowerCase()));
    const joined = s.created_at ? new Date(s.created_at) : null;
    const matchFrom = !filterJoinedFrom || (joined && joined >= new Date(filterJoinedFrom));
    const matchTo = !filterJoinedTo || (joined && joined <= new Date(filterJoinedTo + 'T23:59:59'));
    return matchSearch && matchCountry && matchCity && matchGender && matchAgeMin && matchAgeMax && matchEmail && matchPhone && matchFrom && matchTo;
  });

  const uniqueCountries = [...new Set(students.map(s => s.country).filter(Boolean))].sort();
  const uniqueCities = [...new Set(students.filter(s => filterCountry === 'all' || s.country === filterCountry).map(s => s.city).filter(Boolean))].sort();

  const clearFilters = () => {
    setFilterCountry('all'); setFilterCity('all'); setFilterGender('all');
    setFilterAgeMin(''); setFilterAgeMax(''); setFilterEmail(''); setFilterPhone('');
    setFilterJoinedFrom(''); setFilterJoinedTo('');
  };


  const updateStudentPoints = async (userId: string, newTotal: number) => {
    if (!hasFullAccess) { toast.error('Only managers and admins can edit points'); return; }
    const currentTotal = getStudentPoints(userId);
    const diff = newTotal - currentTotal;
    if (diff === 0) { setEditingPoints(null); return; }
    const { error } = await supabase.from('user_points').insert({ user_id: userId, points: diff, reason: 'Admin adjustment' });
    if (error) { toast.error(error.message); return; }
    toast.success('Points updated!'); setEditingPoints(null); loadAll();
  };

  const handleResetPassword = async () => {
    if (!hasFullAccess) { toast.error('Only managers and admins can reset passwords'); return; }
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
  const exportStudentsToExcel = async () => {
    if (!hasFullAccess) { toast.error('Only managers and admins can export student data'); return; }
    const data = filteredStudents.map(s => ({
      'Name': s.full_name || 'N/A',
      'Email': s.email || 'N/A',
      'Phone': s.phone || 'N/A',
      'Country': s.country || 'N/A',
      'City': s.city || 'N/A',
      'Gender': s.gender || 'N/A',
      'Age': s.age || 'N/A',
      'Points': getStudentPoints(s.user_id),
      'Lessons Completed': getStudentProgress(s.user_id),
      'Joined': s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A',
    }));
    const [XLSX, { saveAs }] = await Promise.all([
      import('xlsx'),
      import('file-saver'),
    ]);
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

        {hasFullAccess && <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-3xl font-heading font-bold">{lessons.length}</p><p className="text-xs text-muted-foreground">Lessons</p></CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-3xl font-heading font-bold">{students.length}</p><p className="text-xs text-muted-foreground">Students</p></CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-3xl font-heading font-bold">{totalAccounts}</p><p className="text-xs text-muted-foreground">Total Accounts</p></CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-3xl font-heading font-bold">{allProgress.filter(p => p.completed).length}</p><p className="text-xs text-muted-foreground">Completions</p></CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-3xl font-heading font-bold">{allPoints.reduce((s, p) => s + p.points, 0)}</p><p className="text-xs text-muted-foreground">Total Points</p></CardContent></Card>
        </div>}

        <Tabs defaultValue="lessons">
          <TabsList className={`grid w-full max-w-2xl ${hasFullAccess ? 'grid-cols-5' : 'grid-cols-2'}`}>
            <TabsTrigger value="lessons">Lessons</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            {hasFullAccess && <TabsTrigger value="analytics"><PieChart className="h-4 w-4 mr-1 inline" />Analytics</TabsTrigger>}
            {hasFullAccess && <TabsTrigger value="gifts">Gifts</TabsTrigger>}
            {hasFullAccess && <TabsTrigger value="staff">Staff</TabsTrigger>}
          </TabsList>

          {/* LESSONS TAB */}
          <TabsContent value="lessons" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Dialog open={dialogOpen === 'lesson'} onOpenChange={o => setDialogOpen(o ? 'lesson' : '')}>
                <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" />{t('admin.addLesson', language)}</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>{t('admin.addLesson', language)}</DialogTitle></DialogHeader>
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                    <Input type="number" placeholder="Lesson Number (e.g. 1, 2, 3)" value={newLesson.lesson_number} onChange={e => setNewLesson({ ...newLesson, lesson_number: e.target.value })} />
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

              {hasFullAccess && <Dialog open={dialogOpen === 'video'} onOpenChange={o => setDialogOpen(o ? 'video' : '')}>
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
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-accent" />
                      <Input type="number" min={0} max={1000} placeholder="Points awarded for watching" value={newVideo.video_points} onChange={e => setNewVideo({ ...newVideo, video_points: parseInt(e.target.value) || 0 })} />
                    </div>
                    <Button onClick={addVideo} className="w-full gradient-primary text-primary-foreground">{t('general.save', language)}</Button>
                  </div>
                </DialogContent>
              </Dialog>}

              {hasFullAccess && <Dialog open={dialogOpen === 'quiz'} onOpenChange={o => setDialogOpen(o ? 'quiz' : '')}>
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
                      <div key={i} className="rounded-md border border-border p-2 space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">Option {String.fromCharCode(65 + i)}</div>
                        <Input placeholder={`Answer ${String.fromCharCode(65 + i)} (English)`} value={opt} onChange={e => {
                          const opts = [...newQuiz.options]; opts[i] = e.target.value;
                          setNewQuiz({ ...newQuiz, options: opts });
                        }} />
                        <Input dir="rtl" placeholder={`جواب ${String.fromCharCode(65 + i)} (Urdu)`} value={newQuiz.options_ur[i] || ''} onChange={e => {
                          const opts = [...newQuiz.options_ur]; opts[i] = e.target.value;
                          setNewQuiz({ ...newQuiz, options_ur: opts });
                        }} />
                        <Input placeholder={`উত্তর ${String.fromCharCode(65 + i)} (Bengali)`} value={newQuiz.options_bn[i] || ''} onChange={e => {
                          const opts = [...newQuiz.options_bn]; opts[i] = e.target.value;
                          setNewQuiz({ ...newQuiz, options_bn: opts });
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
              </Dialog>}
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
                      <span className="text-sm font-mono text-muted-foreground">{lesson.lesson_number != null ? `#${lesson.lesson_number}` : `#${i + 1}`}</span>
                      <div>
                        <p className="font-semibold">{lesson.title}</p>
                        {lesson.title_ur && <p className="text-xs text-muted-foreground" dir="rtl">{lesson.title_ur}</p>}
                        {lesson.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{lesson.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasFullAccess && <span className="text-xs text-muted-foreground hidden sm:inline">{lesson.is_published ? 'Published' : 'Draft'}</span>}
                      {hasFullAccess && <Switch checked={lesson.is_published} onCheckedChange={() => togglePublish(lesson.id, lesson.is_published)} />}
                      {hasFullAccess && (
                        <Button variant="ghost" size="sm" onClick={() => setEditingLesson({ ...lesson })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
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
                    <Input type="number" placeholder="Lesson Number" value={editingLesson.lesson_number ?? ''} onChange={e => setEditingLesson({ ...editingLesson, lesson_number: e.target.value })} />
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

            {/* QUIZ QUESTIONS LIST */}
            {hasFullAccess && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" /> Quiz Questions
                  </h3>
                  <Select value={filterQuizLesson} onValueChange={setFilterQuizLesson}>
                    <SelectTrigger className="w-56 h-8 text-xs"><SelectValue placeholder="Filter by lesson" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Lessons</SelectItem>
                      {lessons.map(l => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  {quizQuestions
                    .filter(q => filterQuizLesson === 'all' || q.lesson_id === filterQuizLesson)
                    .map(q => {
                      const lesson = lessons.find(l => l.id === q.lesson_id);
                      const opts = Array.isArray(q.options) ? q.options : [];
                      return (
                        <Card key={q.id} className="glass-card">
                          <CardContent className="p-3 flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">{lesson?.title || 'Unknown lesson'} • {q.points} pts</p>
                              <p className="font-semibold truncate">{q.question}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                Correct: <span className="text-primary font-medium">{opts[q.correct_answer] ?? `Option ${String.fromCharCode(65 + (q.correct_answer || 0))}`}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button variant="ghost" size="sm" onClick={() => setEditingQuiz({
                                ...q,
                                options: Array.isArray(q.options) ? [...q.options, '', '', '', ''].slice(0, 4) : ['', '', '', ''],
                                options_ur: Array.isArray(q.options_ur) ? [...q.options_ur, '', '', '', ''].slice(0, 4) : ['', '', '', ''],
                                options_bn: Array.isArray(q.options_bn) ? [...q.options_bn, '', '', '', ''].slice(0, 4) : ['', '', '', ''],
                              })}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {canDelete && (
                                <Button variant="ghost" size="sm" onClick={() => deleteQuizQuestion(q.id)} className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  {quizQuestions.filter(q => filterQuizLesson === 'all' || q.lesson_id === filterQuizLesson).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No quiz questions yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* EDIT QUIZ DIALOG */}
            <Dialog open={!!editingQuiz} onOpenChange={o => { if (!o) setEditingQuiz(null); }}>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Edit Quiz Question</DialogTitle></DialogHeader>
                {editingQuiz && (
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                    <Select value={editingQuiz.lesson_id} onValueChange={v => setEditingQuiz({ ...editingQuiz, lesson_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Lesson" /></SelectTrigger>
                      <SelectContent>{lessons.map(l => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input placeholder="Question (English)" value={editingQuiz.question || ''} onChange={e => setEditingQuiz({ ...editingQuiz, question: e.target.value })} />
                    <Input placeholder="سوال (Urdu)" dir="rtl" value={editingQuiz.question_ur || ''} onChange={e => setEditingQuiz({ ...editingQuiz, question_ur: e.target.value })} />
                    <Input placeholder="প্রশ্ন (Bengali)" value={editingQuiz.question_bn || ''} onChange={e => setEditingQuiz({ ...editingQuiz, question_bn: e.target.value })} />
                    {(editingQuiz.options as string[]).map((opt: string, i: number) => (
                      <div key={i} className="rounded-md border border-border p-2 space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">Option {String.fromCharCode(65 + i)}</div>
                        <Input placeholder={`Answer ${String.fromCharCode(65 + i)} (English)`} value={opt} onChange={e => {
                          const opts = [...editingQuiz.options]; opts[i] = e.target.value;
                          setEditingQuiz({ ...editingQuiz, options: opts });
                        }} />
                        <Input dir="rtl" placeholder={`جواب ${String.fromCharCode(65 + i)} (Urdu)`} value={editingQuiz.options_ur[i] || ''} onChange={e => {
                          const opts = [...editingQuiz.options_ur]; opts[i] = e.target.value;
                          setEditingQuiz({ ...editingQuiz, options_ur: opts });
                        }} />
                        <Input placeholder={`উত্তর ${String.fromCharCode(65 + i)} (Bengali)`} value={editingQuiz.options_bn[i] || ''} onChange={e => {
                          const opts = [...editingQuiz.options_bn]; opts[i] = e.target.value;
                          setEditingQuiz({ ...editingQuiz, options_bn: opts });
                        }} />
                      </div>
                    ))}
                    <Select value={String(editingQuiz.correct_answer)} onValueChange={v => setEditingQuiz({ ...editingQuiz, correct_answer: parseInt(v) })}>
                      <SelectTrigger><SelectValue placeholder="Correct Answer" /></SelectTrigger>
                      <SelectContent>{(editingQuiz.options as string[]).map((_: string, i: number) => <SelectItem key={i} value={String(i)}>Option {String.fromCharCode(65 + i)}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" placeholder="Points" value={editingQuiz.points} onChange={e => setEditingQuiz({ ...editingQuiz, points: parseInt(e.target.value) || 10 })} />
                    <div className="flex gap-2">
                      <Button onClick={updateQuizQuestion} className="flex-1 gradient-primary text-primary-foreground">{t('general.save', language)}</Button>
                      <Button onClick={() => setEditingQuiz(null)} variant="secondary" className="flex-1">{t('general.cancel', language)}</Button>
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
              {hasFullAccess && <Button variant="outline" size="sm" onClick={exportStudentsToExcel}>
                <Download className="h-4 w-4 mr-1" /> Export Excel
              </Button>}
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
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Country</label>
                      <Select value={filterCountry} onValueChange={(v) => { setFilterCountry(v); setFilterCity('all'); }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Countries</SelectItem>
                          {uniqueCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">City</label>
                      <Select value={filterCity} onValueChange={setFilterCity}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Cities</SelectItem>
                          {uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Age Min</label>
                        <Input type="number" placeholder="Min" value={filterAgeMin} onChange={e => setFilterAgeMin(e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Age Max</label>
                        <Input type="number" placeholder="Max" value={filterAgeMax} onChange={e => setFilterAgeMax(e.target.value)} className="h-8 text-xs" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                      <Input placeholder="Search email..." value={filterEmail} onChange={e => setFilterEmail(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                      <Input placeholder="Search phone..." value={filterPhone} onChange={e => setFilterPhone(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Joined From</label>
                      <Input type="date" value={filterJoinedFrom} onChange={e => setFilterJoinedFrom(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Joined To</label>
                      <Input type="date" value={filterJoinedTo} onChange={e => setFilterJoinedTo(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={clearFilters}>Clear Filters</Button>
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
                      {student.email && <p className="text-xs text-muted-foreground truncate">✉️ {student.email}</p>}
                      <p className="text-xs text-muted-foreground">
                        Joined: {student.created_at ? new Date(student.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm flex-shrink-0">
                       <div className="text-center">
                         {hasFullAccess && editingPoints?.userId === student.user_id ? (
                           <div className="flex items-center gap-1">
                             <Input type="number" value={editingPoints.points} onChange={e => setEditingPoints({ ...editingPoints, points: e.target.value })} className="w-20 h-7 text-sm"
                               onKeyDown={e => { if (e.key === 'Enter') updateStudentPoints(student.user_id, parseInt(editingPoints.points) || 0); if (e.key === 'Escape') setEditingPoints(null); }} />
                             <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => updateStudentPoints(student.user_id, parseInt(editingPoints.points) || 0)}>✓</Button>
                           </div>
                         ) : hasFullAccess ? (
                           <div className="flex items-center gap-1 cursor-pointer" onClick={() => setEditingPoints({ userId: student.user_id, points: String(getStudentPoints(student.user_id)) })}>
                             <p className="font-bold text-primary">{getStudentPoints(student.user_id)}</p>
                             <Pencil className="h-3 w-3 text-muted-foreground" />
                           </div>
                         ) : (
                           <p className="font-bold text-primary">{getStudentPoints(student.user_id)}</p>
                         )}
                         <p className="text-xs text-muted-foreground">Points</p>
                       </div>
                      <div className="text-center">
                        <p className="font-bold">{getStudentProgress(student.user_id)}/{lessons.length}</p>
                        <p className="text-xs text-muted-foreground">Lessons</p>
                      </div>
                      {hasFullAccess && (
                        <Button variant="ghost" size="sm" onClick={() => setResetPasswordStudent(student)} title="Reset Password">
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      )}
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

            {/* Gift list */}
            <div className="space-y-2">
              <h3 className="font-heading font-semibold text-lg flex items-center gap-2"><Gift className="h-5 w-5 text-accent" /> Current Gifts ({gifts.length})</h3>
              {gifts.length === 0 && <p className="text-sm text-muted-foreground">No gifts yet.</p>}
              {gifts.map(g => {
                const recipient = students.find(s => s.user_id === g.user_id);
                return (
                  <Card key={g.id} className="glass-card">
                    <CardContent className="p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">🎁 {g.gift_name}</p>
                        <p className="text-xs text-muted-foreground truncate">For: {recipient?.full_name || 'Unknown'}</p>
                        {g.description && <p className="text-xs text-muted-foreground truncate">{g.description}</p>}
                        <p className="text-xs text-muted-foreground">{new Date(g.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => setEditingGift({ ...g })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteGift(g.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Gift history */}
            <div className="space-y-2 pt-2">
              <h3 className="font-heading font-semibold text-lg">📜 Gift History</h3>
              {giftHistory.length === 0 && <p className="text-sm text-muted-foreground">No history yet.</p>}
              {giftHistory.map(h => {
                const recipient = students.find(s => s.user_id === h.user_id);
                const actorProfile = students.find(s => s.user_id === h.changed_by);
                const color = h.action === 'created' ? 'text-green-500' : h.action === 'updated' ? 'text-amber-500' : 'text-destructive';
                return (
                  <Card key={h.id} className="glass-card">
                    <CardContent className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className={`font-semibold capitalize ${color}`}>{h.action}</span>
                          <span className="text-muted-foreground"> — {h.gift_name || 'Gift'}</span>
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          For: {recipient?.full_name || 'Unknown'}
                          {actorProfile?.full_name && <> • By: {actorProfile.full_name}</>}
                        </p>
                        {h.description && <p className="text-xs text-muted-foreground truncate">{h.description}</p>}
                      </div>
                      <p className="text-xs text-muted-foreground flex-shrink-0">{new Date(h.changed_at).toLocaleString()}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Edit gift dialog */}
            <Dialog open={!!editingGift} onOpenChange={o => { if (!o) setEditingGift(null); }}>
              <DialogContent>
                <DialogHeader><DialogTitle>Edit Gift</DialogTitle></DialogHeader>
                {editingGift && (
                  <div className="space-y-3">
                    <Input placeholder="Gift Name" value={editingGift.gift_name || ''} onChange={e => setEditingGift({ ...editingGift, gift_name: e.target.value })} />
                    <Input placeholder="Description" value={editingGift.description || ''} onChange={e => setEditingGift({ ...editingGift, description: e.target.value })} />
                    <div className="flex gap-2">
                      <Button onClick={updateGift} className="flex-1 gradient-primary text-primary-foreground">{t('general.save', language)}</Button>
                      <Button onClick={() => setEditingGift(null)} variant="secondary" className="flex-1">{t('general.cancel', language)}</Button>
                    </div>
                  </div>
                )}
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
                        <SelectItem value="manager">
                          <span className="flex items-center gap-2"><Crown className="h-4 w-4 text-amber-500" /> Manager (Full access)</span>
                        </SelectItem>
                        <SelectItem value="admin">
                          <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-red-500" /> Admin (Full access)</span>
                        </SelectItem>
                        <SelectItem value="volunteer">
                          <span className="flex items-center gap-2"><Heart className="h-4 w-4 text-pink-500" /> Volunteer (Lessons & add students)</span>
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

            {/* Account totals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="glass-card"><CardContent className="p-3 text-center">
                <p className="text-2xl font-heading font-bold">{totalAccounts}</p>
                <p className="text-xs text-muted-foreground">Total Accounts</p>
              </CardContent></Card>
              <Card className="glass-card"><CardContent className="p-3 text-center">
                <p className="text-2xl font-heading font-bold">{staffRoles.filter(r => r.role !== 'student').length}</p>
                <p className="text-xs text-muted-foreground">Staff</p>
              </CardContent></Card>
              <Card className="glass-card"><CardContent className="p-3 text-center">
                <p className="text-2xl font-heading font-bold">{staffRoles.filter(r => r.role === 'student').length}</p>
                <p className="text-xs text-muted-foreground">Students</p>
              </CardContent></Card>
              <Card className="glass-card"><CardContent className="p-3 text-center">
                <p className="text-2xl font-heading font-bold">{students.filter(s => s.email).length}</p>
                <p className="text-xs text-muted-foreground">Registered Emails</p>
              </CardContent></Card>
            </div>

            {/* Staff List */}
            <h3 className="font-heading font-semibold text-lg pt-2">Workers</h3>
            {staffRoles.filter(r => r.role !== 'student').map(role => {
              const profile = students.find(s => s.user_id === role.user_id);
              const cfg = ROLE_CONFIG[role.role as keyof typeof ROLE_CONFIG];
              if (!cfg) return null;
              const Icon = cfg.icon;
              const isSelf = role.user_id === user?.id;
              return (
                <Card key={role.id} className="glass-card">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Icon className={`h-5 w-5 ${cfg.color} flex-shrink-0`} />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{profile?.full_name || 'Unknown'} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}</p>
                        <p className="text-xs text-muted-foreground truncate">{cfg.label} — {cfg.desc}</p>
                        {profile?.email && <p className="text-xs text-muted-foreground truncate">✉️ {profile.email}</p>}
                      </div>
                    </div>
                    {!isSelf && (
                      <Button variant="ghost" size="sm" onClick={() => deleteStaff(role.user_id)} className="text-destructive hover:text-destructive flex-shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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
