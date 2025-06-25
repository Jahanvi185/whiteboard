import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { Users, Palette, Square, Circle, Type, Eraser, Undo, RotateCcw, Download, Settings } from 'lucide-react'
import io from 'socket.io-client'
import { v4 as uuidv4 } from 'uuid'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('home')
  const [socket, setSocket] = useState(null)
  const [roomId, setRoomId] = useState('')
  const [userName, setUserName] = useState('')
  const [room, setRoom] = useState(null)
  const [users, setUsers] = useState([])
  const [isConnected, setIsConnected] = useState(false)

  // Drawing state
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState('pen')
  const [currentColor, setCurrentColor] = useState('#000000')
  const [currentSize, setCurrentSize] = useState(2)
  const [drawings, setDrawings] = useState([])
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 })
  const [tempDrawing, setTempDrawing] = useState(null)
  const [textInputActive, setTextInputActive] = useState(false)
  const [textInputPos, setTextInputPos] = useState({ x: 0, y: 0 })
  const [textInputValue, setTextInputValue] = useState('')

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:5000')
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setIsConnected(true)
      console.log('Connected to server')
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
      console.log('Disconnected from server')
    })

    newSocket.on('room-joined', (data) => {
      setRoom(data.room)
      setUsers(data.room.users)
      setDrawings(data.drawings)
      setCurrentView('whiteboard')
      // Redraw canvas with existing drawings
      if (canvasRef.current && ctxRef.current) {
        redrawCanvas(data.drawings)
      }
    })

    newSocket.on('user-joined', (user) => {
      setUsers(prev => [...prev, user])
    })

    newSocket.on('user-left', (user) => {
      setUsers(prev => prev.filter(u => u.id !== user.id))
    })

    newSocket.on('drawing', (drawingData) => {
      setDrawings(prev => {
        const newDrawings = [...prev, drawingData]
        redrawCanvas(newDrawings)
        return newDrawings
      })
    })

    newSocket.on('canvas-cleared', () => {
      setDrawings([])
      if (ctxRef.current) {
        ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    })

    newSocket.on('undo', (newDrawings) => {
      setDrawings(newDrawings)
      if (canvasRef.current && ctxRef.current) {
        redrawCanvas(newDrawings)
      }
    })

    newSocket.on('error', (error) => {
      alert(error.message)
    })

    return () => {
      newSocket.close()
    }
  }, []) // Empty dependency array to run once on mount

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctxRef.current = ctx
      redrawCanvas(drawings)
    }
  }, [currentView, drawings]) // Re-initialize canvas when view changes to whiteboard or drawings update

  const createRoom = async () => {
    if (!userName.trim()) {
      alert('Please enter your name')
      return
    }

    try {
      const response = await fetch('http://localhost:5000/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${userName}'s Room`,
          isPrivate: false
        })
      })

      const data = await response.json()
      setRoomId(data.roomId)
      joinRoom(data.roomId)
    } catch (error) {
      console.error('Error creating room:', error)
      alert('Failed to create room')
    }
  }

  const joinRoom = (id = roomId) => {
    if (!userName.trim()) {
      alert('Please enter your name')
      return
    }

    if (!id.trim()) {
      alert('Please enter a room ID')
      return
    }

    socket.emit('join-room', { roomId: id, userName })
  }

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const startDrawing = (e) => {
    if (currentTool === 'text') {
      const { x, y } = getMousePos(e)
      setTextInputPos({ x, y })
      setTextInputActive(true)
      return
    }

    setIsDrawing(true)
    const { x, y } = getMousePos(e)
    setStartPoint({ x, y })

    if (currentTool === 'pen' || currentTool === 'eraser') {
      ctxRef.current.beginPath()
      ctxRef.current.moveTo(x, y)
      setTempDrawing({ type: currentTool, points: [{ x, y }], color: currentColor, size: currentSize })
    }
  }

  const draw = (e) => {
    if (!isDrawing) return

    const { x, y } = getMousePos(e)
    const ctx = ctxRef.current

    if (currentTool === 'pen' || currentTool === 'eraser') {
      ctx.lineWidth = currentSize
      ctx.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : currentColor // White for eraser
      ctx.lineTo(x, y)
      ctx.stroke()
      setTempDrawing(prev => ({
        ...prev,
        points: [...prev.points, { x, y }]
      }))
    } else if (currentTool === 'rectangle' || currentTool === 'circle') {
      // Redraw all permanent drawings first
      redrawCanvas(drawings)

      // Draw the temporary shape on top
      ctx.save()
      ctx.strokeStyle = currentColor
      ctx.lineWidth = currentSize
      if (currentTool === 'rectangle') {
        ctx.strokeRect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y)
      } else if (currentTool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2))
        ctx.beginPath()
        ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    const ctx = ctxRef.current

    if (tempDrawing) {
      const drawingData = { ...tempDrawing, id: uuidv4(), userId: socket.id, userName: userName, timestamp: new Date() }
      socket.emit('drawing', drawingData)
      setTempDrawing(null)
    }

    if (currentTool === 'pen' || currentTool === 'eraser') {
      ctx.beginPath()
    }
  }

  const handleTextInputSubmit = () => {
    if (textInputValue.trim() !== '') {
      const drawingData = { type: 'text', x: textInputPos.x, y: textInputPos.y, text: textInputValue, color: currentColor, size: currentSize, id: uuidv4(), userId: socket.id, userName: userName, timestamp: new Date() }
      socket.emit('drawing', drawingData)
      setTextInputValue('')
      setTextInputActive(false)
    }
  }

  const drawShape = (ctx, drawing) => {
    if (!drawing) return
    ctx.strokeStyle = drawing.color
    ctx.lineWidth = drawing.size
    ctx.fillStyle = drawing.color // For filling shapes if needed

    if (drawing.type === 'rectangle') {
      ctx.strokeRect(drawing.x, drawing.y, drawing.width, drawing.height)
    } else if (drawing.type === 'circle') {
      ctx.beginPath()
      ctx.arc(drawing.x, drawing.y, drawing.radius, 0, 2 * Math.PI)
      ctx.stroke()
    } else if (drawing.type === 'text') {
      ctx.font = `${drawing.size * 2}px Arial` // Adjust font size based on brush size
      ctx.fillText(drawing.text, drawing.x, drawing.y)
    }
  }

  const redrawCanvas = (drawingsData) => {
    const ctx = ctxRef.current
    const canvas = canvasRef.current
    if (!ctx || !canvas) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    drawingsData.forEach(drawing => {
      ctx.strokeStyle = drawing.color
      ctx.lineWidth = drawing.size
      ctx.fillStyle = drawing.color

      if (drawing.type === 'pen' || drawing.type === 'eraser') {
        ctx.beginPath()
        ctx.moveTo(drawing.points[0].x, drawing.points[0].y)
        drawing.points.forEach(point => {
          ctx.lineTo(point.x, point.y)
        })
        ctx.stroke()
      } else if (drawing.type === 'rectangle' || drawing.type === 'circle' || drawing.type === 'text') {
        drawShape(ctx, drawing)
      }
    })
  }

  const clearCanvas = () => {
    socket.emit('clear-canvas')
  }

  const undoLastAction = () => {
    socket.emit('undo')
  }

  const downloadCanvas = () => {
    const link = document.createElement('a')
    link.download = `whiteboard-${room?.name || 'drawing'}.png`
    link.href = canvasRef.current.toDataURL()
    link.click()
  }

  const leaveRoom = () => {
    setCurrentView('home')
    setRoom(null)
    setUsers([])
    setDrawings([])
    setRoomId('')
  }

  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Collaborative Whiteboard</h1>
            <p className="text-gray-600">Draw, collaborate, and create together in real-time</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Create New Room
                </CardTitle>
                <CardDescription>
                  Start a new collaborative whiteboard session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Enter your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
                <Button 
                  onClick={createRoom} 
                  className="w-full"
                  disabled={!isConnected}
                >
                  Create Room
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Join Existing Room
                </CardTitle>
                <CardDescription>
                  Join a room using the room ID
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Enter your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
                <Input
                  placeholder="Enter room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                />
                <Button 
                  onClick={() => joinRoom()} 
                  className="w-full"
                  disabled={!isConnected}
                >
                  Join Room
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <Card className="inline-block">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Features</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Drawing Tools
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Real-time Collaboration
                  </div>
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Canvas
                  </div>
                  <div className="flex items-center gap-2">
                    <Undo className="h-4 w-4" />
                    Undo/Redo
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">{room?.name}</h1>
            <Badge variant="outline">Room ID: {room?.id?.slice(0, 8)}</Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="text-sm">{users.length} users</span>
            </div>
            <Button variant="outline" size="sm" onClick={leaveRoom}>
              Leave Room
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="w-16 bg-white border-r border-gray-200 p-2 flex flex-col gap-2">
          <Button
            variant={currentTool === 'pen' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('pen')}
            className="p-2"
          >
            <Palette className="h-4 w-4" />
          </Button>
          
          <Button
            variant={currentTool === 'rectangle' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('rectangle')}
            className="p-2"
          >
            <Square className="h-4 w-4" />
          </Button>
          
          <Button
            variant={currentTool === 'circle' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('circle')}
            className="p-2"
          >
            <Circle className="h-4 w-4" />
          </Button>
          
          <Button
            variant={currentTool === 'text' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('text')}
            className="p-2"
          >
            <Type className="h-4 w-4" />
          </Button>
          
          <Button
            variant={currentTool === 'eraser' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('eraser')}
            className="p-2"
          >
            <Eraser className="h-4 w-4" />
          </Button>

          <Separator />

          <Button
            variant="outline"
            size="sm"
            onClick={undoLastAction}
            className="p-2"
          >
            <Undo className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={clearCanvas}
            className="p-2"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCanvas}
            className="p-2"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-crosshair bg-white"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
          {textInputActive && (
            <input
              type="text"
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleTextInputSubmit()
                }
              }}
              style={{
                position: 'absolute',
                left: textInputPos.x,
                top: textInputPos.y,
                border: '1px solid black',
                padding: '5px',
                background: 'white',
                zIndex: 100,
              }}
              autoFocus
              onBlur={handleTextInputSubmit}
            />
          )}
        </div>

        {/* Properties Panel */}
        <div className="w-64 bg-white border-l border-gray-200 p-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <input
                type="color"
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
                className="w-full h-10 rounded border border-gray-300"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Brush Size</label>
              <input
                type="range"
                min="1"
                max="20"
                value={currentSize}
                onChange={(e) => setCurrentSize(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 mt-1">{currentSize}px</div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-2">Active Users</h3>
              <div className="space-y-2">
                {users.map(user => (
                  <div key={user.id} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    {user.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

