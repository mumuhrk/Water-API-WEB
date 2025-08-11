import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

// External async API base URL (server-side only)
const EXTERNAL_BASE =
  process.env.WATER_METER_API_BASE || "https://water-meter-api-732977633142.asia-southeast1.run.app"

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const image = formData.get("image")
    const buildingId = formData.get("buildingId") as string | null
    const roomId = formData.get("roomId") as string | null

    if (!(image instanceof Blob)) {
      return NextResponse.json({ error: "Missing 'image' file" }, { status: 400 })
    }
    if (!buildingId || !roomId) {
      return NextResponse.json({ error: "Missing buildingId or roomId" }, { status: 400 })
    }

    // 1) Upload image to Supabase Storage under user/building/room
    const file = image as File
    const safeName = file.name || "upload.jpg"
    const filePath = `${user.id}/${buildingId}/${roomId}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage.from("meter-images").upload(filePath, file)
    if (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json({ error: `Failed to upload image: ${uploadError.message}` }, { status: 500 })
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("meter-images").getPublicUrl(filePath)

    // 2) Forward file to external API to create task
    const externalForm = new FormData()
    externalForm.append("image", image, safeName)

    const res = await fetch(`${EXTERNAL_BASE}/submit_task`, {
      method: "POST",
      body: externalForm,
      headers: {
        Accept: "application/json",
      },
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json(
        { error: `Submit failed (${res.status}): ${errText.substring(0, 300)}` },
        { status: res.status || 500 }
      )
    }

    const data = (await res.json()) as { task_id?: string }
    if (!data.task_id) {
      return NextResponse.json({ error: "No task_id returned from external API" }, { status: 502 })
    }

    // Return task info and where the image is stored
    return NextResponse.json({
      task_id: data.task_id,
      imageUrl: publicUrl,
      buildingId,
      roomId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
