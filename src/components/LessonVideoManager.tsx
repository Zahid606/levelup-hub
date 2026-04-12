import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Video, Star } from 'lucide-react';

interface LessonVideo {
  id: string;
  title: string | null;
  youtube_url: string | null;
  video_points: number;
  sort_order: number;
}

export function LessonVideoManager({ lessonId, lessonTitle }: { lessonId: string; lessonTitle: string }) {
  const [videos, setVideos] = useState<LessonVideo[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newPoints, setNewPoints] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadVideos(); }, [lessonId]);

  async function loadVideos() {
    const { data } = await supabase.from('lesson_content').select('*').eq('lesson_id', lessonId).order('sort_order');
    setVideos((data as any[]) || []);
  }

  const addVideo = async () => {
    if (!newUrl.trim()) { toast.error('YouTube URL is required'); return; }
    setLoading(true);
    const { error } = await supabase.from('lesson_content').insert({
      lesson_id: lessonId,
      title: newTitle || null,
      youtube_url: newUrl,
      video_points: newPoints,
      sort_order: videos.length,
    } as any);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Video added!');
    setNewTitle(''); setNewUrl(''); setNewPoints(10);
    loadVideos();
  };

  const removeVideo = async (id: string) => {
    await supabase.from('lesson_content').delete().eq('id', id);
    toast.success('Video removed');
    loadVideos();
  };

  const updatePoints = async (id: string, points: number) => {
    await supabase.from('lesson_content').update({ video_points: points } as any).eq('id', id);
    toast.success('Points updated');
    loadVideos();
  };

  return (
    <div className="space-y-3">
      <h4 className="font-medium flex items-center gap-2">
        <Video className="h-4 w-4" /> Videos for: {lessonTitle}
      </h4>

      {videos.map((v, i) => (
        <Card key={v.id} className="glass-card">
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{v.title || `Video ${i + 1}`}</p>
              <p className="text-xs text-muted-foreground truncate">{v.youtube_url}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-accent" />
                <Input
                  type="number" min={0} max={1000}
                  value={v.video_points}
                  onChange={e => {
                    const pts = parseInt(e.target.value) || 0;
                    setVideos(prev => prev.map(vid => vid.id === v.id ? { ...vid, video_points: pts } : vid));
                  }}
                  onBlur={e => updatePoints(v.id, parseInt(e.target.value) || 0)}
                  className="w-16 h-7 text-xs text-center"
                />
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeVideo(v.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Add new video</p>
        <Input placeholder="Video title" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="h-8 text-sm" />
        <Input placeholder="YouTube URL" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="h-8 text-sm" />
        <div className="flex gap-2">
          <div className="flex items-center gap-1 flex-1">
            <Star className="h-3.5 w-3.5 text-accent shrink-0" />
            <Input type="number" placeholder="Points" value={newPoints} onChange={e => setNewPoints(parseInt(e.target.value) || 0)} className="h-8 text-sm" />
          </div>
          <Button onClick={addVideo} disabled={loading} size="sm" className="gradient-primary text-primary-foreground">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}
