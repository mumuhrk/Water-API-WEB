"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Loader2, Home, Plus, Upload } from 'lucide-react'
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

type ProcessingResp =
  | { status: "processing"; progress: string }
  | {
      status: "complete"
      result: {
        final_reading: number
        digit_details: { predicted_class: string; mapped_value: string }[]
      }
    }
  | { status: "error"; error_message: string }

interface Room {
  id: string
  name: string
  building_id: string
}

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  // Auth protect
  useEffect(() => {
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) router.push("/auth/login")
    })()
  }, [router, supabase])

  // Upload state
  const [file, setFile] = useState<File | null>(null)
  const [buildings, setBuildings] = useState<any[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState("")
  const [selectedRoom, setSelectedRoom] = useState("")

  const [isUploading, setIsUploading] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [progressText, setProgressText] = useState<string>("")
  const [progressValue, setProgressValue] = useState<number>(0)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [finalReading, setFinalReading] = useState<number | null>(null)
  const [digitDetails, setDigitDetails] = useState<{ predicted_class: string; mapped_value: string }[] | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  // Dialogs for quick add
  const [showBuildingDialog, setShowBuildingDialog] = useState(false)
  const [showRoomDialog, setShowRoomDialog] = useState(false)
  const [newBuildingName, setNewBuildingName] = useState("")
  const [newRoomName, setNewRoomName] = useState("")
  const [addingBuilding, setAddingBuilding] = useState(false)
  const [addingRoom, setAddingRoom] = useState(false)

  const pollTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchBuildings()
  }, [])

  useEffect(() => {
    if (selectedBuilding) {
      fetchRooms(selectedBuilding)
      setSelectedRoom("")
    }
  }, [selectedBuilding])

  const fetchBuildings = async () => {
    try {
      const res = await fetch("/api/buildings")
      if (res.ok) {
        setBuildings(await res.json())
      }
    } catch (e) {
      console.error("fetch buildings", e)
    }
  }

  const fetchRooms = async (buildingId: string) => {
    try {
      const res = await fetch(`/api/rooms?buildingId=${buildingId}`)
      if (res.ok) {
        setRooms(await res.json())
      }
    } catch (e) {
      console.error("fetch rooms", e)
    }
  }

  const parseProgressToPercent = (text: string) => {
    const match = text.match(/(\d+)\s*\/\s*(\d+)/)
    if (!match) return 0
    const step = Number.parseInt(match[1], 10)
    const total = Number.parseInt(match[2], 10)
    if (!total || Number.isNaN(step) || Number.isNaN(total)) return 0
    return Math.max(0, Math.min(100, Math.round((step / total) * 100)))
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setFile(f)
    setErrorMessage("")
    setFinalReading(null)
    setDigitDetails(null)
    setProgressText("")
    setProgressValue(0)
    setImageUrl(null)
  }

  const submitTask = async () => {
    if (!file || !selectedBuilding || !selectedRoom) {
      setErrorMessage("กรุณาเลือกไฟล์ ตึก และห้องให้ครบ")
      return
    }
    setIsUploading(true)
    setErrorMessage("")
    setFinalReading(null)
    setDigitDetails(null)

    try {
      const form = new FormData()
      form.append("image", file)
      form.append("buildingId", selectedBuilding)
      form.append("roomId", selectedRoom)

      const res = await fetch("/api/submit-task", { method: "POST", body: form })
      const data = await res.json()

      if (!res.ok || !data.task_id) {
        throw new Error(data.error || "ไม่สามารถส่งงานได้")
      }

      setTaskId(data.task_id)
      setImageUrl(data.imageUrl as string)

      // Start polling every 2 seconds
      pollTimer.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/task-status/${data.task_id}`, { cache: "no-store" })
          const s: ProcessingResp | { error?: string } = await statusRes.json()
          if (!statusRes.ok) {
            throw new Error((s as any).error || "สถานะไม่ถูกต้อง")
          }

          if ((s as any).status === "processing") {
            const p = s as Extract<ProcessingResp, { status: "processing" }>
            setProgressText(p.progress)
            setProgressValue(parseProgressToPercent(p.progress))
          } else if ((s as any).status === "complete") {
            const c = s as Extract<ProcessingResp, { status: "complete" }>
            setFinalReading(c.result.final_reading)
            setDigitDetails(c.result.digit_details)
            setIsUploading(false)
            if (pollTimer.current) {
              clearInterval(pollTimer.current)
              pollTimer.current = null
            }

            // Save to DB
            const saveRes = await fetch("/api/save-reading", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                task_id: data.task_id,
                final_reading: c.result.final_reading,
                digit_details: c.result.digit_details,
                buildingId: selectedBuilding,
                roomId: selectedRoom,
                imageUrl: data.imageUrl,
              }),
            })
            if (!saveRes.ok) {
              const e = await saveRes.json()
              console.error("Failed to save reading:", e.error)
            } else {
              toast({
                title: "บันทึกสำเร็จ",
                description: "บันทึกประวัติการอ่านค่าเรียบร้อย",
              })
            }
          } else if ((s as any).status === "error") {
            const e = s as Extract<ProcessingResp, { status: "error" }>
            setErrorMessage(e.error_message || "เกิดข้อผิดพลาดในการประมวลผล")
            setIsUploading(false)
            if (pollTimer.current) {
              clearInterval(pollTimer.current)
              pollTimer.current = null
            }
          }
        } catch (err) {
          setErrorMessage(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเช็คสถานะ")
          setIsUploading(false)
          if (pollTimer.current) {
            clearInterval(pollTimer.current)
            pollTimer.current = null
          }
        }
      }, 2000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด")
      setIsUploading(false)
    }
  }

  // Quick add building/room (same pattern as before)
  const handleAddBuilding = async () => {
    if (!newBuildingName.trim()) return
    setAddingBuilding(true)
    try {
      const response = await fetch("/api/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBuildingName }),
      })
      if (response.ok) {
        const building = await response.json()
        setBuildings((prev) => [...prev, building])
        setNewBuildingName("")
        setShowBuildingDialog(false)
      }
    } finally {
      setAddingBuilding(false)
    }
  }

  const handleAddRoom = async () => {
    if (!newRoomName.trim() || !selectedBuilding) return
    setAddingRoom(true)
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoomName,
          building_id: selectedBuilding,
        }),
      })
      if (response.ok) {
        const room = await response.json()
        setRooms((prev) => [...prev, room])
        setNewRoomName("")
        setShowRoomDialog(false)
      }
    } finally {
      setAddingRoom(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">อัพโหลดรูปมิเตอร์น้ำ</h1>
        <p className="text-muted-foreground mt-2">เลือกตึกและห้อง จากนั้นอัพโหลดรูป ระบบจะประมวลผลและบันทึกประวัติให้อัตโนมัติ</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>อัพโหลด</CardTitle>
          <CardDescription>เลือกรูปภาพและตำแหน่งติดตั้ง</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="file">รูปภาพมิเตอร์น้ำ</Label>
            <Input id="file" type="file" accept="image/*" onChange={onFileChange} disabled={isUploading} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Building */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>ตึก</Label>
                <Dialog open={showBuildingDialog} onOpenChange={setShowBuildingDialog}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      เพิ่มตึก
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>เพิ่มตึกใหม่</DialogTitle>
                      <DialogDescription>กรอกชื่อตึก</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor="buildingName">ชื่อตึก</Label>
                      <Input id="buildingName" value={newBuildingName} onChange={(e) => setNewBuildingName(e.target.value)} />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowBuildingDialog(false)}>
                        ยกเลิก
                      </Button>
                      <Button type="button" onClick={handleAddBuilding} disabled={addingBuilding || !newBuildingName.trim()}>
                        {addingBuilding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        เพิ่มตึก
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Select value={selectedBuilding} onValueChange={setSelectedBuilding} disabled={isUploading}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกตึก" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      <div className="flex items-center">
                        <Home className="h-4 w-4 mr-2" />
                        {b.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Room */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>ห้อง</Label>
                <Dialog open={showRoomDialog} onOpenChange={setShowRoomDialog}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" disabled={!selectedBuilding}>
                      <Plus className="h-4 w-4 mr-1" />
                      เพิ่มห้อง
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>เพิ่มห้องใหม่</DialogTitle>
                      <DialogDescription>กรอกชื่อห้อง</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor="roomName">ชื่อห้อง</Label>
                      <Input id="roomName" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowRoomDialog(false)}>
                        ยกเลิก
                      </Button>
                      <Button type="button" onClick={handleAddRoom} disabled={addingRoom || !newRoomName.trim()}>
                        {addingRoom && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        เพิ่มห้อง
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Select value={selectedRoom} onValueChange={setSelectedRoom} disabled={!selectedBuilding || isUploading}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกห้อง" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex items-center">
                        <Home className="h-4 w-4 mr-2" />
                        {r.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={submitTask} disabled={!file || !selectedBuilding || !selectedRoom || isUploading} className="w-full">
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังอัพโหลดและประมวลผล...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>

          {(isUploading || progressText) && !finalReading && !errorMessage && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{progressText || "กำลังเริ่มต้นงาน..."}</span>
              </div>
              <Progress value={progressValue} />
              <div className="text-xs text-muted-foreground text-right">{progressValue}%</div>
            </div>
          )}

          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {finalReading !== null && digitDetails && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription className="text-lg font-semibold">ผลลัพธ์สุดท้าย: {finalReading}</AlertDescription>
              </Alert>

              {imageUrl && (
                <div className="space-y-2">
                  <Label>รูปภาพที่อัพโหลด</Label>
                  <div className="relative w-full max-w-md mx-auto">
                    <Image
                      src={imageUrl || "/placeholder.svg"}
                      alt="Uploaded meter image"
                      width={400}
                      height={300}
                      className="rounded-lg border object-cover"
                    />
                  </div>
                </div>
              )}

              <div className="border rounded-lg">
                <div className="p-4 border-b font-semibold">รายละเอียดตัวเลข (Digit Details)</div>
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div className="font-medium">Predicted</div>
                    <div className="font-medium">Mapped</div>
                    <div className="hidden md:block font-medium text-center">ลำดับ</div>
                    {digitDetails.map((d, i) => (
                      <div key={`${d.predicted_class}-${i}`} className="contents">
                        <div className="p-2 rounded bg-muted">{d.predicted_class}</div>
                        <div className="p-2 rounded bg-muted">{d.mapped_value}</div>
                        <div className="hidden md:block p-2 rounded bg-muted text-center">{i + 1}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
