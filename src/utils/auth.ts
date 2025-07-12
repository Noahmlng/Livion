import supabase from './supabase';
import { User } from '../repositories/interfaces';
import { getServiceFactory } from '../config/di';

/**
 * Sign in with password
 */
export const signIn = async (password: string): Promise<User> => {
  // 使用新的服务层
  const serviceFactory = getServiceFactory();
  const userService = serviceFactory.getUserService();
  const user = await userService.login(password);
  
  // 存储用户 ID 到 session storage
  sessionStorage.setItem('user_id', user.user_id.toString());
  
  return user;
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
  sessionStorage.removeItem('user_id');
};

/**
 * Get the current logged in user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  return user;
}

/**
 * Sign up a new user with just a login key
 */
export const signUp = async (loginKey: string) => {
  // For Supabase we still need an email, but we'll generate it
  const email = `${loginKey.toLowerCase()}@noemail.example.com`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password: loginKey,
  });
  
  if (error) {
    throw error;
  }
  
  return data;
};

/**
 * Get the current session
 */
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}; 