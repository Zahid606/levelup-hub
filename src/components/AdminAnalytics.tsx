import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, UserCheck, UserX, FileQuestion, PieChart } from 'lucide-react';

interface AnalyticsProps {
  students: any[];
  allProgress: any[];
  allPoints: any[];
  lessons: any[];
  quizAnswers: any[];
}

export function AdminAnalytics({ students, allProgress, allPoints, lessons, quizAnswers }: AnalyticsProps) {
  const totalStudents = students.length;
  const maleCount = students.filter(s => s.gender === 'male').length;
  const femaleCount = students.filter(s => s.gender === 'female').length;
  const unspecifiedGender = totalStudents - maleCount - femaleCount;
  const malePct = totalStudents > 0 ? Math.round((maleCount / totalStudents) * 100) : 0;
  const femalePct = totalStudents > 0 ? Math.round((femaleCount / totalStudents) * 100) : 0;

  // Users who attempted at least one quiz
  const usersWhoAttempted = new Set(quizAnswers.map(a => a.user_id));
  const attemptedCount = usersWhoAttempted.size;
  const notAttemptedCount = totalStudents - attemptedCount;

  // Users who failed = attempted but got 0 correct answers
  const usersWithCorrect = new Set(quizAnswers.filter(a => a.is_correct).map(a => a.user_id));
  const failedCount = [...usersWhoAttempted].filter(uid => !usersWithCorrect.has(uid)).length;
  const passedCount = attemptedCount - failedCount;

  const avgAge = students.filter(s => s.age).length > 0
    ? Math.round(students.filter(s => s.age).reduce((sum: number, s: any) => sum + s.age, 0) / students.filter(s => s.age).length)
    : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-heading font-bold flex items-center gap-2">
        <PieChart className="h-5 w-5 text-primary" /> User Analytics
      </h2>

      {/* Gender Breakdown */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Gender Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Male</span>
            <span className="font-semibold">{maleCount} ({malePct}%)</span>
          </div>
          <Progress value={malePct} className="h-2" />
          <div className="flex justify-between text-sm">
            <span>Female</span>
            <span className="font-semibold">{femaleCount} ({femalePct}%)</span>
          </div>
          <Progress value={femalePct} className="h-2" />
          {unspecifiedGender > 0 && (
            <p className="text-xs text-muted-foreground">{unspecifiedGender} user(s) haven't specified gender</p>
          )}
        </CardContent>
      </Card>

      {/* Quiz Attempt Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <UserCheck className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-heading font-bold">{attemptedCount}</p>
            <p className="text-xs text-muted-foreground">Attempted Test</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <UserX className="h-5 w-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-heading font-bold">{notAttemptedCount}</p>
            <p className="text-xs text-muted-foreground">Not Attempted</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-heading font-bold">{passedCount}</p>
            <p className="text-xs text-muted-foreground">Passed (≥1 correct)</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <FileQuestion className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-heading font-bold">{failedCount}</p>
            <p className="text-xs text-muted-foreground">All Wrong</p>
          </CardContent>
        </Card>
      </div>

      {/* Extra Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-heading font-bold">{totalStudents}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-heading font-bold">{avgAge || '—'}</p>
            <p className="text-xs text-muted-foreground">Average Age</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-heading font-bold">{allProgress.filter(p => p.completed).length}</p>
            <p className="text-xs text-muted-foreground">Lessons Completed</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
