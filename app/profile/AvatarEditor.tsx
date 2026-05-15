'use client'

import { useRef, useState, useCallback } from 'react'

const AVATAR_EDITOR_SIZE = 240
const AVATAR_EXPORT_SIZE = 512
const AVATAR_THUMB_SIZE = 160

interface EditorState {
  file: File
  imageUrl: string
  width: number
  height: number
  rotation: number
  minScale: number
  scale: number
  position: { x: number; y: number }
}

interface AvatarEditorProps {
  editorState: EditorState
  onChange: (state: EditorState) => void
  onClose: () => void
  onConfirm: () => void
  uploading: boolean
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getRotationDimensions(imageWidth: number, imageHeight: number, rotation: number) {
  if (rotation % 180 === 0) {
    return { width: imageWidth, height: imageHeight }
  }
  return { width: imageHeight, height: imageWidth }
}

function getMinScale(imageWidth: number, imageHeight: number, rotation = 0) {
  const rotated = getRotationDimensions(imageWidth, imageHeight, rotation)
  return Math.max(AVATAR_EDITOR_SIZE / rotated.width, AVATAR_EDITOR_SIZE / rotated.height)
}

function clampPosition(
  position: { x: number; y: number },
  imageWidth: number,
  imageHeight: number,
  scale: number,
  rotation = 0
) {
  const rotated = getRotationDimensions(imageWidth, imageHeight, rotation)
  const scaledWidth = rotated.width * scale
  const scaledHeight = rotated.height * scale
  const maxX = Math.max(0, (scaledWidth - AVATAR_EDITOR_SIZE) / 2)
  const maxY = Math.max(0, (scaledHeight - AVATAR_EDITOR_SIZE) / 2)

  return {
    x: clamp(position.x, -maxX, maxX),
    y: clamp(position.y, -maxY, maxY),
  }
}

export async function buildResizedAvatarBlob(editorState: EditorState, outputSize: number): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Image editing is not available in this browser.')
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not prepare the resized image.'))
    img.src = editorState.imageUrl
  })

  const exportRatio = outputSize / AVATAR_EDITOR_SIZE

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, outputSize, outputSize)
  context.translate(
    outputSize / 2 + editorState.position.x * exportRatio,
    outputSize / 2 + editorState.position.y * exportRatio,
  )
  context.rotate((editorState.rotation * Math.PI) / 180)
  context.scale(editorState.scale * exportRatio, editorState.scale * exportRatio)
  context.drawImage(
    image,
    -editorState.width / 2,
    -editorState.height / 2,
    editorState.width,
    editorState.height,
  )

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error('Could not export the resized image.'))
        return
      }
      resolve(result)
    }, 'image/jpeg', 0.9)
  })

  return new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' })
}

export function readImageDimensions(file: File): Promise<{ imageUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      resolve({
        imageUrl,
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
    }

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl)
      reject(new Error('Could not load that image. Please try another file.'))
    }

    image.src = imageUrl
  })
}

export function createInitialEditorState(file: File, imageUrl: string, width: number, height: number): EditorState {
  const rotation = 0
  const minScale = getMinScale(width, height, rotation)
  return {
    file,
    imageUrl,
    width,
    height,
    rotation,
    minScale,
    scale: minScale,
    position: { x: 0, y: 0 },
  }
}

export default function AvatarEditor({ editorState, onChange, onClose, onConfirm, uploading }: AvatarEditorProps) {
  const dragStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    position: { x: number; y: number }
  } | null>(null)

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextScale = Number(e.target.value)
    onChange({
      ...editorState,
      scale: nextScale,
      position: clampPosition(editorState.position, editorState.width, editorState.height, nextScale, editorState.rotation),
    })
  }

  const handleRotate = () => {
    const rotation = (editorState.rotation + 90) % 360
    const minScale = getMinScale(editorState.width, editorState.height, rotation)
    const scale = Math.max(editorState.scale, minScale)
    onChange({
      ...editorState,
      rotation,
      minScale,
      scale,
      position: clampPosition(editorState.position, editorState.width, editorState.height, scale, rotation),
    })
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (uploading) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      position: editorState.position,
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== e.pointerId) return
    const deltaX = e.clientX - dragStateRef.current.startX
    const deltaY = e.clientY - dragStateRef.current.startY
    onChange({
      ...editorState,
      position: clampPosition(
        { x: dragStateRef.current.position.x + deltaX, y: dragStateRef.current.position.y + deltaY },
        editorState.width,
        editorState.height,
        editorState.scale,
        editorState.rotation,
      ),
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== e.pointerId) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragStateRef.current = null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Edit Profile Photo</h3>

        {/* Editor Canvas */}
        <div
          className="relative mx-auto mb-4 overflow-hidden rounded-xl bg-slate-100 dark:bg-gray-700 cursor-move"
          style={{ width: AVATAR_EDITOR_SIZE, height: AVATAR_EDITOR_SIZE }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div
            className="absolute"
            style={{
              width: editorState.width * editorState.scale,
              height: editorState.height * editorState.scale,
              left: AVATAR_EDITOR_SIZE / 2 + editorState.position.x - (editorState.width * editorState.scale) / 2,
              top: AVATAR_EDITOR_SIZE / 2 + editorState.position.y - (editorState.height * editorState.scale) / 2,
              transform: `rotate(${editorState.rotation}deg)`,
            }}
          >
            <img
              src={editorState.imageUrl}
              alt="Edit"
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
          <div className="absolute inset-0 border-2 border-white/50 rounded-xl pointer-events-none" />
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-gray-300">Zoom</label>
            <input
              type="range"
              min={editorState.minScale}
              max={editorState.minScale * 3}
              step={0.01}
              value={editorState.scale}
              onChange={handleScaleChange}
              className="w-full mt-1"
            />
          </div>

          <button
            onClick={handleRotate}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Rotate 90°
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={uploading}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={uploading}
            className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? 'Uploading...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export { AVATAR_EXPORT_SIZE, AVATAR_THUMB_SIZE }
