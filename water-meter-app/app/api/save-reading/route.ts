import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

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

    const body = await request.json()
    const { task_id, final_reading, digit_details, buildingId, roomId, imageUrl } = body as {
      task_id: string
      final_reading: number
      digit_details: { predicted_class: string; mapped_value: string }[]
      buildingId: string
      roomId: string
      imageUrl: string
    }

    if (!task_id || !Number.isFinite(final_reading) || !buildingId || !roomId || !imageUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { error } = await supabase.from("meter_readings").insert({
      user_id: user.id,
      building_id: buildingId,
      room_id: roomId,
      image_url: imageUrl,
      meter_value: Number(final_reading),
      digit_details,
      task_id,
    })

    if (error) {
      console.error("DB insert error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
