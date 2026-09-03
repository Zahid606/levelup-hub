import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export interface MessageContact {
  user_id: string;
  full_name: string;
  role: string;
}

/**
 * Returns the people the signed-in caller is allowed to message.
 * The caller's identity comes from the verified bearer token, never from client input.
 */
export const getMessageContacts = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MessageContact[]> => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const me = context.userId;

    const { data: roleRows } = await supabaseAdmin.from('user_roles').select('user_id, role');
    const roles = roleRows ?? [];
    const roleOf = (id: string) => roles.find(r => r.user_id === id)?.role ?? 'student';
    const isStaff = roles.some(r => r.user_id === me && (r.role === 'admin' || r.role === 'manager'));

    const ids = new Set<string>();

    if (isStaff) {
      const { data: everyone } = await supabaseAdmin.from('profiles').select('user_id');
      (everyone ?? []).forEach(p => { if (p.user_id !== me) ids.add(p.user_id); });
    }

    // Staff are reachable by every signed-in user.
    roles
      .filter(r => (r.role === 'admin' || r.role === 'manager') && r.user_id !== me)
      .forEach(r => ids.add(r.user_id));

    // Volunteer <-> assigned student, both directions.
    const { data: assignments } = await supabaseAdmin
      .from('volunteer_assignments')
      .select('volunteer_id, student_id')
      .or(`volunteer_id.eq.${me},student_id.eq.${me}`);
    (assignments ?? []).forEach(a => {
      if (a.volunteer_id === me) ids.add(a.student_id);
      if (a.student_id === me) ids.add(a.volunteer_id);
    });

    if (ids.size === 0) return [];

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', Array.from(ids));

    return Array.from(ids).map(id => ({
      user_id: id,
      full_name: profiles?.find(p => p.user_id === id)?.full_name || 'User',
      role: roleOf(id),
    }));
  });
