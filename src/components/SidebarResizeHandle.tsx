import './SidebarResizeHandle.css'

type SidebarResizeHandleProps = {
  onResizeStart: (clientX: number) => void
}

export function SidebarResizeHandle({ onResizeStart }: SidebarResizeHandleProps) {
  return (
    <button
      type="button"
      className="sidebar-resize-handle"
      aria-label="Resize sidebar"
      onMouseDown={(event) => {
        event.preventDefault()
        onResizeStart(event.clientX)
      }}
    />
  )
}
