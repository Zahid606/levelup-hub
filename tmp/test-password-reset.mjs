import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anon || !service) throw new Error('Missing required environment variables');

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const adminEmail = `reset-admin-${suffix}@example.com`;
const studentEmail = `reset-student-${suffix}@example.com`;
const adminPassword = `Admin!${suffix}Aa1`;
const oldPassword = `Old!${suffix}Aa1`;
const newPassword = `New!${suffix}Bb2`;
const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
let adminId;
let studentId;

async function failIf(condition, message) {
  if (condition) throw new Error(message);
}

try {
  const { data: createdAdmin, error: adminCreateError } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Reset Test Admin' },
  });
  if (adminCreateError || !createdAdmin.user) throw adminCreateError || new Error('Admin create failed');
  adminId = createdAdmin.user.id;

  const { data: createdStudent, error: studentCreateError } = await admin.auth.admin.createUser({
    email: studentEmail,
    password: oldPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Reset Test Student' },
  });
  if (studentCreateError || !createdStudent.user) throw studentCreateError || new Error('Student create failed');
  studentId = createdStudent.user.id;

  const { error: roleAdminError } = await admin.from('user_roles').upsert({ user_id: adminId, role: 'admin' }, { onConflict: 'user_id,role' });
  if (roleAdminError) throw roleAdminError;
  const { error: roleStudentError } = await admin.from('user_roles').upsert({ user_id: studentId, role: 'student' }, { onConflict: 'user_id,role' });
  if (roleStudentError) throw roleStudentError;
  await admin.from('profiles').upsert([
    { user_id: adminId, email: adminEmail, full_name: 'Reset Test Admin' },
    { user_id: studentId, email: studentEmail, full_name: 'Reset Test Student' },
  ], { onConflict: 'user_id' });

  const beforeOld = await client.auth.signInWithPassword({ email: studentEmail, password: oldPassword });
  await failIf(beforeOld.error, `Old password did not work before reset: ${beforeOld.error?.message}`);
  if (beforeOld.data.session?.access_token) await client.auth.signOut({ scope: 'global' });

  const adminLogin = await client.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
  if (adminLogin.error || !adminLogin.data.session) throw adminLogin.error || new Error('Admin login failed');

  const response = await fetch(`${url}/functions/v1/admin-reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminLogin.data.session.access_token}`,
      'apikey': anon,
    },
    body: JSON.stringify({ user_id: studentId, email: studentEmail, new_password: newPassword }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) throw new Error(body.error || `Reset failed with HTTP ${response.status}`);

  const oldAfter = await client.auth.signInWithPassword({ email: studentEmail, password: oldPassword });
  await failIf(!oldAfter.error, 'Old password still works after reset');

  const newAfter = await client.auth.signInWithPassword({ email: studentEmail, password: newPassword });
  await failIf(newAfter.error, `New password failed after reset: ${newAfter.error?.message}`);

  console.log(JSON.stringify({ ok: true, verified: ['old password worked before reset', 'reset function succeeded', 'old password rejected after reset', 'new password accepted after reset'] }));
} finally {
  if (studentId) {
    await admin.from('quiz_answers').delete().eq('user_id', studentId);
    await admin.from('user_progress').delete().eq('user_id', studentId);
    await admin.from('user_points').delete().eq('user_id', studentId);
    await admin.from('gifts').delete().eq('user_id', studentId);
    await admin.from('user_roles').delete().eq('user_id', studentId);
    await admin.from('profiles').delete().eq('user_id', studentId);
    await admin.auth.admin.deleteUser(studentId);
  }
  if (adminId) {
    await admin.from('user_roles').delete().eq('user_id', adminId);
    await admin.from('profiles').delete().eq('user_id', adminId);
    await admin.auth.admin.deleteUser(adminId);
  }
}
