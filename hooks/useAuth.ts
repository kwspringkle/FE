"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/api/api';
import { setAuthToken, removeAuthToken } from '@/api/config';
import { showToast } from '@/lib/toast';
import { getCurrentUserScope, clearStoredUserScope } from '@/lib/userScope';
import { getLoginSessionKey } from '@/lib/locationCache';
import type { LoginRequest, RegisterRequest } from '@/api/types';

interface UseAuthReturn {
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

export function useAuth(): UseAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const login = async (data: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Attempting login with:', { username: data.username });
      const response = await authApi.login(data);
      console.log('Login successful, token received');
      setAuthToken(response.token);

      // Mark a new login session so pages can show the "update current location" prompt once.
      try {
        const scope = getCurrentUserScope();
        const sessionId = String(Date.now());
        localStorage.setItem(getLoginSessionKey(scope), sessionId);
      } catch {
        // ignore storage errors
      }

      showToast.success('ログイン成功！');
      router.push('/homepage'); // Redirect to homepage after login
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage = 'ログインに失敗しました';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        // Translate common error messages
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          errorMessage = 'ユーザー名またはパスワードが正しくありません';
        } else if (err.message.includes('Network') || err.message.includes('Failed to fetch')) {
          errorMessage = 'サーバーに接続できません。サーバーが起動しているか確認してください。';
        } else if (err.message.includes('500')) {
          errorMessage = 'サーバーエラーが発生しました';
        }
      }
      
      setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Attempting registration with:', { username: data.username, name: data.name });
      await authApi.register(data);
      console.log('Registration successful');
      showToast.success('登録成功！ログインページに移動します。');
      router.push('/login'); // Redirect to login page after registration
    } catch (err) {
      console.error('Registration error:', err);
      let errorMessage = '登録に失敗しました';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        // Translate common error messages
        if (err.message.includes('409') || err.message.includes('already exists')) {
          errorMessage = 'このユーザー名は既に使用されています';
        } else if (err.message.includes('Network') || err.message.includes('Failed to fetch')) {
          errorMessage = 'サーバーに接続できません。サーバーが起動しているか確認してください。';
        } else if (err.message.includes('500')) {
          errorMessage = 'サーバーエラーが発生しました';
        }
      }
      
      setError(errorMessage);
      showToast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Keep the last saved location for this account.
    // Next login will prompt whether to update current location.
    clearStoredUserScope();
    removeAuthToken();
    showToast.success('ログアウトしました');
    router.push('/login');
  };

  return {
    login,
    register,
    logout,
    isLoading,
    error,
  };
}

