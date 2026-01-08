"use client"

import { User, Settings, LogOut, Home, Info, UtensilsCrossed, Heart, Search } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"

interface TopHeaderProps {
  userAvatar?: string | null
}

export function TopHeader({ userAvatar = null }: TopHeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const { logout } = useAuth()

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showProfileMenu])

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/homepage" className="flex items-center gap-3 text-lg font-medium text-foreground hover:text-primary transition-colors">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center shadow-md">
            <UtensilsCrossed className="w-6 h-6 text-white" />
          </div>
          ベトめしガイド
        </Link>
        
        {/* Navigation Menu - Right Side */}
        <div className="relative flex items-center gap-6" ref={profileMenuRef}>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/homepage" className="text-sm font-medium text-foreground hover:text-yellow-500 transition-colors flex items-center gap-1">
              <Home className="w-4 h-4" />
              ホーム
            </Link>
            <Link href="/favorites" className="text-sm font-medium text-foreground hover:text-yellow-500 transition-colors flex items-center gap-1">
              <Heart className="w-4 h-4" />
              お気に入り
            </Link>
            {/* <Link href="/restaurant/reviews" className="text-sm font-medium text-foreground hover:text-yellow-500 transition-colors">
              レストランレビュー
            </Link> */}
            {/* <Link href="/ranking" className="text-sm font-medium text-foreground hover:text-yellow-500 transition-colors">
              ランキング
            </Link> */}
            {/* <Link href="/" className="text-sm font-medium text-foreground hover:text-yellow-500 transition-colors flex items-center gap-1">
              <Info className="w-4 h-4" />
              私たちについて
            </Link> */}
          </nav>

          {/* Profile Menu */}
          <div className="relative flex items-center gap-2">
            <Link 
              href="/profile"
              className="hidden md:block text-sm font-medium text-foreground hover:text-yellow-500 transition-colors"
            >
              プロフィール
            </Link>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="p-2 hover:bg-muted rounded-lg transition-colors relative"
              aria-label="User profile"
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt="User avatar"
                  className="w-8 h-8 rounded-full object-cover"
                  onError={() => {}}
                />
              ) : (
                <User className="w-5 h-5 text-foreground" />
              )}
            </button>
          </div>
          
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50"
            >
              <Link
                href="/profile"
                className="flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors first:rounded-t-lg"
              >
                <Settings className="w-4 h-4" />
                個人設定
              </Link>
              <button
                onClick={() => {
                  logout()
                  setShowProfileMenu(false)
                }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors last:rounded-b-lg"
              >
                <LogOut className="w-4 h-4" />
                ログアウト
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

