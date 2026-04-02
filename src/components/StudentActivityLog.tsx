import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Props {
  students: any[];
  quizAnswers: any[];
  allProgress: any[];
  allPoints: any[];
  lessons: any[];
}

type StatusFilter = 'all' | 'attempted' | 'not_attempted' | 'passed' | 'failed';

export function StudentActivityLog({ students, quizAnswers, allProgress, allPoints, lessons }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'date'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const studentData = useMemo(() => {
    return students.map(student => {
      const uid = student.user_id;
      const answers = quizAnswers.filter(a => a.user_id === uid);
      const correctAnswers = answers.filter(a => a.is_correct);
      const progress = allProgress.filter(p => p.user_id === uid);
      const points = allPoints.filter(p => p.user_id === uid);
      const totalPoints = points.reduce((sum, p) => sum + p.points, 0);
      const attempted = answers.length > 0;
      const passed = correctAnswers.length > 0;
      const completedLessons = progress.filter(p => p.completed).length;

      let status: 'passed' | 'failed' | 'not_attempted';
      if (!attempted) status = 'not_attempted';
      else if (passed) status = 'passed';
      else status = 'failed';

      return {
        ...student,
        answers,
        correctAnswers,
        progress,
        points,
        totalPoints,
        attempted,
        passed,
        status,
        completedLessons,
        totalAnswers: answers.length,
        correctCount: correctAnswers.length,
        lastActivity: answers.length > 0
          ? new Date(Math.max(...answers.map(a => new Date(a.created_at).getTime())))
          : progress.length > 0
            ? new Date(Math.max(...progress.map(p => new Date(p.completed_at || p.id).getTime())))
            : new Date(student.created_at),
      };
    });
  }, [students, quizAnswers, allProgress, allPoints]);

  const filtered = useMemo(() => {
    let list = studentData;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => (s.full_name || '').toLowerCase().includes(q) || (s.user_id || '').toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'attempted') list = list.filter(s => s.attempted);
      else if (statusFilter === 'not_attempted') list = list.filter(s => !s.attempted);
      else if (statusFilter === 'passed') list = list.filter(s => s.status === 'passed');
      else if (statusFilter === 'failed') list = list.filter(s => s.status === 'failed');
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = (a.full_name || '').localeCompare(b.full_name || '');
      else if (sortBy === 'points') cmp = a.totalPoints - b.totalPoints;
      else if (sortBy === 'date') cmp = a.lastActivity.getTime() - b.lastActivity.getTime();
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [studentData, search, statusFilter, sortBy, sortDir]);

  const toggleSort = (col: 'name' | 'points' | 'date') => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'passed': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Passed</Badge>;
      case 'failed': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />All Wrong</Badge>;
      case 'not_attempted': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertCircle className="h-3 w-3 mr-1" />Not Attempted</Badge>;
    }
  };

  const getLessonTitle = (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId);
    return lesson?.title || 'Unknown Lesson';
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" /> Student Activity History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search student name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="attempted">Attempted</SelectItem>
              <SelectItem value="not_attempted">Not Attempted</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">All Wrong</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} student(s) found</p>

        {/* Table */}
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  Student <SortIcon col="name" />
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quiz Score</TableHead>
                <TableHead>Lessons Done</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('points')}>
                  Points <SortIcon col="points" />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('date')}>
                  Last Activity <SortIcon col="date" />
                </TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(student => (
                <>
                  <TableRow key={student.user_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedStudent(expandedStudent === student.user_id ? null : student.user_id)}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{student.full_name || 'No name'}</p>
                        <p className="text-xs text-muted-foreground">{student.gender || '—'} · Age: {student.age || '—'}</p>
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(student.status)}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{student.correctCount}/{student.totalAnswers}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{student.completedLessons}/{lessons.length}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-primary">{student.totalPoints}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">{student.lastActivity.toLocaleDateString()} {student.lastActivity.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </TableCell>
                    <TableCell>
                      {expandedStudent === student.user_id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </TableCell>
                  </TableRow>

                  {/* Expanded Detail */}
                  {expandedStudent === student.user_id && (
                    <TableRow key={`${student.user_id}-detail`}>
                      <TableCell colSpan={7} className="bg-muted/20 p-4">
                        <div className="space-y-4">
                          {/* Quiz Answers */}
                          {student.answers.length > 0 ? (
                            <div>
                              <h4 className="text-sm font-semibold mb-2">Quiz Answers</h4>
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {student.answers
                                  .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                  .map((answer: any) => (
                                    <div key={answer.id} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-background/50">
                                      <div className="flex items-center gap-2">
                                        {answer.is_correct
                                          ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                          : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                                        <span>{answer.is_correct ? 'Correct' : 'Wrong'}</span>
                                        <span className="text-muted-foreground">· +{answer.points_earned} pts</span>
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(answer.created_at).toLocaleDateString()} {new Date(answer.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No quiz attempts yet.</p>
                          )}

                          {/* Lesson Progress */}
                          {student.progress.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2">Lesson Progress</h4>
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {student.progress.map((p: any) => (
                                  <div key={p.id} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-background/50">
                                    <div className="flex items-center gap-2">
                                      {p.completed
                                        ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                        : <Clock className="h-3.5 w-3.5 text-yellow-500" />}
                                      <span>{getLessonTitle(p.lesson_id)}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {p.completed_at ? `${new Date(p.completed_at).toLocaleDateString()} ${new Date(p.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'In progress'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Points History */}
                          {student.points.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2">Points History</h4>
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {student.points
                                  .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                  .map((pt: any) => (
                                    <div key={pt.id} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-background/50">
                                      <div className="flex items-center gap-2">
                                        <span className={pt.points >= 0 ? 'text-green-500' : 'text-red-500'}>{pt.points >= 0 ? '+' : ''}{pt.points}</span>
                                        <span className="text-muted-foreground">{pt.reason || 'No reason'}</span>
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(pt.created_at).toLocaleDateString()} {new Date(pt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No students found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
