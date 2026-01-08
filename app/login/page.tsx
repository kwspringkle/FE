"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import { CustomInput } from "@/components/ui/custom-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/api/api";
import { getAuthToken, removeAuthToken } from "@/api/config";

// Hàm validation
const validateEmail = (email: string): string => {
  if (!email) return "メールを入力してください";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "正しいメール形式を入力してください";
  }
  return "";
};

const validatePassword = (password: string): string => {
  if (!password) return "パスワードを入力してください";
  if (password.length < 8) {
    return "パスワードは8文字以上である必要があります";
  }
  if (!/[A-Z]/.test(password)) {
    return "パスワードには大文字が含まれている必要があります";
  }
  if (!/[a-z]/.test(password)) {
    return "パスワードには小文字が含まれている必要があります";
  }
  if (!/[0-9]/.test(password)) {
    return "パスワードには数字が含まれている必要があります";
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return "パスワードには特殊文字が含まれている必要があります";
  }
  return "";
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const { login, isLoading, error } = useAuth();

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        await authApi.getCurrentUser();
        if (!cancelled) {
          router.replace("/homepage");
        }
      } catch {
        // Token is invalid/expired, clear it and stay on /login
        removeAuthToken();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    if (errors.username) {
      setErrors((prev) => ({ ...prev, username: validateEmail(value) }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: validatePassword(value) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate tất cả trường
    const usernameError = validateEmail(username);
    const passwordError = validatePassword(password);

    setErrors({
      username: usernameError,
      password: passwordError,
    });

    // Nếu có lỗi validation, không submit
    if (usernameError || passwordError) {
      return;
    }

    try {
      await login({ username, password });
    } catch (err) {
      // Error is handled by useAuth hook
      console.error("Login error:", err);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Decorative */}
      <div >
        <img
          src="https://tway-air.vn/wp-content/uploads/2024/12/mon-com-tam.jpg"
          alt="Vietnamese food"
          className="w-full h-full object-cover transition-transform duration-500"
        />
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-12">
            {/* Circular background with centered icon */}
            <div className="flex justify-center mb-8">
              <div className="w-28 h-28 rounded-full bg-slate-100 flex items-center justify-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center shadow-md">
                  <UtensilsCrossed className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>
            {/* Welcome text */}
            <h1 className="text-xl font-semibold text-foreground mb-1">
              ベトめしガイドへ
            </h1>
            <h2 className="text-xl font-semibold text-foreground">
              おかえりなさい
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-foreground">
                メール
              </Label>
              <CustomInput
                id="username"
                type="email"
                placeholder="example@email.com"
                value={username}
                onChange={handleUsernameChange}
                className={errors.username ? "border-red-500 focus-visible:border-red-500" : ""}
                required
              />
              {errors.username && (
                <p className="text-red-600 text-xs mt-1">{errors.username}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                パスワード
              </Label>
              <CustomInput
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={handlePasswordChange}
                className={errors.password ? "border-red-500 focus-visible:border-red-500" : ""}
                required
              />
              {errors.password && (
                <p className="text-red-600 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Login Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full mt-8 rounded-full bg-yellow-400 hover:bg-yellow-500 text-white font-medium h-12 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ transition: 'none' }}
            >
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>

          {/* Sign Up Link */}
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              アカウントをお持ちでない方 /{" "}
              <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium underline">
                サインアップ
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
