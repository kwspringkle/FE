"use client"

import { useState, useRef, useEffect } from "react"
import { TopHeader } from "@/components/TopHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, ChevronRight } from "lucide-react"
import Link from "next/link"
import { getAuthToken } from "@/api/config"
import { authApi, favoriteApi } from "@/api/api"
import { toast } from "sonner"
import { useUserLocation } from "@/components/UserLocationProvider"
import { clearDistanceCache } from "@/lib/locationCache"

export default function ProfilePage() {
  const { location, status, requestLocation, clearLocation } = useUserLocation()
  const [avatar, setAvatar] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    nationality: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [favoriteDishes, setFavoriteDishes] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch user profile data and favorites on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = getAuthToken()
        if (!token) {
          toast.error("認証トークンが見つかりません")
          return
        }

        const result = await authApi.getCurrentUser()
        
        if (result.data) {
          setFormData({
            name: result.data.name || "",
            nationality: result.data.national || "",
            email: result.data.email || "",
            currentPassword: "",
            newPassword: "",
            confirmPassword: ""
          })
          setAvatar(result.data.avatar || null)
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
        toast.error("ユーザー情報の取得に失敗しました")
      } finally {
        setLoading(false)
      }
    }

    const fetchFavoriteDishes = async () => {
      try {
        const token = getAuthToken()
        if (!token) return

        const result = await favoriteApi.getTop3Favorites()
        
        if (result.status === "success" && result.data) {
          setFavoriteDishes(result.data)
        }
      } catch (error) {
        console.error('Error fetching favorite dishes:', error)
      }
    }

    fetchUserProfile()
    fetchFavoriteDishes()
  }, [])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setAvatarFile(selectedFile)
    setAvatarPreview(URL.createObjectURL(selectedFile)) // preview アビ
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSaveInfo = async () => {
    setUploading(true)
    try {
      const token = getAuthToken()
      if (!token) {
        toast.error("認証トークンが見つかりません")
        setUploading(false)
        return
      }

      let avatarUrl = avatar

      // Upload to Cloudinary if new file is selected
      if (avatarFile) {
        const formData = new FormData()
        formData.append("file", avatarFile)
        formData.append("upload_preset", "user_avatars")

        try {
          const res = await fetch(
            "https://api.cloudinary.com/v1_1/dcxazccv9/image/upload",
            {
              method: "POST",
              body: formData,
            }
          )

          const data = await res.json()
          console.log("Cloudinary response:", data)

          if (data.secure_url) {
            avatarUrl = data.secure_url
            setAvatar(avatarUrl)
            toast.success("画像がアップロードされました")
          } else {
            throw new Error("Failed to upload image")
          }
        } catch (error) {
          console.error("Upload failed:", error)
          toast.error("画像のアップロードに失敗しました")
          setUploading(false)
          return
        }
      }

      // Update user information with avatar URL
      const requestBody = {
        fullname: formData.name || null,
        national: formData.nationality || null,
        avatar: avatarUrl || null,
        email: formData.email || null
      }

      const result = await authApi.updateUser(requestBody)
      
      if (result.message === "User information updated successfully") {
        toast.success("ユーザー情報が正常に更新されました")
        // Clear file and preview after successful save
        setAvatarFile(null)
        setAvatarPreview(null)
      } else {
        toast.error("ユーザー情報の更新に失敗しました")
      }
    } catch (error) {
      console.error('Error updating user info:', error)
      toast.error("ユーザー情報の更新中にエラーが発生しました")
    } finally {
      setUploading(false)
    }
  }

  const handleChangePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("新しいパスワードと確認用パスワードが一致しません")
      return
    }

    if (!formData.currentPassword || !formData.newPassword) {
      toast.error("現在のパスワードと新しいパスワードを入力してください")
      return
    }

    try {
      const token = getAuthToken()
      if (!token) {
        toast.error("認証トークンが見つかりません")
        return
      }

      const requestBody = {
        oldPassword: formData.currentPassword,
        newPassword: formData.newPassword
      }

      const result = await authApi.updatePassword(requestBody)
      
      if (result.message === "Password updated successfully") {
        toast.success("パスワードが正常に更新されました")
        // Clear password fields after successful update
        setFormData({
          ...formData,
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        })
      } else {
        toast.error("パスワードの更新に失敗しました")
      }
    } catch (error) {
      console.error('Error updating password:', error)
      toast.error("パスワードの更新中にエラーが発生しました")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <TopHeader userAvatar={avatar} />
        <div className="max-w-4xl mx-auto px-6 py-12 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <TopHeader userAvatar={avatar} />
      
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Page Title */}
        <h1 className="text-3xl font-bold text-center mb-12 text-slate-800 dark:text-slate-100">
          個人設定ページ
        </h1>

        {/* Location Section */}
        <div className="mb-8 border rounded-xl bg-white/80 dark:bg-slate-900/60 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">位置情報</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            近い順の並び替え・距離表示に使います。
          </p>

          <div className="text-sm text-slate-700 dark:text-slate-300 mb-4">
            {location ? (
              <div>
                <div>現在の位置: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</div>
                <div>更新: {new Date(location.timestamp).toLocaleString()}</div>
              </div>
            ) : (
              <div>現在の位置: 未設定</div>
            )}
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">状態: {status}</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={async () => {
                const next = await requestLocation()
                if (!next) {
                  toast.error("位置情報が取得できませんでした")
                  return
                }
                // Location changed => cached distances should be recomputed.
                clearDistanceCache()
                toast.success("位置情報を更新しました")
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              現在地を更新
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                clearLocation()
                clearDistanceCache()
                toast.success("位置情報をクリアしました")
              }}
            >
              位置情報をクリア
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Avatar */}
          <div className="lg:col-span-1 flex flex-col items-center">
            <div className="relative">
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-lg">
                {avatarPreview || avatar ? (
                  <img
                    src={avatarPreview || avatar || ""}
                    alt="User avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-20 h-20 text-blue-500 dark:text-blue-400" />
                )}
              </div>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-6 bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-500 dark:hover:bg-amber-600 rounded-full px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "アップロード中..." : "写真を変更"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* Right Column - Basic Information */}
          <div className="lg:col-span-2">
            {/* Basic Information Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-8 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                  基本情報
                </h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    名前
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 border-slate-300 dark:border-slate-600 rounded-full px-4"
                    placeholder=""
                  />
                </div>

                <div>
                  <Label htmlFor="nationality" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    国籍
                  </Label>
                  <Input
                    id="nationality"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleInputChange}
                    className="mt-1 border-slate-300 dark:border-slate-600 rounded-full px-4"
                    placeholder=""
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    メール
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 border-slate-300 dark:border-slate-600 rounded-full px-4"
                    placeholder=""
                  />
                </div>

                <div className="flex justify-center pt-4">
                  <Button
                    onClick={handleSaveInfo}
                    disabled={uploading}
                    className="bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-500 dark:hover:bg-amber-600 rounded-full px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? "保存中..." : "情報を保存"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Password Change Section */}
        <div className="mt-12 bg-white dark:bg-slate-800 rounded-2xl shadow-md p-8 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              パスワードの変更
            </h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                現在のパスワード
              </Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={handleInputChange}
                className="mt-1 border-slate-300 dark:border-slate-600 rounded-full px-4"
                placeholder=""
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  新しいパスワード
                </Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  className="mt-1 border-slate-300 dark:border-slate-600 rounded-full px-4"
                  placeholder=""
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  確認用パスワード
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="mt-1 border-slate-300 dark:border-slate-600 rounded-full px-4"
                  placeholder=""
                />
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={handleChangePassword}
                className="bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-500 dark:hover:bg-amber-600 rounded-full px-8"
              >
                パスワードを変更
              </Button>
            </div>
          </div>
        </div>

        {/* Favorites Section */}
        <div className="mt-12 bg-white dark:bg-slate-800 rounded-2xl shadow-md p-8 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              お気に入り一覧
            </h2>
            <Link
              href="/favorites"
              className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            >
              詳細
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {favoriteDishes.length > 0 ? (
              favoriteDishes.map((dish) => (
                <Link
                  key={dish.id}
                  href={`/dish/${dish.id}`}
                  className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="w-full h-32 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    {dish.imageUrl ? (
                      <img
                        src={dish.imageUrl}
                        alt={dish.dishesname}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <svg
                      className={`w-16 h-16 text-slate-400 dark:text-slate-500 ${dish.imageUrl ? 'hidden' : ''}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <h3 className="font-medium text-slate-800 dark:text-slate-100 text-center mb-1">
                    {dish.dishesname}
                  </h3>
                  {/* <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                    {dish.restaurantname} - {dish.distance}m
                  </p> */}
                </Link>
              ))
            ) : (
              <div className="col-span-3 text-center py-8 text-slate-500 dark:text-slate-400">
                お気に入りの料理がまだありません
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
