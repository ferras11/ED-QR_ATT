
import { supabase } from './supabase';

export type Role = 'student' | 'teacher' | 'admin';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

// Normalize role values returned by Supabase.
function normalizeRole(role: unknown): Role {
  const normalizedRole = String(role ?? '')
    .trim()
    .toLowerCase();

  if (
    normalizedRole === 'admin' ||
    normalizedRole === 'teacher' ||
    normalizedRole === 'student'
  ) {
    return normalizedRole;
  }

  console.warn(
    'Unknown profile role:',
    role,
    '- Defaulting to student.'
  );

  return 'student';
}

// Get the profile of the currently logged-in user.
export async function getProfile(
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    console.error(
      'Getting profile failed:',
      error?.message ?? 'No profile found for user ID: ' + userId
    );

    return null;
  }

  const profile: Profile = {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    role: normalizeRole(data.role),
  };

  console.log(
    'Loaded profile role:',
    profile.role,
    '| Email:',
    profile.email,
    '| User ID:',
    profile.id
  );

  return profile;
}

// Get all registered profiles for Admin User Management.
// Requires an appropriate Supabase RLS SELECT policy for admins.
export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .order('full_name', { ascending: true });

  if (error) {
    console.error(
      'Getting all profiles failed:',
      error.message
    );

    throw new Error(error.message);
  }

  return (data ?? []).map((item): Profile => ({
    id: item.id,
    email: item.email,
    full_name: item.full_name,
    role: normalizeRole(item.role),
  }));
}

// Update the profile of a user.
export async function updateProfile(
  userId: string,
  updates: { full_name?: string }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    console.error(
      'Updating profile failed:',
      error.message
    );
  }

  return {
    error: error?.message ?? null,
  };
}
