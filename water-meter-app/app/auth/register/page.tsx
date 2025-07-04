import { RegisterForm } from "@/components/auth/register-form"
import Link from "next/link"

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        <RegisterForm />
        <p className="text-center text-sm text-muted-foreground">
          มีบัญชีแล้ว?{" "}
          <Link href="/auth/login" className="underline underline-offset-4 hover:text-primary">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  )
}
