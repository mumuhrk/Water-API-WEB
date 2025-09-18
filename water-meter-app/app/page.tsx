import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  } else {
    redirect("/auth/login")
  }
}

// Prevent caching of this page
export const dynamic = "force-dynamic"
export const revalidate = 0
