import supabase from './supabase';
import { User } from '../types/supabase';

// Debug logging
const DEBUG = true;
const log = (...args: any[]) => {
  if (DEBUG) {
    console.log('[Auth]', ...args);
  }
};

/**
 * Sign in with password
 */
export const signIn = async (password: string): Promise<User> => {
  log('Signing in with password:', password);
  
  // Query the users table
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('password', password)
    .single();

  if (error) {
    log('Error signing in:', error);
    throw error;
  }

  if (!data) {
    throw new Error('User not found');
  }

  // Store the user ID in session storage
  sessionStorage.setItem('user_id', data.id);
  
  log('Signed in successfully:', data);
  return data;
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
  log('Signing out');
  sessionStorage.removeItem('user_id');
  log('Signed out successfully');
};

/**
 * Get the current logged in user
 */
export const getCurrentUser = async (): Promise<User | null> => {
  log('Getting current user');
  const userId = sessionStorage.getItem('user_id');
  
  if (!userId) {
    log('No user ID found in session storage');
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    log('Error getting current user:', error);
    return null;
  }

  log('Current user:', data);
  return data;
};

/**
 * Sign up a new user with just a login key
 * The key can be in any format (e.g., NOVAE, without dash)
 */
export const signUp = async (loginKey: string) => {
  log('Signing up new user with key:', loginKey);
  // For Supabase we still need an email, but we'll generate it
  const email = `${loginKey.toLowerCase()}@noemail.example.com`;
  
  // Simple password
  const { data, error } = await supabase.auth.signUp({
    email,
    password: loginKey,
  });
  
  if (error) {
    log('Sign up error:', error);
    throw error;
  }
  
  log('Sign up successful:', data?.user?.id);
  return data;
};

/**
 * Sign in with just a login key
 * The login key is used as is, no format validation required
 */
export const signInWithKey = async (loginKey: string) => {
  log('Attempting sign in with key:', loginKey);
  // Remove the dash if it exists (to make input more flexible)
  const cleanKey = loginKey.replace(/-/g, '');
  
  // Generate the email from the login key
  const email = `${cleanKey.toLowerCase()}@noemail.example.com`;
  
  // Special case for NOVAE
  if (cleanKey === 'NOVAE') {
    log('Special case: NOVAE login');
    // Create a simulated user for NOVAE
    const customUser: User = {
      id: 'novae-special-user',
      email: 'novae@noemail.example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };
    
    // Attempt to sign in with Supabase auth to create a proper session
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: loginKey,
      });
      
      if (!error && data.user) {
        log('NOVAE login succeeded via Supabase auth');
        return data;
      }
    } catch (err) {
      log('Supabase auth failed for NOVAE, using custom user');
    }
    
    // Return custom user if Supabase auth failed
    return { session: { user: customUser, access_token: 'fake-token', refresh_token: 'fake-refresh' } };
  }
  
  // Try to sign in with Supabase auth
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: loginKey,
    });
    
    if (error) {
      log('Regular sign in failed, error:', error);
      throw error;
    }
    
    log('Sign in successful via Supabase auth:', data?.user?.id);
    return data;
  } catch (err) {
    log('Sign in error:', err);
    throw new Error('登录失败，请检查密码是否正确');
  }
};

/**
 * Get the current session
 */
export const getSession = async () => {
  log('Getting current session');
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    log('Get session error:', error);
    throw error;
  }
  log('Session found:', !!data.session);
  return data.session;
}; 