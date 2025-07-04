"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Calendar, Loader2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [error, setError] = useState("")

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
    fetchProfile()
  }, [])

  const checkAuth = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
      }
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/auth/login")
    }
  }

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Try to get profile from user_profiles table
      const { data: profile, error } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

      if (error) {
        console.error("Error fetching profile:", error)
        // If profile doesn't exist, create it
        if (error.code === "PGRST116") {
          const { error: insertError } = await supabase.from("user_profiles").insert({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || null,
          })

          if (insertError) {
            console.error("Error creating profile:", insertError)
          } else {
            // Fetch the newly created profile
            const { data: newProfile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()
            if (newProfile) {
              setProfile(newProfile)
              setFullName(newProfile.full_name || "")
              setEmail(newProfile.email)
            }
          }
        }
      } else if (profile) {
        setProfile(profile)
        setFullName(profile.full_name || "")
        setEmail(profile.email)
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setError("")

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("user_profiles")
        .update({
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) {
        setError(error.message)
      } else {
        toast({
          title: "อัพเดทโปรไฟล์สำเร็จ",
          description: "ข้อมูลโปรไฟล์ของคุณได้รับการอัพเดทแล้ว",
        })
        fetchProfile()
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการอัพเดทโปรไฟล์")
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingPassword(true)
    setError("")

    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน")
      setUpdatingPassword(false)
      return
    }

    if (newPassword.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
      setUpdatingPassword(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        setError(error.message)
      } else {
        toast({
          title: "เปลี่ยนรหัสผ่านสำเร็จ",
          description: "รหัสผ่านของคุณได้รับการเปลี่ยนแปลงแล้ว",
        })
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน")
    } finally {
      setUpdatingPassword(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">โปรไฟล์ผู้ใช้</h1>
        <p className="text-muted-foreground mt-2">จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชี</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            ข้อมูลส่วนตัว
          </CardTitle>
          <CardDescription>แก้ไขข้อมูลส่วนตัวของคุณ</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={updating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input id="email" type="email" value={email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">ไม่สามารถเปลี่ยนอีเมลได้</p>
            </div>

            <Button type="submit" disabled={updating}>
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              บันทึกข้อมูล
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>เปลี่ยนรหัสผ่าน</CardTitle>
          <CardDescription>อัพเดทรหัสผ่านของคุณเพื่อความปลอดภัย</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={updatingPassword}
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={updatingPassword}
                minLength={6}
              />
            </div>

            <Button type="submit" disabled={updatingPassword || !newPassword || !confirmPassword}>
              {updatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              เปลี่ยนรหัสผ่าน
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Information */}
      {profile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              ข้อมูลบัญชี
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">อีเมล:</span>
              </div>
              <span className="text-sm font-medium">{profile.email}</span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">สมัครสมาชิกเมื่อ:</span>
              </div>
              <span className="text-sm font-medium">{formatDate(profile.created_at)}</span>
            </div>

            {profile.updated_at !== profile.created_at && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">อัพเดทล่าสุด:</span>
                  </div>
                  <span className="text-sm font-medium">{formatDate(profile.updated_at)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
