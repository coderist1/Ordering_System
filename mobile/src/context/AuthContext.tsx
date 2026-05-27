import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { fetchMe, normalizeUser, setAuthToken, logout as apiLogout } from '../api/client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (accessToken: string, refreshToken: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const saveToStorage = async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  };

  const getFromStorage = async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  };

  const removeFromStorage = async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  };

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const accessToken = await getFromStorage('access_token');
        const userDataString = await getFromStorage('user');

        if (!accessToken) {
          setUser(null);
          setIsAuthenticated(false);
          return;
        }

        // Optimistically set token, then validate via /auth/me/
        setAuthToken(accessToken);

        if (userDataString && userDataString !== 'undefined') {
          const userData: User = JSON.parse(userDataString);
          setUser(userData);
        }

        try {
          const res = await fetchMe();
          const me = res.data as any;
          const normalizedMe = normalizeUser(me);
          const currentUser = userDataString && userDataString !== 'undefined' ? JSON.parse(userDataString) : null;
          const merged = { ...(currentUser || {}), ...(normalizedMe || {}) };
          await saveToStorage('user', JSON.stringify(merged));
          setUser(merged as User);
          setIsAuthenticated(true);
        } catch (_e: any) {
          // Token invalid (ex: wrong token type / stale token). Clear storage.
          await removeFromStorage('access_token');
          await removeFromStorage('refresh_token');
          await removeFromStorage('user');
          setAuthToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (_error) {
        // Fallback: if anything goes wrong, clear auth.
        await removeFromStorage('access_token');
        await removeFromStorage('refresh_token');
        await removeFromStorage('user');
        setAuthToken(null);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    loadAuthData();
  }, []);

  const login = async (accessToken: string, refreshToken: string, userData: User) => {
    try {
      await saveToStorage('access_token', accessToken);
      await saveToStorage('refresh_token', refreshToken);
      await saveToStorage('user', JSON.stringify(userData));
      setAuthToken(accessToken);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to save auth state:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await fetchMe();
      const me = res.data as any;
      const normalizedMe = normalizeUser(me);
      // Merge server-side user with locally cached user to avoid accidentally
      // wiping fields that may be omitted from the API response.
      const current = user || (await (async () => {
        const s = await getFromStorage('user');
        return s ? JSON.parse(s) : null;
      })());

      const merged = { ...(current || {}), ...(normalizedMe || {}) };

      await saveToStorage('user', JSON.stringify(merged));
      setUser(merged as User);
      setIsAuthenticated(true);
      return merged as User;
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
      return null;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = await getFromStorage('refresh_token');
      if (refreshToken) {
        try {
          await apiLogout(refreshToken);
        } catch {
          // Token may already be invalid; still clear local session.
        }
      }
      await removeFromStorage('access_token');
      await removeFromStorage('refresh_token');
      await removeFromStorage('user');
      setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Failed to clear auth state:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

