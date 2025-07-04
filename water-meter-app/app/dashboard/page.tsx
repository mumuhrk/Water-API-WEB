"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, Upload, Plus, Home, AlertTriangle, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface Room {
  id: string
  name: string
  building_id: string
}

export default function DashboardPage() {
  const [file, setFile] = useState<File | null>(null)
  const [buildings, setBuildings] = useState<any[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState("")
  const [selectedRoom, setSelectedRoom] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [needsManualInput, setNeedsManualInput] = useState(false)
  const [manualValue, setManualValue] = useState("")
  const [newBuildingName, setNewBuildingName] = useState("")
  const [newRoomName, setNewRoomName] = useState("")
  const [showBuildingDialog, setShowBuildingDialog] = useState(false)
  const [showRoomDialog, setShowRoomDialog] = useState(false)
  const [addingBuilding, setAddingBuilding] = useState(false)
  const [addingRoom, setAddingRoom] = useState(false)

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
    fetchBuildings()
  }, [])

  useEffect(() => {
    if (selectedBuilding) {
      fetchRooms(selectedBuilding)
      setSelectedRoom("")
    }
  }, [selectedBuilding])

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/auth/login")
    }
  }

  const fetchBuildings = async () => {
    try {
      const response = await fetch("/api/buildings")
      if (response.ok) {
        const data = await response.json()
        setBuildings(data)
      }
    } catch (error) {
      console.error("Error fetching buildings:", error)
    }
  }

  const fetchRooms = async (buildingId: string) => {
    try {
      const response = await fetch(`/api/rooms?buildingId=${buildingId}`)
      if (response.ok) {
        const data = await response.json()
        setRooms(data)
      }
    } catch (error) {
      console.error("Error fetching rooms:", error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
      setImageUrl(null)
      setNeedsManualInput(false)
      setManualValue("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file || !selectedBuilding || !selectedRoom) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเลือกไฟล์รูปภาพ ตึก และห้อง",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setResult(null)
    setImageUrl(null)
    setNeedsManualInput(false)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("buildingId", selectedBuilding)
      formData.append("roomId", selectedRoom)

      const response = await fetch("/api/read-meter", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.result)
        setImageUrl(data.imageUrl)
        toast({
          title: "อ่านค่ามิเตอร์สำเร็จ",
          description: `ค่าที่อ่านได้: ${data.result}`,
        })
      } else if (data.needsManualInput || data.timeout) {
        setImageUrl(data.imageUrl)
        setNeedsManualInput(true)
        toast({
          title: "ต้องใส่ค่าด้วยตนเอง",
          description: data.error,
          variant: "destructive",
        })
      } else {
        throw new Error(data.error || "Failed to read meter")
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถอ่านค่ามิเตอร์ได้",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = async () => {
    if (!manualValue.trim() || !imageUrl) return

    try {
      // Update the meter reading with manual value
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("meter_readings")
        .update({ meter_value: Number.parseFloat(manualValue) })
        .eq("user_id", user.id)
        .eq("image_url", imageUrl)

      if (error) {
        throw new Error(error.message)
      }

      setResult(manualValue)
      setNeedsManualInput(false)
      setManualValue("")
      toast({
        title: "บันทึกค่าสำเร็จ",
        description: `บันทึกค่ามิเตอร์: ${manualValue} หน่วย`,
      })
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกค่าได้",
        variant: "destructive",
      })
    }
  }

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
        setBuildings([...buildings, building])
        setNewBuildingName("")
        setShowBuildingDialog(false)
        toast({
          title: "เพิ่มตึกสำเร็จ",
          description: `เพิ่มตึก "${building.name}" แล้ว`,
        })
      } else {
        throw new Error("Failed to add building")
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มตึกได้",
        variant: "destructive",
      })
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
        setRooms([...rooms, room])
        setNewRoomName("")
        setShowRoomDialog(false)
        toast({
          title: "เพิ่มห้องสำเร็จ",
          description: `เพิ่มห้อง "${room.name}" แล้ว`,
        })
      } else {
        throw new Error("Failed to add room")
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มห้องได้",
        variant: "destructive",
      })
    } finally {
      setAddingRoom(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">อัพโหลดรูปมิเตอร์น้ำ</h1>
        <p className="text-muted-foreground mt-2">อัพโหลดรูปภาพมิเตอร์น้ำเพื่ออ่านค่าอัตโนมัติ</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>อัพโหลดรูปภาพ</CardTitle>
          <CardDescription>เลือกรูปภาพมิเตอร์น้ำ และระบุตำแหน่งที่ติดตั้ง</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="file">รูปภาพมิเตอร์น้ำ</Label>
              <Input id="file" type="file" accept="image/*" onChange={handleFileChange} disabled={loading} required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="building">ตึก</Label>
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
                        <DialogDescription>กรอกชื่อตึกที่ต้องการเพิ่ม</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="buildingName">ชื่อตึก</Label>
                          <Input
                            id="buildingName"
                            value={newBuildingName}
                            onChange={(e) => setNewBuildingName(e.target.value)}
                            placeholder="เช่น ตึก A"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowBuildingDialog(false)}>
                          ยกเลิก
                        </Button>
                        <Button
                          type="button"
                          onClick={handleAddBuilding}
                          disabled={addingBuilding || !newBuildingName.trim()}
                        >
                          {addingBuilding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          เพิ่มตึก
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <Select value={selectedBuilding} onValueChange={setSelectedBuilding} required>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกตึก" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        <div className="flex items-center">
                          <Home className="h-4 w-4 mr-2" />
                          {building.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="room">ห้อง</Label>
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
                        <DialogDescription>กรอกชื่อห้องที่ต้องการเพิ่ม</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="roomName">ชื่อห้อง</Label>
                          <Input
                            id="roomName"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            placeholder="เช่น ห้อง 101"
                          />
                        </div>
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
                <Select value={selectedRoom} onValueChange={setSelectedRoom} disabled={!selectedBuilding} required>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกห้อง" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        <div className="flex items-center">
                          <Home className="h-4 w-4 mr-2" />
                          {room.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังอ่านค่ามิเตอร์... (อาจใช้เวลาสูงสุด 1 นาที)
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  อัพโหลดและอ่านค่า
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {needsManualInput && imageUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
              ใส่ค่ามิเตอร์ด้วยตนเอง
            </CardTitle>
            <CardDescription>ระบบไม่สามารถอ่านค่าอัตโนมัติได้ กรุณาดูรูปและใส่ค่าด้วยตนเอง</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative w-full max-w-md mx-auto">
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt="Uploaded meter image"
                width={400}
                height={300}
                className="rounded-lg border object-cover"
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                placeholder="ใส่ค่ามิเตอร์ (เช่น 123.45)"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
              />
              <Button onClick={handleManualSubmit} disabled={!manualValue.trim()}>
                <Edit className="h-4 w-4 mr-2" />
                บันทึก
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && !needsManualInput && (
        <Card>
          <CardHeader>
            <CardTitle>ผลการอ่านค่า</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription className="text-lg font-semibold">ค่าที่อ่านได้: {result} หน่วย</AlertDescription>
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
