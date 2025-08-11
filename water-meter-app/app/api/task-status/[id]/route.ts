import { NextResponse } from "next/server"

const EXTERNAL_BASE =
  process.env.WATER_METER_API_BASE || "https://water-meter-api-732977633142.asia-southeast1.run.app"

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${EXTERNAL_BASE}/task_status/${params.id}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json(
        { error: `Status failed (${res.status}): ${errText.substring(0, 300)}` },
        { status: res.status || 500 }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
