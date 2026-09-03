import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';
import { createClient } from '@supabase/supabase-js';

interface Input {
  user_id: string;
  /** true = make the student a volunteer, false = revert to student */
  volunteer: boolean;
}

function validate(input: unknown): Input {
  const raw = input as Partial<Input> | null;
  if (!raw?.user_id || typeof raw.user_id !== 'string') throw new Error('user_id is required');
  return { user_id: raw.user_id, volunteer: !!raw.volunteer };
}

/** Admin-only: promote a student to volunteer, or demote back to student. */
export const setVolunteerRole = createServerFn({ method: 'POST' })
  .inputValidator(validate)
  .handler(async ({ data }) => {
    const supabaseUrl = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL'];
    const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Server is not configured');

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const authHeader = getRequestHeader('Authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized');
    const { data: { user: caller } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) throw new Error('Unauthorized');

    const { data: callerRoles } = await admin.from('user_roles').select('role').eq('user_id', caller.id);
    const isAdmin = (callerRoles || []).some((r: { role: string }) => r.role === 'admin');
    if (!isAdmin) throw new Error('Only administrators can change volunteer status');

    const { data: targetRoles } = await admin.from('user_roles').select('role').eq('user_id', data.user_id);
    const roles = (targetRoles || []).map((r: { role: string }) => r.role);
    if (roles.includes('admin') || roles.includes('manager')) {
      throw new Error('This account is staff and cannot be changed here');
    }

    if (data.volunteer) {
      await admin.from('user_roles').delete().eq('user_id', data.user_id).eq('role', 'student');
      const { error } = await admin.from('user_roles').insert({ user_id: data.user_id, role: 'volunteer' } as never);
      if (error && !error.message.includes('duplicate')) throw new Error(error.message);
    } else {
      await admin.from('user_roles').delete().eq('user_id', data.user_id).eq('role', 'volunteer');
      // remove any student assignments held as a volunteer
      await admin.from('volunteer_assignments').delete().eq('volunteer_id', data.user_id);
      const { data: left } = await admin.from('user_roles').select('id').eq('user_id', data.user_id);
      if (!left || left.length === 0) {
        const { error } = await admin.from('user_roles').insert({ user_id: data.user_id, role: 'student' } as never);
        if (error) throw new Error(error.message);
      }
    }

    return { ok: true, volunteer: data.volunteer };
  });
