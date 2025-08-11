"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, BuildingIcon, Home, Droplets, RotateCcw } from 'lucide-react'
import Image from "next/image"

interface Room {
  id: string
  name: string
  building_id: string
}

interface MeterReading {
  id: string
  meter_value: number
  image_url: string
  created_at: string
  building_id: string
  room_id: string
  digit_details: { predicted_class: string; mapped_value: string }[] | null
}

interface Building {
  id: string
  name: string
}

export default function HistoryPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [rooms, setRooms] = useState<Room[]>([]) // all rooms for the user
  const [readings, setReadings] = useState<MeterReading[]>([])
  const [filteredReadings, setFilteredReadings] = useState<MeterReading[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all")
  const [selectedRoom, setSelectedRoom] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
    fetchData()
  }, [])

  useEffect(() => {
    filterReadings()
  }, [readings, selectedBuilding, selectedRoom])

  const checkAuth = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
      }
    } catch {
      router.push("/auth/login")
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchBuildings(), fetchAllRooms(), fetchReadings()])
    } finally {
      setLoading(false)
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

  const fetchAllRooms = async () => {
    try {
      const response = await fetch(`/api/rooms`)
      if (response.ok) {
        const data = await response.json()
        setRooms(data)
      }
    } catch (error) {
      console.error("Error fetching rooms:", error)
    }
  }

  const fetchReadings = async () => {
    try {
      const { data, error } = await supabase
        .from("meter_readings")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) {
        console.error("Error fetching readings:", error)
      } else {
        setReadings((data as MeterReading[]) || [])
      }
    } catch (error) {
      console.error("Error fetching readings:", error)
    }
  }

  const filterReadings = () => {
    let filtered = readings
    if (selectedBuilding !== "all") {
      filtered = filtered.filter((reading) => reading.building_id === selectedBuilding)
    }
    if (selectedRoom !== "all") {
      filtered = filtered.filter((reading) => reading.room_id === selectedRoom)
    }
    setFilteredReadings(filtered)
  }

  const resetFilters = () => {
    setSelectedBuilding("all")
    setSelectedRoom("all")
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

  const getBuildingName = (buildingId: string) => {
    const building = buildings.find((b) => b.id === buildingId)
    return building?.name || "ไม่ระบุ"
  }

  const getRoomName = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId)
    return room?.name || "ไม่ระบุ"
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
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">ประวัติการอ่านค่า</h1>
        <p className="text-muted-foreground mt-2">ดูค่าที่อ่านได้, รายละเอียดตัวเลข, วันที่ และรูปภาพ แยกตามตึก/ห้อง</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ตัวกรองข้อมูล</CardTitle>
          <CardDescription>เลือกตึกและห้องเพื่อกรองข้อมูล</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>ตึก</Label>
              <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกตึก" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center">
                      <BuildingIcon className="h-4 w-4 mr-2" />
                      ทั้งหมด
                    </div>
                  </SelectItem>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      <div className="flex items-center">
                        <BuildingIcon className="h-4 w-4 mr-2" />
                        {b.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ห้อง</Label>
              <Select
                value={selectedRoom}
                onValueChange={setSelectedRoom}
                disabled={selectedBuilding === "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกห้อง" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center">
                      <Home className="h-4 w-4 mr-2" />
                      ทั้งหมด
                    </div>
                  </SelectItem>
                  {rooms
                    .filter((r) => selectedBuilding === "all" || r.building_id === selectedBuilding)
                    .map((r) => (
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
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button variant="outline" onClick={resetFilters} className="w-full bg-transparent">
                <RotateCcw className="h-4 w-4 mr-2" />
                รีเซ็ตตัวกรอง
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Badge variant="secondary">{filteredReadings.length} รายการ</Badge>
        {(selectedBuilding !== "all" || selectedRoom !== "all") && <Badge variant="outline">กรองแล้ว</Badge>}
      </div>

      {filteredReadings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Droplets className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">ไม่มีข้อมูล</h3>
            <p className="text-muted-foreground">ยังไม่มีการอ่านค่ามิเตอร์ หรือไม่พบข้อมูลตามตัวกรอง</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredReadings.map((reading) => (
            <Card key={reading.id}>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Droplets className="h-5 w-5 text-blue-500" />
                        <span className="text-2xl font-bold">{reading.meter_value} หน่วย</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <BuildingIcon className="h-4 w-4 mr-2" />
                        <span>ตึก: {getBuildingName(reading.building_id)}</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Home className="h-4 w-4 mr-2" />
                        <span>ห้อง: {getRoomName(reading.room_id)}</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{formatDate(reading.created_at)}</span>
                      </div>
                    </div>

                    {Array.isArray(reading.digit_details) && reading.digit_details.length > 0 && (
                      <div className="border rounded-lg mt-4">
                        <div className="p-3 border-b font-semibold">รายละเอียดตัวเลข</div>
                        <div className="p-3">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                            <div className="font-medium">Predicted</div>
                            <div className="font-medium">Mapped</div>
                            <div className="hidden md:block font-medium text-center">ลำดับ</div>
                            {reading.digit_details.map((d, i) => (
                              <div key={`${d.predicted_class}-${i}`} className="contents">
                                <div className="p-2 rounded bg-muted">{d.predicted_class}</div>
                                <div className="p-2 rounded bg-muted">{d.mapped_value}</div>
                                <div className="hidden md:block p-2 rounded bg-muted text-center">{i + 1}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <div className="relative w-full max-w-sm">
                      <Image
                        src={reading.image_url || "/placeholder.svg?height=300&width=400&query=uploaded%20meter%20image"}
                        alt="Meter reading image"
                        width={400}
                        height={300}
                        className="rounded-lg border object-cover w-full h-48"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
