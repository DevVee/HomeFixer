'use server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function log(adminId: string, action: string, targetType: string, targetId: string, details: object = {}) {
  await adminClient().from('audit_logs').insert({ admin_id: adminId, action, target_type: targetType, target_id: targetId, details });
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function adminCreateUser(adminId: string, data: {
  email: string; password: string; fullName: string; phone: string; role: string;
}) {
  const sb = adminClient();
  const { data: auth, error } = await sb.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.fullName, role: data.role },
  });
  if (error) throw new Error(error.message);

  await sb.from('profiles').upsert({
    id: auth.user.id, email: data.email,
    full_name: data.fullName, phone: data.phone, role: data.role,
  });
  await log(adminId, 'create_user', 'user', auth.user.id, { email: data.email, role: data.role });
  revalidatePath('/dashboard/users');
}

export async function adminUpdateUser(adminId: string, userId: string, data: {
  fullName?: string; phone?: string; role?: string; isActive?: boolean;
}) {
  const sb = adminClient();
  const update: Record<string, any> = {};
  if (data.fullName  !== undefined) update.full_name = data.fullName;
  if (data.phone     !== undefined) update.phone     = data.phone;
  if (data.role      !== undefined) update.role      = data.role;
  if (data.isActive  !== undefined) update.is_active = data.isActive;
  update.updated_at = new Date().toISOString();

  const { error } = await sb.from('profiles').update(update).eq('id', userId);
  if (error) throw new Error(error.message);
  await log(adminId, 'update_user', 'user', userId, update);
  revalidatePath('/dashboard/users');
}

export async function adminDeleteUser(adminId: string, userId: string) {
  const sb = adminClient();
  const { error } = await sb.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  await log(adminId, 'delete_user', 'user', userId, {});
  revalidatePath('/dashboard/users');
}

export async function adminSuspendUser(adminId: string, userId: string, suspend: boolean) {
  const sb = adminClient();
  await sb.from('profiles').update({ is_active: !suspend, updated_at: new Date().toISOString() }).eq('id', userId);
  await log(adminId, suspend ? 'suspend_user' : 'unsuspend_user', 'user', userId, {});
  revalidatePath('/dashboard/users');
}

// ── Providers ────────────────────────────────────────────────────────────────

export async function adminApproveProvider(adminId: string, providerProfileId: string, providerUserId: string, email: string, name: string) {
  const sb = adminClient();
  await sb.from('provider_profiles').update({
    verification_status: 'approved', is_verified: true,
  }).eq('id', providerProfileId);
  await sb.from('profiles').update({ is_verified: true }).eq('id', providerUserId);
  await sb.from('notifications').insert({
    user_id: providerUserId, title: 'Account Verified!',
    body: 'Your HomeFixer provider account has been approved. You can now accept bookings.',
    type: 'verification', data: { status: 'approved' },
  });
  try {
    await sb.functions.invoke('send-email', { body: { type: 'verification_approved', to: email, providerName: name } });
  } catch {}
  try {
    await sb.functions.invoke('send-push', { body: { userIds: [providerUserId], title: 'Account Verified! ✅', body: 'You can now accept bookings on HomeFixer.', data: { type: 'verification' } } });
  } catch {}
  await log(adminId, 'approve_provider', 'provider', providerProfileId, { providerUserId });
  revalidatePath('/dashboard/providers/verification');
  revalidatePath('/dashboard/providers');
}

export async function adminRejectProvider(adminId: string, providerProfileId: string, providerUserId: string, email: string, name: string, reason: string) {
  const sb = adminClient();
  await sb.from('provider_profiles').update({ verification_status: 'rejected', is_verified: false }).eq('id', providerProfileId);
  await sb.from('notifications').insert({
    user_id: providerUserId, title: 'Verification Update',
    body: `Your verification was not approved. Reason: ${reason}`,
    type: 'verification', data: { status: 'rejected', reason },
  });
  try {
    await sb.functions.invoke('send-email', { body: { type: 'verification_rejected', to: email, providerName: name, reason } });
  } catch {}
  await log(adminId, 'reject_provider', 'provider', providerProfileId, { reason });
  revalidatePath('/dashboard/providers/verification');
}

// ── Notifications broadcast ──────────────────────────────────────────────────

export async function adminBroadcastNotification(adminId: string, data: {
  audience: 'all' | 'customers' | 'providers';
  title:    string;
  body:     string;
  type:     string;
}) {
  const sb = adminClient();
  let query = sb.from('profiles').select('id').eq('is_active', true);
  if (data.audience === 'customers') query = query.eq('role', 'customer');
  if (data.audience === 'providers') query = query.eq('role', 'provider');
  const { data: users } = await query;
  const userIds = (users ?? []).map((u: any) => u.id);
  if (!userIds.length) return;

  await sb.functions.invoke('send-push', { body: { userIds, title: data.title, body: data.body, data: { type: data.type } } });
  await log(adminId, 'broadcast_notification', 'notification', 'all', { audience: data.audience, title: data.title, count: userIds.length });
  revalidatePath('/dashboard/notifications');
}

// ── Settings ─────────────────────────────────────────────────────────────────

export async function adminUpdateSetting(adminId: string, key: string, value: string) {
  const sb = adminClient();
  await sb.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString(), updated_by: adminId }, { onConflict: 'key' });
  await log(adminId, 'update_setting', 'setting', key, { value });
  revalidatePath('/dashboard/settings');
}
