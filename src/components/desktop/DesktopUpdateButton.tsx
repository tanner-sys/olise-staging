import { useState } from 'react'
import { useDesktopUpdate } from '../../hooks/useDesktopUpdate'
import { DesktopUpdateModal } from './DesktopUpdateModal'
import './DesktopUpdateButton.css'

export function DesktopUpdateButton() {
  const { enabled, updateAvailable } = useDesktopUpdate()
  const [modalOpen, setModalOpen] = useState(false)

  if (!enabled || !updateAvailable) return null

  return (
    <>
      <button
        type="button"
        className="sidebar-update-btn"
        onClick={() => setModalOpen(true)}
        aria-label="Install app update"
      >
        Update
      </button>
      <DesktopUpdateModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
