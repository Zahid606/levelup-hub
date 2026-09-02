import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { AlertTriangle, MessageSquare, UserCheck, Users, Clock, Star, Trash2, Send, ClipboardList, CheckCircle2, XCircle } from 'lucide-react';
import { staffDeleteUser } from '@/lib/staffDeleteUser.functions';

type Person = { user_id: string; full_name: string | null; email?: string | null; phone?: string | null };

type VolunteerReport = {
  id: string;
  volunteer_id: string;
  student_id: string;
  report_date: string;
  present: boolean;
  rating: number;
  progress: string | null;
  behaviour: string | null;
  problem: string | null;
  has_problem: boolean;
  notes: string | null;
  created_at: string;
};

const INACTIVE_DAYS = 14;
const ALL = '__all__';

const emptyDraft = {
  present: true,
  rating: '3',
  progress: '',
  behaviour: '',
  problem: '',
  notes: '',
  report_date: new Date().toISOString().slice(0, 10),
};

export default function VolunteerWorkspace({ hasFullAccess }: { hasFullAccess: boolean }) {
  const { user, isAdmin } = useAuth();

  const [volunteers, setVolunteers] = useState<Person[]>([]);
  const [volunteerRoles, setVolunteerRoles] = useState<any[]>([]);
  const [students, setStudents] = useState<Person[]>([]);
  const [studentIds, setStudentIds] = useState<Set<string>>(new Set());

  const [assignments, setAssignments] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [vReports, setVReports] = useState<VolunteerReport[]>([]);

  const [selectedVolunteer, setSelectedVolunteer] = useState<string>('');
  const [volunteerSearch, setVolunteerSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({});

  // report form
  const [reportStudent, setReportStudent] = useState<string>('');
  const [draft, setDraft] = useState({ ...emptyDraft });
  const [saving, setSaving] = useState(false);

  // admin report filters
  const [fVolunteer, setFVolunteer] = useState(ALL);
  const [fStudent, setFStudent] = useState(ALL);
  const [fPresence, setFPresence] = useState(ALL);
  const [fRating, setFRating] = useState(ALL);
  const [fProblem, setFProblem] = useState(ALL);
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  // messaging
  const [msgTarget, setMsgTarget] = useState('');
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');

  const load = useCallback(async () => {
    if (!user) return;

    const profileTable = hasFullAccess ? 'profiles' : 'student_basic_profiles';
    const profileCols = hasFullAccess ? 'user_id, full_name, email' : 'user_id, full_name';

    const [assignRes, questionsRes, reportsRes, feedbackRes, profilesRes, progressRes, vReportsRes] = await Promise.all([
      hasFullAccess
        ? supabase.from('volunteer_assignments').select('*')
        : supabase.from('volunteer_assignments').select('*').eq('volunteer_id', user.id),
      supabase.from('student_questions').select('*').order('created_at', { ascending: false }),
      supabase.from('student_reports').select('*').order('created_at', { ascending: false }),
      supabase.from('student_feedback').select('*').order('created_at', { ascending: false }),
      supabase.from(profileTable as any).select(profileCols),
      supabase.from('user_progress').select('user_id, completed, completed_at'),
      supabase.from('volunteer_reports' as any).select('*').order('report_date', { ascending: false }).limit(500),
    ]);

    if (profilesRes.error) toast.error(`Could not load students: ${profilesRes.error.message}`);

    setAssignments(assignRes.data || []);
    setQuestions(questionsRes.data || []);
    setReports(reportsRes.data || []);
    setFeedback(feedbackRes.data || []);
    setStudents(((profilesRes.data as any[]) || []) as Person[]);
    setProgress(progressRes.data || []);
    setVReports(((vReportsRes.data as any[]) || []) as VolunteerReport[]);

    if (hasFullAccess) {
      const { data: roles } = await supabase.from('user_roles').select('*');
      const volunteerRows = (roles || []).filter((r: any) => r.role === 'volunteer');
      setVolunteerRoles(volunteerRows);
      setStudentIds(new Set((roles || []).filter((r: any) => r.role === 'student').map((r: any) => r.user_id)));
      const ids = volunteerRows.map((r: any) => r.user_id);
      const list = ((profilesRes.data as any[]) || []).filter(p => ids.includes(p.user_id));
      const missing = ids.filter((id: string) => !list.some(p => p.user_id === id)).map((id: string) => ({ user_id: id, full_name: null }));
      setVolunteers([...list, ...missing] as Person[]);
    }
  }, [user, hasFullAccess]);


  useEffect(() => { void load(); }, [load]);

  const myStudentIds = useMemo(() => {
    if (hasFullAccess) return null; // null = all
    return new Set(assignments.filter(a => a.volunteer_id === user?.id).map(a => a.student_id));
  }, [assignments, hasFullAccess, user]);

  const scope = useCallback((studentId: string) => !myStudentIds || myStudentIds.has(studentId), [myStudentIds]);

  const myStudents = useMemo(
    () => students.filter(s => scope(s.user_id)),
    [students, scope],
  );

  const lastActivity = useCallback((studentId: string) => {
    const rows = progress.filter(p => p.user_id === studentId && p.completed_at);
    if (!rows.length) return null;
    return rows.map(r => new Date(r.completed_at).getTime()).sort((a, b) => b - a)[0];
  }, [progress]);

  const inactiveStudents = useMemo(() => {
    const cutoff = Date.now() - INACTIVE_DAYS * 86400000;
    return myStudents.filter(s => {
      const last = lastActivity(s.user_id);
      return last == null || last < cutoff;
    });
  }, [myStudents, lastActivity]);

  const openQuestions = questions.filter(q => scope(q.student_id) && q.status === 'open');
  const openReports = reports.filter(r => scope(r.student_id) && r.status === 'open');
  const newFeedback = feedback.filter(f => scope(f.student_id) && !f.reviewed);

  const nameOf = (id: string) => students.find(s => s.user_id === id)?.full_name || 'Student';
  const volunteerName = (id: string) => volunteers.find(v => v.user_id === id)?.full_name || id.slice(0, 8);

  const assignableStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();

    return students
      .filter(student => studentIds.size === 0 || studentIds.has(student.user_id))
      .filter(student => {
        if (!query) return true;
        const name = student.full_name?.toLowerCase() || '';
        const email = student.email?.toLowerCase() || '';
        return name.includes(query) || email.includes(query);
      });
  }, [students, studentIds, studentSearch]);

  const filteredVolunteers = useMemo(() => {
    const query = volunteerSearch.trim().toLowerCase();
    if (!query) return volunteers;
    return volunteers.filter(v => {
      const name = v.full_name?.toLowerCase() || '';
      const email = v.email?.toLowerCase() || '';
      return name.includes(query) || email.includes(query) || v.user_id.toLowerCase().includes(query);
    });
  }, [volunteers, volunteerSearch]);

  // ---- dashboard metrics (based on today's / latest report per student) ----
  const scopedReports = useMemo(
    () => vReports.filter(r => (hasFullAccess ? true : r.volunteer_id === user?.id)),
    [vReports, hasFullAccess, user],
  );

  const latestByStudent = useMemo(() => {
    const map = new Map<string, VolunteerReport>();
    for (const r of scopedReports) {
      const cur = map.get(r.student_id);
      if (!cur || r.report_date > cur.report_date) map.set(r.student_id, r);
    }
    return map;
  }, [scopedReports]);

  const presentCount = [...latestByStudent.values()].filter(r => r.present).length;
  const absentCount = [...latestByStudent.values()].filter(r => !r.present).length;
  const problemCount = [...latestByStudent.values()].filter(r => r.has_problem).length;
  const avgRating = latestByStudent.size
    ? ([...latestByStudent.values()].reduce((a, r) => a + (r.rating || 0), 0) / latestByStudent.size).toFixed(1)
    : '—';
  const today = new Date().toISOString().slice(0, 10);
  const reportedToday = new Set(scopedReports.filter(r => r.report_date === today).map(r => r.student_id));
  const pendingReports = myStudents.filter(s => !reportedToday.has(s.user_id)).length;

  async function assignStudent(studentId: string) {
    if (!selectedVolunteer) { toast.error('Select a volunteer first'); return; }
    const count = assignments.filter(a => a.volunteer_id === selectedVolunteer).length;
    if (count >= 100) { toast.error('A volunteer can have at most 100 students'); return; }
    const { data, error } = await supabase.from('volunteer_assignments').insert({
      volunteer_id: selectedVolunteer, student_id: studentId, assigned_by: user?.id ?? null,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    // Show it right away, then refresh from the server.
    if (data) setAssignments(prev => [...prev.filter(a => a.id !== (data as any).id), data]);
    toast.success('Student assigned');
    void load();
  }


  async function unassign(id: string) {
    const { error } = await supabase.from('volunteer_assignments').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  async function reassign(assignmentId: string, newVolunteerId: string) {
    const { error } = await supabase.from('volunteer_assignments').update({ volunteer_id: newVolunteerId, assigned_by: user?.id ?? null }).eq('id', assignmentId);
    if (error) { toast.error(error.message); return; }
    toast.success('Student reassigned');
    void load();
  }

  async function toggleVolunteerActive(volunteerId: string, active: boolean) {
    const row = volunteerRoles.find(r => r.user_id === volunteerId);
    if (!row) return;
    const { error } = await supabase.from('user_roles').update({ is_active: active } as any).eq('id', row.id);
    if (error) { toast.error(error.message); return; }
    toast.success(active ? 'Volunteer activated' : 'Volunteer deactivated');
    void load();
  }

  async function deleteVolunteer(volunteerId: string, name: string) {
    if (!isAdmin) { toast.error('Only an admin can delete volunteers'); return; }
    if (!window.confirm(`Delete volunteer "${name}"? Their student assignments will be removed.`)) return;
    try {
      await staffDeleteUser({ data: { user_id: volunteerId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err)); return;
    }
    toast.success('Volunteer deleted');
    if (selectedVolunteer === volunteerId) setSelectedVolunteer('');
    void load();
  }

  async function submitReport() {
    if (!reportStudent) { toast.error('Select a student'); return; }
    setSaving(true);
    const { error } = await supabase.from('volunteer_reports' as any).insert({
      volunteer_id: user?.id,
      student_id: reportStudent,
      report_date: draft.report_date,
      present: draft.present,
      rating: Number(draft.rating),
      progress: draft.progress || null,
      behaviour: draft.behaviour || null,
      problem: draft.problem || null,
      has_problem: !!draft.problem.trim(),
      notes: draft.notes || null,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Report submitted');
    setDraft({ ...emptyDraft });
    setReportStudent('');
    void load();
  }

  async function sendMessage() {
    if (!msgTarget || !msgTitle.trim()) { toast.error('Pick a recipient and write a title'); return; }
    const { error } = await supabase.from('notifications').insert({
      user_id: msgTarget, type: 'message', title: msgTitle.trim(), message: msgBody.trim() || null, link: '/',
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Message sent');
    setMsgTitle(''); setMsgBody('');
  }

  async function answerQuestion(q: any) {
    const text = (answerDraft[q.id] || '').trim();
    if (!text) { toast.error('Write an answer first'); return; }
    const { error } = await supabase.from('student_questions').update({
      answer: text, answered_by: user?.id ?? null, answered_at: new Date().toISOString(), status: 'answered',
    }).eq('id', q.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Answer sent');
    setAnswerDraft(prev => ({ ...prev, [q.id]: '' }));
    void load();
  }

  async function resolveReport(id: string) {
    const { error } = await supabase.from('student_reports').update({ status: 'resolved', handled_by: user?.id ?? null }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  async function escalateReport(id: string) {
    const { error } = await supabase.from('student_reports').update({ escalated: true, severity: 'high' }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Escalated to admins');
    void load();
  }

  async function markFeedbackReviewed(id: string) {
    const { error } = await supabase.from('student_feedback').update({ reviewed: true }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  async function deleteVolunteerReport(id: string) {
    const { error } = await supabase.from('volunteer_reports' as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  const assignedIdsForSelected = new Set(
    assignments.filter(a => a.volunteer_id === selectedVolunteer).map(a => a.student_id),
  );

  const filteredVReports = useMemo(() => vReports.filter(r => {
    if (fVolunteer !== ALL && r.volunteer_id !== fVolunteer) return false;
    if (fStudent !== ALL && r.student_id !== fStudent) return false;
    if (fPresence !== ALL && String(r.present) !== fPresence) return false;
    if (fRating !== ALL && String(r.rating) !== fRating) return false;
    if (fProblem !== ALL && String(r.has_problem) !== fProblem) return false;
    if (fFrom && r.report_date < fFrom) return false;
    if (fTo && r.report_date > fTo) return false;
    return true;
  }), [vReports, fVolunteer, fStudent, fPresence, fRating, fProblem, fFrom, fTo]);

  const stat = (label: string, value: number | string, Icon: any) => (
    <Card className="glass-card">
      <CardContent className="p-4 text-center">
        <Icon className="h-4 w-4 mx-auto mb-1 text-primary" />
        <p className="text-2xl font-heading font-bold">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {stat('Assigned Students', myStudents.length, Users)}
        {stat('Present', presentCount, CheckCircle2)}
        {stat('Absent', absentCount, XCircle)}
        {stat('With Problems', problemCount, AlertTriangle)}
        {stat('Avg Rating', avgRating, Star)}
        {stat('Pending Reports', pendingReports, ClipboardList)}
      </div>

      <Tabs defaultValue={hasFullAccess ? 'assign' : 'students'}>
        <TabsList className="flex flex-wrap h-auto">
          {hasFullAccess && <TabsTrigger value="assign">Volunteers</TabsTrigger>}
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="submit">{hasFullAccess ? 'All Reports' : 'Submit Report'}</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="reports">Issues</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="message">Message</TabsTrigger>
        </TabsList>

        {hasFullAccess && (
          <TabsContent value="assign" className="space-y-3 pt-3">
            <Card className="glass-card">
              <CardHeader className="pb-2"><CardTitle className="text-base">Volunteers</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Input
                  placeholder="Search volunteers by name or email…"
                  value={volunteerSearch}
                  onChange={e => setVolunteerSearch(e.target.value)}
                  className="max-w-sm"
                />
                {volunteers.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No volunteers yet — an admin can add one from the Staff tab.
                  </p>
                )}
                {volunteers.length > 0 && filteredVolunteers.length === 0 && (
                  <p className="text-sm text-muted-foreground">No volunteers match your search.</p>
                )}
                {filteredVolunteers.map(v => {
                  const role = volunteerRoles.find(r => r.user_id === v.user_id);
                  const active = role?.is_active !== false;
                  const count = assignments.filter(a => a.volunteer_id === v.user_id).length;
                  return (
                    <div key={v.user_id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/60 flex-wrap">
                      <div>
                        <p className="text-sm font-medium">{v.full_name || v.user_id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">{count} student(s) assigned</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {!active && <Badge variant="destructive">Inactive</Badge>}
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Active</Label>
                          <Switch checked={active} onCheckedChange={c => toggleVolunteerActive(v.user_id, c)} />
                        </div>
                        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setSelectedVolunteer(v.user_id)}>Manage students</Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => deleteVolunteer(v.user_id, v.full_name || 'volunteer')}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2"><CardTitle className="text-base">Assign students to a volunteer</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedVolunteer} onValueChange={setSelectedVolunteer}>
                  <SelectTrigger className="max-w-sm"><SelectValue placeholder="Select volunteer" /></SelectTrigger>
                  <SelectContent>
                    {filteredVolunteers.map(v => (
                      <SelectItem key={v.user_id} value={v.user_id}>{v.full_name || v.user_id.slice(0, 8)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {!selectedVolunteer && (
                  <p className="text-sm text-muted-foreground">Select a volunteer above to see the list of registered students.</p>
                )}

                {selectedVolunteer && (
                  <>
                    <Input placeholder="Search students by name or email…" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="max-w-sm" />
                    <div className="max-h-80 overflow-y-auto divide-y divide-border/60 rounded-lg border border-border/60">
                      {assignableStudents.length === 0 && (
                        <p className="p-3 text-sm text-muted-foreground">No registered students found.</p>
                      )}
                      {assignableStudents
                        .map(s => {
                          const assigned = assignments.find(a => a.volunteer_id === selectedVolunteer && a.student_id === s.user_id);
                          const other = assignments.find(a => a.student_id === s.user_id && a.volunteer_id !== selectedVolunteer);
                          return (
                            <div key={s.user_id} className="flex items-center justify-between gap-2 p-2.5">
                              <span className="text-sm truncate">
                                {s.full_name || (s as any).email || s.user_id.slice(0, 8)}
                                {(s as any).email && s.full_name && <span className="text-xs text-muted-foreground"> · {(s as any).email}</span>}
                                {other && <span className="text-xs text-muted-foreground"> · with {volunteerName(other.volunteer_id)}</span>}
                              </span>
                              <div className="flex gap-1">
                                {other && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => reassign(other.id, selectedVolunteer)}>Reassign here</Button>
                                )}
                                {assigned ? (
                                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => unassign(assigned.id)}>
                                    <Trash2 className="h-3.5 w-3.5 mr-1" />Remove
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => assignStudent(s.user_id)}>Assign</Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    <p className="text-xs text-muted-foreground">{assignedIdsForSelected.size} student(s) assigned to this volunteer (max 100).</p>
                  </>
                )}

              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="students" className="space-y-2 pt-3">
          {myStudents.length === 0 && <p className="text-sm text-muted-foreground">No students assigned yet.</p>}
          {myStudents.map(s => {
            const last = lastActivity(s.user_id);
            const done = progress.filter(p => p.user_id === s.user_id && p.completed).length;
            const latest = latestByStudent.get(s.user_id);
            return (
              <Card key={s.user_id} className="glass-card">
                <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-medium">{s.full_name || 'Student'}</p>
                    <p className="text-xs text-muted-foreground">
                      {done} lesson(s) completed · last activity {last ? new Date(last).toLocaleDateString() : 'never'}
                      {latest && ` · last report ${latest.report_date} (${latest.present ? 'present' : 'absent'}, ${latest.rating}/5)`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(!last || Date.now() - last > INACTIVE_DAYS * 86400000) && <Badge variant="destructive">Inactive</Badge>}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => { setReportStudent(s.user_id); setDraft({ ...emptyDraft }); }}>
                          <ClipboardList className="h-3.5 w-3.5 mr-1" />Report
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader><DialogTitle>Report — {s.full_name || 'Student'}</DialogTitle></DialogHeader>
                        <ReportForm draft={draft} setDraft={setDraft} onSubmit={submitReport} saving={saving} />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="submit" className="space-y-3 pt-3">
          {!hasFullAccess && (
            <Card className="glass-card">
              <CardHeader className="pb-2"><CardTitle className="text-base">Submit a student report</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select value={reportStudent} onValueChange={setReportStudent}>
                  <SelectTrigger className="max-w-sm"><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {myStudents.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name || s.user_id.slice(0, 8)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <ReportForm draft={draft} setDraft={setDraft} onSubmit={submitReport} saving={saving} />
              </CardContent>
            </Card>
          )}

          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-base">{hasFullAccess ? 'Volunteer reports' : 'My submitted reports'}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {hasFullAccess && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Select value={fVolunteer} onValueChange={setFVolunteer}>
                    <SelectTrigger><SelectValue placeholder="Volunteer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All volunteers</SelectItem>
                      {volunteers.map(v => <SelectItem key={v.user_id} value={v.user_id}>{v.full_name || v.user_id.slice(0, 8)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={fStudent} onValueChange={setFStudent}>
                    <SelectTrigger><SelectValue placeholder="Student" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All students</SelectItem>
                      {students.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name || s.user_id.slice(0, 8)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={fPresence} onValueChange={setFPresence}>
                    <SelectTrigger><SelectValue placeholder="Attendance" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Present & absent</SelectItem>
                      <SelectItem value="true">Present</SelectItem>
                      <SelectItem value="false">Absent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={fRating} onValueChange={setFRating}>
                    <SelectTrigger><SelectValue placeholder="Rating" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Any rating</SelectItem>
                      {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} star{n > 1 ? 's' : ''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={fProblem} onValueChange={setFProblem}>
                    <SelectTrigger><SelectValue placeholder="Problem" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>With & without problems</SelectItem>
                      <SelectItem value="true">Has problem</SelectItem>
                      <SelectItem value="false">No problem</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} />
                  <Input type="date" value={fTo} onChange={e => setFTo(e.target.value)} />
                  <Button variant="outline" onClick={() => { setFVolunteer(ALL); setFStudent(ALL); setFPresence(ALL); setFRating(ALL); setFProblem(ALL); setFFrom(''); setFTo(''); }}>Clear filters</Button>
                </div>
              )}

              {(hasFullAccess ? filteredVReports : scopedReports).length === 0 && (
                <p className="text-sm text-muted-foreground">No reports yet.</p>
              )}
              {(hasFullAccess ? filteredVReports : scopedReports).map(r => (
                <div key={r.id} className="rounded-lg border border-border/60 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium">
                      {nameOf(r.student_id)}
                      {hasFullAccess && <span className="text-xs text-muted-foreground"> · by {volunteerName(r.volunteer_id)}</span>}
                    </p>
                    <div className="flex items-center gap-1">
                      <Badge variant={r.present ? 'secondary' : 'destructive'}>{r.present ? 'Present' : 'Absent'}</Badge>
                      <Badge variant="outline">{r.rating}/5</Badge>
                      {r.has_problem && <Badge variant="destructive">Problem</Badge>}
                      <span className="text-xs text-muted-foreground">{r.report_date}</span>
                    </div>
                  </div>
                  {r.progress && <p className="text-xs"><span className="text-muted-foreground">Progress: </span>{r.progress}</p>}
                  {r.behaviour && <p className="text-xs"><span className="text-muted-foreground">Behaviour: </span>{r.behaviour}</p>}
                  {r.problem && <p className="text-xs"><span className="text-muted-foreground">Problem: </span>{r.problem}</p>}
                  {r.notes && <p className="text-xs"><span className="text-muted-foreground">Notes: </span>{r.notes}</p>}
                  {hasFullAccess && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => deleteVolunteerReport(r.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-2 pt-3">
          {questions.filter(q => scope(q.student_id)).length === 0 && <p className="text-sm text-muted-foreground">No questions.</p>}
          {questions.filter(q => scope(q.student_id)).map(q => (
            <Card key={q.id} className="glass-card">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{nameOf(q.student_id)}</p>
                  <Badge variant={q.status === 'open' ? 'destructive' : 'secondary'}>{q.status}</Badge>
                </div>
                <p className="text-sm">{q.question}</p>
                {q.answer && <p className="text-xs text-muted-foreground border-l-2 border-primary pl-2">{q.answer}</p>}
                {q.status === 'open' && (
                  <div className="flex gap-2">
                    <Textarea rows={2} placeholder="Write an answer…" value={answerDraft[q.id] || ''}
                      onChange={e => setAnswerDraft(prev => ({ ...prev, [q.id]: e.target.value }))} />
                    <Button size="sm" onClick={() => answerQuestion(q)}><Send className="h-4 w-4" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="reports" className="space-y-2 pt-3">
          {reports.filter(r => scope(r.student_id)).length === 0 && <p className="text-sm text-muted-foreground">No reports.</p>}
          {reports.filter(r => scope(r.student_id)).map(r => (
            <Card key={r.id} className="glass-card">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-medium">{nameOf(r.student_id)} — {r.subject}</p>
                  <div className="flex gap-1">
                    <Badge variant={r.status === 'open' ? 'destructive' : 'secondary'}>{r.status}</Badge>
                    {r.escalated && <Badge>escalated</Badge>}
                  </div>
                </div>
                {r.details && <p className="text-sm text-muted-foreground">{r.details}</p>}
                <div className="flex gap-2">
                  {r.status === 'open' && <Button size="sm" variant="secondary" onClick={() => resolveReport(r.id)}>Resolve</Button>}
                  {!r.escalated && <Button size="sm" variant="outline" onClick={() => escalateReport(r.id)}>Escalate</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-2 pt-3">
          {inactiveStudents.length === 0 && <p className="text-sm text-muted-foreground">Everyone is active. 🎉</p>}
          {inactiveStudents.map(s => (
            <Card key={s.user_id} className="glass-card">
              <CardContent className="p-3 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-sm font-medium">{s.full_name || 'Student'}</p>
                  <p className="text-xs text-muted-foreground">No lesson completed in the last {INACTIVE_DAYS} days</p>
                </div>
                {hasFullAccess && (s as any).phone && (
                  <a href={`https://wa.me/${String((s as any).phone).replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="secondary">Contact</Button>
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="feedback" className="space-y-2 pt-3">
          {feedback.filter(f => scope(f.student_id)).length === 0 && <p className="text-sm text-muted-foreground">No feedback yet.</p>}
          {feedback.filter(f => scope(f.student_id)).map(f => (
            <Card key={f.id} className="glass-card">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{nameOf(f.student_id)}</p>
                  {f.rating != null && (
                    <span className="text-xs flex items-center gap-1"><Star className="h-3.5 w-3.5 text-accent" />{f.rating}/5</span>
                  )}
                </div>
                {f.message && <p className="text-sm text-muted-foreground">{f.message}</p>}
                {!f.reviewed && <Button size="sm" variant="secondary" onClick={() => markFeedbackReviewed(f.id)}>Mark reviewed</Button>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="message" className="pt-3">
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-base">Send a notification</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={msgTarget} onValueChange={setMsgTarget}>
                <SelectTrigger className="max-w-sm"><SelectValue placeholder="Select recipient" /></SelectTrigger>
                <SelectContent>
                  {(hasFullAccess ? [...volunteers, ...students] : myStudents).map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.user_id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Title" value={msgTitle} onChange={e => setMsgTitle(e.target.value)} className="max-w-sm" />
              <Textarea rows={3} placeholder="Message" value={msgBody} onChange={e => setMsgBody(e.target.value)} />
              <Button onClick={sendMessage}><Send className="h-4 w-4 mr-1" />Send</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportForm({ draft, setDraft, onSubmit, saving }: {
  draft: typeof emptyDraft;
  setDraft: (d: typeof emptyDraft) => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  const set = (patch: Partial<typeof emptyDraft>) => setDraft({ ...draft, ...patch });
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Present</Label>
          <Switch checked={draft.present} onCheckedChange={c => set({ present: c })} />
          <span className="text-xs text-muted-foreground">{draft.present ? 'Present' : 'Absent'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Rating</Label>
          <Select value={draft.rating} onValueChange={v => set({ rating: v })}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{'★'.repeat(n)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Date</Label>
          <Input type="date" className="w-40" value={draft.report_date} onChange={e => set({ report_date: e.target.value })} />
        </div>
      </div>
      <Textarea rows={2} placeholder="Student progress" value={draft.progress} onChange={e => set({ progress: e.target.value })} />
      <Textarea rows={2} placeholder="Behaviour / participation" value={draft.behaviour} onChange={e => set({ behaviour: e.target.value })} />
      <Textarea rows={2} placeholder="Problems or difficulties (leave empty if none)" value={draft.problem} onChange={e => set({ problem: e.target.value })} />
      <Textarea rows={2} placeholder="Additional notes" value={draft.notes} onChange={e => set({ notes: e.target.value })} />
      <Button onClick={onSubmit} disabled={saving} className="gradient-primary text-primary-foreground">
        {saving ? 'Submitting…' : 'Submit Report'}
      </Button>
    </div>
  );
}
