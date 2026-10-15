
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

let globalSession: Session | null = null;
let globalUser: User | null = null;
let globalLoading = true;
let authInitialized = false;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setAuth(session: Session | null) {
  authInitialized = true;
  globalSession = session;
  globalUser = session?.user ?? null;
  globalLoading = false;
  notify();
}

// Restore the saved session and listen for login/logout changes.
supabase.auth.onAuthStateChange((_event, session) => {
  setAuth(session);
});

supabase.auth
  .getSession()
  .then(({ data, error }) => {
    if (!authInitialized) {
      if (error) {
        console.error('Failed to restore session:', error.message);
      }
      setAuth(data?.session ?? null);
    }
  })
  .catch((error) => {
    console.error('Session initialization failed:', error);
    if (!authInitialized) {
      setAuth(null);
    }
  });

export function useAuth(): AuthState {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);

    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    session: globalSession,
    user: globalUser,
    loading: globalLoading,
  };
}

export type AppRole = 'student' | 'teacher' | 'admin';

export type SignUpProfile = {
  full_name: string;
  role: 'student' | 'teacher';
};

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { data, error };
  }

  if (data.session) {
    setAuth(data.session);
  }

  if (data.user && profile) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        role: profile.role,
      })
      .eq('id', data.user.id);

    if (profileError) {
      console.error('Profile update failed:', profileError.message);
    }
  }

  return { data, error: null };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!error && data.session) {
    setAuth(data.session);
  }

  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (!error) {
    setAuth(null);
  }

  return { error };
}
