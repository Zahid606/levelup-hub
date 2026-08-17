import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { AlertTriangle, MessageSquare, UserCheck, Users, Clock, Star, Trash2, Send } from 'lucide-react';

type Person = { user_id: string; full_name: string | null; email?: string | null; phone?: string | null };

const INACTIVE_DAYS = 14;

export default function VolunteerWorkspace({ hasFullAccess }: { hasFullAccess: boolean }) {
  const { user } = useAuth();

  const [volunteers, setVolunteers] = useState<Person[]>([]);
  const [students, setStudents] = useState<Person[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);

  const [selectedVolunteer, setSelectedVolunteer] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!user) return;

    const profileTable = hasFullAccess ? 'profiles' : 'student_basic_profiles';

    const [assignRes, questionsRes, reportsRes, feedbackRes, profilesRes, progressRes] = await Promise.all([
      hasFullAccess
        ? supabase.from('volunteer_assignments').select('*')
        : supabase.from('volunteer_assignments').select('*').eq('volunteer_id', user.id),
      supabase.from('student_questions').select('*').order('created_at', { ascending: false }),
      supabase.from('student_reports').select('*').order('created_at', { ascending: false }),
      supabase.from('student_feedback').select('*').order('created_at', { ascending: false }),
      supabase.from(profileTable as any).select('user_id, full_name'),
      supabase.from('user_progress').select('user_id, completed, completed_at'),
    ]);

    setAssignments(assignRes.data || []);
    setQuestions(questionsRes.data || []);
    setReports(reportsRes.data || []);
    setFeedback(feedbackRes.data || []);
    setStudents(((profilesRes.data as any[]) || []) as Person[]);
    setProgress(progressRes.data || []);

    if (hasFullAccess) {
      const { data: roles } = await supabase.from('user_roles').select('user_id, role').eq('role', 'volunteer' as any);
      const ids = (roles || []).map(r => r.user_id);
      const list = ((profilesRes.data as any[]) || []).filter(p => ids.includes(p.user_id));
      // volunteers may not exist in the student profile list — fall back to raw ids
      const missing = ids.filter(id => !list.some(p => p.user_id === id)).map(id => ({ user_id: id, full_name: null }));
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
      return last === null || last < cutoff;
    });
  }, [myStudents, lastActivity]);

  const openQuestions = questions.filter(q => scope(q.student_id) && q.status === 'open');
  const openReports = reports.filter(r => scope(r.student_id) && r.status === 'open');
  const newFeedback = feedback.filter(f => scope(f.student_id) && !f.reviewed);
  const pendingTasks = openQuestions.length + openReports.length + newFeedback.length + inactiveStudents.length;

  const nameOf = (id: string) => students.find(s => s.user_id === id)?.full_name || 'Student';

  async function assignStudent(studentId: string) {
    if (!selectedVolunteer) { toast.error('Select a volunteer first'); return; }
    const { error } = await supabase.from('volunteer_assignments').insert({
      volunteer_id: selectedVolunteer, student_id: studentId, assigned_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Student assigned');
    void load();
  }

  async function unassign(id: string) {
    const { error } = await supabase.from('volunteer_assignments').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  async function answerQuestion(q: any) {
    const text = (answerDraft[q.id] || '').trim();
    if (!text) { toast.error('Write an answer first'); return; }
    const { error } = await supabase.from('student_questions').update({
      answer: text, answered_by: user?.id, answered_at: new Date().toISOString(), status: 'answered',
    }).eq('id', q.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Answer sent');
    setAnswerDraft(prev => ({ ...prev, [q.id]: '' }));
    void load();
  }

  async function resolveReport(id: string) {
    const { error } = await supabase.from('student_reports').update({ status: 'resolved', handled_by: user?.id }).eq('id', id);
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

  const assignedIdsForSelected = new Set(
    assignments.filter(a => a.volunteer_id === selectedVolunteer).map(a => a.student_id),
  );

  const stat = (label: string, value: number, Icon: any) => (
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stat('Students', myStudents.length, Users)}
        {stat('Questions', openQuestions.length, MessageSquare)}
        {stat('Reports', openReports.length, AlertTriangle)}
        {stat('Inactive', inactiveStudents.length, Clock)}
        {stat('Pending Tasks', pendingTasks, UserCheck)}
      </div>

      <Tabs defaultValue={hasFullAccess ? 'assign' : 'students'}>
        <TabsList className="flex flex-wrap h-auto">
          {hasFullAccess && <TabsTrigger value="assign">Assign</TabsTrigger>}
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        {hasFullAccess && (
          <TabsContent value="assign" className="space-y-3 pt-3">
            <Card className="glass-card">
              <CardHeader className="pb-2"><CardTitle className="text-base">Assign students to a volunteer</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedVolunteer} onValueChange={setSelectedVolunteer}>
                  <SelectTrigger className="max-w-sm"><SelectValue placeholder="Select volunteer" /></SelectTrigger>
                  <SelectContent>
                    {volunteers.map(v => (
                      <SelectItem key={v.user_id} value={v.user_id}>{v.full_name || v.user_id.slice(0, 8)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {volunteers.length === 0 && (
                  <p className="text-sm text-muted-foreground">No volunteers yet — add one from the Staff tab.</p>
                )}

                {selectedVolunteer && (
                  <>
                    <Input placeholder="Search students…" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="max-w-sm" />
                    <div className="max-h-80 overflow-y-auto divide-y divide-border/60 rounded-lg border border-border/60">
                      {students
                        .filter(s => (s.full_name || '').toLowerCase().includes(studentSearch.toLowerCase()))
                        .map(s => {
                          const assigned = assignments.find(a => a.volunteer_id === selectedVolunteer && a.student_id === s.user_id);
                          return (
                            <div key={s.user_id} className="flex items-center justify-between gap-2 p-2.5">
                              <span className="text-sm truncate">{s.full_name || s.user_id.slice(0, 8)}</span>
                              {assigned ? (
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => unassign(assigned.id)}>
                                  <Trash2 className="h-3.5 w-3.5 mr-1" />Remove
                                </Button>
                              ) : (
                                <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => assignStudent(s.user_id)}>Assign</Button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                    <p className="text-xs text-muted-foreground">{assignedIdsForSelected.size} student(s) assigned to this volunteer.</p>
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
            return (
              <Card key={s.user_id} className="glass-card">
                <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-medium">{s.full_name || 'Student'}</p>
                    <p className="text-xs text-muted-foreground">
                      {done} lesson(s) completed · last activity {last ? new Date(last).toLocaleDateString() : 'never'}
                    </p>
                  </div>
                  {(!last || Date.now() - last > INACTIVE_DAYS * 86400000) && <Badge variant="destructive">Inactive</Badge>}
                </CardContent>
              </Card>
            );
          })}
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
      </Tabs>
    </div>
  );
}
