import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { HelpCircle, Flag, MessageSquarePlus } from 'lucide-react';

export function StudentSupportPanel({ lessonId }: { lessonId: string }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'question' | 'report' | 'feedback'>('question');
  const [question, setQuestion] = useState('');
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [rating, setRating] = useState('5');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [myQuestions, setMyQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('student_questions').select('id,question,answer,status,created_at')
      .eq('student_id', user.id).eq('lesson_id', lessonId).order('created_at', { ascending: false })
      .then(({ data }) => setMyQuestions(data || []));
  }, [user, lessonId]);

  async function submit() {
    if (!user) return;
    setSaving(true);
    let error: any = null;
    if (mode === 'question') {
      if (!question.trim()) { setSaving(false); toast.error('Write your question'); return; }
      ({ error } = await supabase.from('student_questions').insert({ student_id: user.id, lesson_id: lessonId, question: question.trim() }));
      if (!error) setQuestion('');
    } else if (mode === 'report') {
      if (!subject.trim()) { setSaving(false); toast.error('Add a subject'); return; }
      ({ error } = await supabase.from('student_reports').insert({ student_id: user.id, subject: subject.trim(), details: details.trim() || null }));
      if (!error) { setSubject(''); setDetails(''); }
    } else {
      ({ error } = await supabase.from('student_feedback').insert({
        student_id: user.id, lesson_id: lessonId, rating: Number(rating) || null, message: message.trim() || null,
      }));
      if (!error) setMessage('');
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Sent to your volunteer 👍');
    if (mode === 'question') {
      const { data } = await supabase.from('student_questions').select('id,question,answer,status,created_at')
        .eq('student_id', user.id).eq('lesson_id', lessonId).order('created_at', { ascending: false });
      setMyQuestions(data || []);
    }
  }

  const tab = (value: typeof mode, label: string, Icon: any) => (
    <Button key={value} type="button" size="sm" variant={mode === value ? 'secondary' : 'ghost'} onClick={() => setMode(value)} className="text-xs">
      <Icon className="h-3.5 w-3.5 mr-1" />{label}
    </Button>
  );

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Need help?</CardTitle>
        <div className="flex gap-1 flex-wrap pt-1">
          {tab('question', 'Ask a question', HelpCircle)}
          {tab('report', 'Report an issue', Flag)}
          {tab('feedback', 'Feedback', MessageSquarePlus)}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {mode === 'question' && (
          <Textarea rows={3} placeholder="Type your question about this lesson…" value={question} onChange={e => setQuestion(e.target.value)} />
        )}
        {mode === 'report' && (
          <>
            <Input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
            <Textarea rows={3} placeholder="Describe the problem…" value={details} onChange={e => setDetails(e.target.value)} />
          </>
        )}
        {mode === 'feedback' && (
          <>
            <Input type="number" min={1} max={5} value={rating} onChange={e => setRating(e.target.value)} className="max-w-[100px]" />
            <Textarea rows={3} placeholder="Your feedback…" value={message} onChange={e => setMessage(e.target.value)} />
          </>
        )}
        <Button size="sm" onClick={submit} disabled={saving} className="gradient-primary text-primary-foreground">
          {saving ? 'Sending…' : 'Send'}
        </Button>

        {mode === 'question' && myQuestions.length > 0 && (
          <div className="pt-2 space-y-2">
            {myQuestions.map(q => (
              <div key={q.id} className="text-xs border-l-2 border-primary/50 pl-2">
                <p className="font-medium">{q.question}</p>
                <p className="text-muted-foreground">{q.answer ? q.answer : 'Waiting for your volunteer…'}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
