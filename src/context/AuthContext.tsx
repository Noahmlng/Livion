import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../repositories/interfaces';
import { getServiceFactory } from '../config/di';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuthState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 获取用户服务
  const userService = getServiceFactory().getUserService();

  const login = async (password: string) => {
    try {
      setLoading(true);
      const loggedInUser = await userService.login(password);
      setUser(loggedInUser);
      
      // 存储用户ID到session storage
      sessionStorage.setItem('user_id', loggedInUser.user_id.toString());
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshAuthState = async () => {
    try {
      setLoading(true);
      const userId = sessionStorage.getItem('user_id');
      
      if (!userId) {
        setUser(null);
        return;
      }

      const currentUser = await userService.getCurrentUser(userId);
      setUser(currentUser);
    } catch (error) {
      console.error('Error refreshing auth state:', error);
      setUser(null);
      // 清除无效的session
      sessionStorage.removeItem('user_id');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // 清除session storage
      sessionStorage.removeItem('user_id');
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    refreshAuthState();
  }, []);

  const value = {
    user,
    loading,
    login,
    signOut,
    refreshAuthState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 