import { ChevronDown, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { displayChildName, childChatScopeLabel } from '../../lib/children'
import type { ChildProfile } from '../../types/database'
import './ChatProjectControl.css'

type ChatProjectControlProps = {
  childId: string | null
  children: ChildProfile[]
  busy?: boolean
  onAssignChild: (childId: string) => void
  onRemoveFromChild: () => void
}

export function ChatProjectControl({
  childId,
  children: childProfiles,
  busy = false,
  onAssignChild,
  onRemoveFromChild,
}: ChatProjectControlProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const attachedChild = childId
    ? childProfiles.find((child) => child.id === childId)
    : undefined

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  if (childProfiles.length === 0) return null

  const label = attachedChild
    ? childChatScopeLabel(displayChildName(attachedChild))
    : 'General chat'

  return (
    <div className="chat-project-control" ref={rootRef}>
      <button
        type="button"
        className={`chat-project-control-btn ${attachedChild ? 'chat-project-control-btn--attached' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
      >
        <User size={13} strokeWidth={1.75} />
        <span>{label}</span>
        <ChevronDown size={12} strokeWidth={2} />
      </button>

      {open && (
        <div className="chat-project-control-menu" role="menu">
          {attachedChild ? (
            <button
              type="button"
              className="chat-project-control-menu-item"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onRemoveFromChild()
              }}
            >
              Remove from child
            </button>
          ) : (
            childProfiles.map((child) => (
              <button
                key={child.id}
                type="button"
                className="chat-project-control-menu-item"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onAssignChild(child.id)
                }}
              >
                Add to {displayChildName(child)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
