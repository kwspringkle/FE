"use client";

import { useState } from "react";
import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

// Hàm validation
const validateName = (name: string): string => {
  if (!name) return "名前を入力してください";
  // Chỉ cho phép chữ cái (bao gồm tiếng Nhật, tiếng Việt) và khoảng trắng, không cho phép số và ký tự đặc biệt
  const nameRegex = /^[\p{L}\s]+$/u;
  if (!nameRegex.test(name)) {
    return "名前は文字のみ入力可能です（特殊文字や数字は使用できません）";
  }
  if (name.trim().length < 2) {
    return "名前は2文字以上である必要があります";
  }
  return "";
};

const validateNationality = (nationality: string): string => {
  if (!nationality) return "国籍を選択してください";
  if (nationality !== "ベトナム" && nationality !== "日本") {
    return "ベトナムまたは日本を選択してください";
  }
  return "";
};

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

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [nationality, setNationality] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    nationality?: string;
    username?: string;
    password?: string;
  }>({});
  const { register, isLoading, error } = useAuth();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Chỉ cho phép chữ cái và khoảng trắng, loại bỏ ký tự đặc biệt và số
    // Loại bỏ số (0-9) trước, sau đó loại bỏ các ký tự không phải chữ cái và khoảng trắng
    value = value.replace(/[0-9]/g, ''); // Loại bỏ số
    value = value.replace(/[^\p{L}\s]/gu, ''); // Loại bỏ ký tự đặc biệt
    setName(value);
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: validateName(value) }));
    }
  };

  const handleNationalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setNationality(value);
    if (errors.nationality) {
      setErrors((prev) => ({ ...prev, nationality: validateNationality(value) }));
    }
  };

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
    const nameError = validateName(name);
    const nationalityError = validateNationality(nationality);
    const usernameError = validateEmail(username);
    const passwordError = validatePassword(password);
    
    setErrors({
      name: nameError,
      nationality: nationalityError,
      username: usernameError,
      password: passwordError,
    });

    // Nếu có lỗi validation, không submit
    if (nameError || nationalityError || usernameError || passwordError) {
      return;
    }

    try {
      await register({ name, username, password, national: nationality });
    } catch (err) {
      // Error is handled by useAuth hook
      console.error("Registration error:", err);
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

      {/* Right Panel - Register Form */}
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
            <h1 className="text-xl font-semibold text-foreground">
              ベトめしガイドへようこそ!
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">
                名前
              </Label>
              <CustomInput
                id="name"
                type="text"
                placeholder="お名前を入力"
                value={name}
                onChange={handleNameChange}
                className={errors.name ? "border-red-500 focus-visible:border-red-500" : ""}
                required
              />
              {errors.name && (
                <p className="text-red-600 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Nationality Field */}
            <div className="space-y-2">
              <Label htmlFor="nationality" className="text-sm font-medium text-foreground">
                国籍
              </Label>
              <CustomSelect
                id="nationality"
                value={nationality}
                onChange={handleNationalityChange}
                className={errors.nationality ? "border-red-500 focus-visible:border-red-500" : ""}
                required
              >
                <option value="" disabled hidden>国籍を選択</option>
                <option value="ベトナム">ベトナム</option>
                <option value="日本">日本</option>
              </CustomSelect>
              {errors.nationality && (
                <p className="text-red-600 text-xs mt-1">{errors.nationality}</p>
              )}
            </div>

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

            {/* Sign Up Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full mt-8 rounded-full bg-yellow-400 hover:bg-yellow-500 text-white font-medium h-12 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ transition: 'none' }}
            >
              {isLoading ? '登録中...' : 'サインアップ'}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              アカウントをお持ちの方 /{" "}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium underline">
                ログイン
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
