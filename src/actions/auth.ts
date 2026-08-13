'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { User, UserRole } from '@/lib/types/database';

/**
 * Login with email + password via Supabase Auth.
 */
export async function login(email: string, password: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: 'Invalid email or password.' };
  }

  // Get user role for redirect
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication failed.' };

  let { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userData && user.email) {
    const { data: userByEmail } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single();
    userData = userByEmail;
  }

  const role = userData?.role || 'admin';
  redirect(`/${role}`);
}

/**
 * Logout — sign out and redirect to login.
 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Get the currently authenticated user with role info.
 */
export async function getCurrentUser(): Promise<(Pick<User, 'id' | 'name' | 'email' | 'role'>) | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  let { data } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('id', user.id)
    .single();

  if (!data && user.email) {
    const { data: userByEmail } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('email', user.email)
      .single();
    data = userByEmail;
  }

  return data as Pick<User, 'id' | 'name' | 'email' | 'role'> | null;
}

/**
 * Create a new user (Admin only).
 * Creates both a Supabase Auth user and a row in the users table.
 */
export async function createUser(params: {
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  password: string;
}): Promise<{ error?: string }> {
  const admin = createAdminClient();

  // Create Supabase Auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
  });

  if (authError) return { error: authError.message };

  // Create row in users table with the same UUID
  const { error: dbError } = await admin.from('users').insert({
    id: authData.user.id,
    name: params.name,
    email: params.email,
    phone: params.phone || null,
    password_hash: 'managed-by-supabase-auth',
    role: params.role,
    active: true,
  });

  if (dbError) {
    // Rollback: delete the auth user
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: dbError.message };
  }

  revalidatePath('/admin');
  return {};
}

/**
 * Require a specific role. Returns user or throws redirect.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<Pick<User, 'id' | 'name' | 'email' | 'role'>> {
  const user = await getCurrentUser();
  if (!user || !allowedRoles.includes(user.role)) {
    redirect('/login');
  }
  return user;
}
