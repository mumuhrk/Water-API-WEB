import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const buildingId = formData.get("buildingId") as string
    const roomId = formData.get("roomId") as string

    if (!file || !buildingId || !roomId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Upload image to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage.from("meter-images").upload(fileName, file)

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json({ error: `Failed to upload image: ${uploadError.message}` }, { status: 500 })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("meter-images").getPublicUrl(fileName)

    // Send image to external API with shorter timeout and retry logic
    const externalFormData = new FormData()
    externalFormData.append("file", file)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // Reduce to 1 minute

    try {
      console.log("Calling external API...")
      const response = await fetch("https://water-meter-api-732977633142.asia-southeast1.run.app/api/read-meter", {
        method: "POST",
        body: externalFormData,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      })

      clearTimeout(timeoutId)

      console.log("External API response status:", response.status)
      console.log("External API response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error("External API error response:", errorText)

        // Check for specific timeout errors
        if (errorText.includes("FUNCTION_INVOCATION_TIMEOUT") || errorText.includes("timeout")) {
          // Save with placeholder value for manual review
          const { error: insertError } = await supabase.from("meter_readings").insert({
            user_id: user.id,
            building_id: buildingId,
            room_id: roomId,
            image_url: publicUrl,
            meter_value: 0, // Placeholder value
          })

          if (insertError) {
            console.error("Database insert error:", insertError)
          }

          return NextResponse.json({
            success: false,
            error: "API timeout - รูปภาพถูกบันทึกแล้ว กรุณาใส่ค่ามิเตอร์ด้วยตนเอง",
            imageUrl: publicUrl,
            timeout: true,
          })
        }

        throw new Error(`External API request failed with status ${response.status}`)
      }

      // Check if response is JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text()
        console.error("Non-JSON response from external API:", responseText.substring(0, 500))

        // Save with placeholder value for manual review
        const { error: insertError } = await supabase.from("meter_readings").insert({
          user_id: user.id,
          building_id: buildingId,
          room_id: roomId,
          image_url: publicUrl,
          meter_value: 0, // Placeholder value
        })

        if (insertError) {
          console.error("Database insert error:", insertError)
        }

        return NextResponse.json({
          success: false,
          error: "ไม่สามารถอ่านค่ามิเตอร์ได้ - รูปภาพถูกบันทึกแล้ว กรุณาใส่ค่ามิเตอร์ด้วยตนเอง",
          imageUrl: publicUrl,
          needsManualInput: true,
        })
      }

      const result = await response.json()
      console.log("External API result:", result)

      if (result.success && result.result) {
        // Save meter reading to database
        const { error: insertError } = await supabase.from("meter_readings").insert({
          user_id: user.id,
          building_id: buildingId,
          room_id: roomId,
          image_url: publicUrl,
          meter_value: Number.parseFloat(result.result),
        })

        if (insertError) {
          console.error("Database insert error:", insertError)
          return NextResponse.json({ error: "Failed to save reading" }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          result: result.result,
          imageUrl: publicUrl,
        })
      } else {
        // Save with placeholder value for manual review
        const { error: insertError } = await supabase.from("meter_readings").insert({
          user_id: user.id,
          building_id: buildingId,
          room_id: roomId,
          image_url: publicUrl,
          meter_value: 0, // Placeholder value
        })

        if (insertError) {
          console.error("Database insert error:", insertError)
        }

        return NextResponse.json({
          success: false,
          error: "ไม่สามารถอ่านค่ามิเตอร์ได้ - รูปภาพถูกบันทึกแล้ว กรุณาใส่ค่ามิเตอร์ด้วยตนเอง",
          imageUrl: publicUrl,
          needsManualInput: true,
        })
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === "AbortError") {
        // Save with placeholder value for timeout
        const { error: insertError } = await supabase.from("meter_readings").insert({
          user_id: user.id,
          building_id: buildingId,
          room_id: roomId,
          image_url: publicUrl,
          meter_value: 0, // Placeholder value
        })

        if (insertError) {
          console.error("Database insert error:", insertError)
        }

        return NextResponse.json({
          success: false,
          error: "Request timeout (1 minute) - รูปภาพถูกบันทึกแล้ว กรุณาใส่ค่ามิเตอร์ด้วยตนเอง",
          imageUrl: publicUrl,
          timeout: true,
        })
      }
      console.error("External API error:", error)
      throw error
    }
  } catch (error) {
    console.error("Error processing meter reading:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
