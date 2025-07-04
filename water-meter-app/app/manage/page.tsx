"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Home, Edit, Trash2, Plus, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Building {
  id: string
  name: string
  created_at: string
}

interface Room {
  id: string
  name: string
  building_id: string
  buildings?: { name: string }
  created_at: string
}

export default function ManagePage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [newBuildingName, setNewBuildingName] = useState("")
  const [newRoomName, setNewRoomName] = useState("")
  const [selectedBuildingForRoom, setSelectedBuildingForRoom] = useState("")
  const [showAddBuildingDialog, setShowAddBuildingDialog] = useState(false)
  const [showAddRoomDialog, setShowAddRoomDialog] = useState(false)
  const [showEditBuildingDialog, setShowEditBuildingDialog] = useState(false)
  const [showEditRoomDialog, setShowEditRoomDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
    fetchData()
  }, [])

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/auth/login")
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchBuildings(), fetchRooms()])
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

  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/rooms")
      if (response.ok) {
        const data = await response.json()
        setRooms(data)
      }
    } catch (error) {
      console.error("Error fetching rooms:", error)
    }
  }

  const handleAddBuilding = async () => {
    if (!newBuildingName.trim()) return

    setActionLoading(true)
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
        setShowAddBuildingDialog(false)
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
      setActionLoading(false)
    }
  }

  const handleEditBuilding = async () => {
    if (!editingBuilding || !newBuildingName.trim()) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/buildings/${editingBuilding.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBuildingName }),
      })

      if (response.ok) {
        const updatedBuilding = await response.json()
        setBuildings(buildings.map((b) => (b.id === editingBuilding.id ? updatedBuilding : b)))
        setEditingBuilding(null)
        setNewBuildingName("")
        setShowEditBuildingDialog(false)
        toast({
          title: "แก้ไขตึกสำเร็จ",
          description: `แก้ไขชื่อตึกเป็น "${updatedBuilding.name}" แล้ว`,
        })
      } else {
        throw new Error("Failed to update building")
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขตึกได้",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteBuilding = async (building: Building) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/buildings/${building.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setBuildings(buildings.filter((b) => b.id !== building.id))
        setRooms(rooms.filter((r) => r.building_id !== building.id))
        toast({
          title: "ลบตึกสำเร็จ",
          description: `ลบตึก "${building.name}" แล้ว`,
        })
      } else {
        throw new Error("Failed to delete building")
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบตึกได้",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddRoom = async () => {
    if (!newRoomName.trim() || !selectedBuildingForRoom) return

    setActionLoading(true)
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoomName,
          building_id: selectedBuildingForRoom,
        }),
      })

      if (response.ok) {
        await fetchRooms() // Refresh rooms to get building info
        setNewRoomName("")
        setSelectedBuildingForRoom("")
        setShowAddRoomDialog(false)
        toast({
          title: "เพิ่มห้องสำเร็จ",
          description: `เพิ่มห้อง "${newRoomName}" แล้ว`,
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
      setActionLoading(false)
    }
  }

  const handleEditRoom = async () => {
    if (!editingRoom || !newRoomName.trim()) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/rooms/${editingRoom.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoomName }),
      })

      if (response.ok) {
        const updatedRoom = await response.json()
        setRooms(rooms.map((r) => (r.id === editingRoom.id ? { ...r, name: updatedRoom.name } : r)))
        setEditingRoom(null)
        setNewRoomName("")
        setShowEditRoomDialog(false)
        toast({
          title: "แก้ไขห้องสำเร็จ",
          description: `แก้ไขชื่อห้องเป็น "${updatedRoom.name}" แล้ว`,
        })
      } else {
        throw new Error("Failed to update room")
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขห้องได้",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteRoom = async (room: Room) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/rooms/${room.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setRooms(rooms.filter((r) => r.id !== room.id))
        toast({
          title: "ลบห้องสำเร็จ",
          description: `ลบห้อง "${room.name}" แล้ว`,
        })
      } else {
        throw new Error("Failed to delete room")
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบห้องได้",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const openEditBuildingDialog = (building: Building) => {
    setEditingBuilding(building)
    setNewBuildingName(building.name)
    setShowEditBuildingDialog(true)
  }

  const openEditRoomDialog = (room: Room) => {
    setEditingRoom(room)
    setNewRoomName(room.name)
    setShowEditRoomDialog(true)
  }

  const getRoomCount = (buildingId: string) => {
    return rooms.filter((room) => room.building_id === buildingId).length
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
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">จัดการตึกและห้อง</h1>
        <p className="text-muted-foreground mt-2">เพิ่ม แก้ไข และลบตึกและห้องในระบบ</p>
      </div>

      {/* Buildings Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Home className="h-5 w-5 mr-2" />
                จัดการตึก
              </CardTitle>
              <CardDescription>เพิ่ม แก้ไข และลบตึกในระบบ</CardDescription>
            </div>
            <Dialog open={showAddBuildingDialog} onOpenChange={setShowAddBuildingDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddBuildingDialog(false)
                      setNewBuildingName("")
                    }}
                  >
                    ยกเลิก
                  </Button>
                  <Button type="button" onClick={handleAddBuilding} disabled={actionLoading || !newBuildingName.trim()}>
                    {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    เพิ่มตึก
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {buildings.length === 0 ? (
            <div className="text-center py-8">
              <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">ไม่มีตึก</h3>
              <p className="text-muted-foreground">เริ่มต้นด้วยการเพิ่มตึกแรกของคุณ</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {buildings.map((building) => (
                <div key={building.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">{building.name}</h3>
                      <p className="text-sm text-muted-foreground">{getRoomCount(building.id)} ห้อง</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEditBuildingDialog(building)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>ยืนยันการลบตึก</AlertDialogTitle>
                          <AlertDialogDescription>
                            คุณแน่ใจหรือไม่ที่จะลบตึก "{building.name}"? การดำเนินการนี้จะลบห้องทั้งหมดในตึกและข้อมูลการอ่านค่าที่เกี่ยวข้องด้วย
                            และไม่สามารถยกเลิกได้
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteBuilding(building)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            ลบตึก
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Building Dialog */}
      <Dialog open={showEditBuildingDialog} onOpenChange={setShowEditBuildingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขตึก</DialogTitle>
            <DialogDescription>แก้ไขชื่อตึก</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editBuildingName">ชื่อตึก</Label>
              <Input
                id="editBuildingName"
                value={newBuildingName}
                onChange={(e) => setNewBuildingName(e.target.value)}
                placeholder="เช่น ตึก A"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditBuildingDialog(false)
                setEditingBuilding(null)
                setNewBuildingName("")
              }}
            >
              ยกเลิก
            </Button>
            <Button type="button" onClick={handleEditBuilding} disabled={actionLoading || !newBuildingName.trim()}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rooms Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Home className="h-5 w-5 mr-2" />
                จัดการห้อง
              </CardTitle>
              <CardDescription>เพิ่ม แก้ไข และลบห้องในระบบ</CardDescription>
            </div>
            <Dialog open={showAddRoomDialog} onOpenChange={setShowAddRoomDialog}>
              <DialogTrigger asChild>
                <Button disabled={buildings.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่มห้อง
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>เพิ่มห้องใหม่</DialogTitle>
                  <DialogDescription>เลือกตึกและกรอกชื่อห้องที่ต้องการเพิ่ม</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="buildingSelect">ตึก</Label>
                    <select
                      id="buildingSelect"
                      value={selectedBuildingForRoom}
                      onChange={(e) => setSelectedBuildingForRoom(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">เลือกตึก</option>
                      {buildings.map((building) => (
                        <option key={building.id} value={building.id}>
                          {building.name}
                        </option>
                      ))}
                    </select>
                  </div>
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddRoomDialog(false)
                      setNewRoomName("")
                      setSelectedBuildingForRoom("")
                    }}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddRoom}
                    disabled={actionLoading || !newRoomName.trim() || !selectedBuildingForRoom}
                  >
                    {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    เพิ่มห้อง
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <div className="text-center py-8">
              <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">ไม่มีห้อง</h3>
              <p className="text-muted-foreground">
                {buildings.length === 0 ? "เพิ่มตึกก่อนเพื่อสร้างห้อง" : "เริ่มต้นด้วยการเพิ่มห้องแรกของคุณ"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {rooms.map((room) => (
                <div key={room.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">{room.name}</h3>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {room.buildings?.name || "ไม่ระบุตึก"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEditRoomDialog(room)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>ยืนยันการลบห้อง</AlertDialogTitle>
                          <AlertDialogDescription>
                            คุณแน่ใจหรือไม่ที่จะลบห้อง "{room.name}"? การดำเนินการนี้จะลบข้อมูลการอ่านค่าที่เกี่ยวข้องด้วย
                            และไม่สามารถยกเลิกได้
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteRoom(room)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            ลบห้อง
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Room Dialog */}
      <Dialog open={showEditRoomDialog} onOpenChange={setShowEditRoomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขห้อง</DialogTitle>
            <DialogDescription>แก้ไขชื่อห้อง</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editRoomName">ชื่อห้อง</Label>
              <Input
                id="editRoomName"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="เช่น ห้อง 101"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditRoomDialog(false)
                setEditingRoom(null)
                setNewRoomName("")
              }}
            >
              ยกเลิก
            </Button>
            <Button type="button" onClick={handleEditRoom} disabled={actionLoading || !newRoomName.trim()}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
