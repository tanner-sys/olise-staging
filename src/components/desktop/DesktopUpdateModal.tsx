import { useDesktopUpdate } from '../../hooks/useDesktopUpdate'
import './DesktopUpdateModal.css'

type DesktopUpdateModalProps = {
  open: boolean
  onClose: () => void
}

export function DesktopUpdateModal({ open, onClose }: DesktopUpdateModalProps) {
  const { updateInfo, status, progress, error, install } = useDesktopUpdate()

  if (!open || !updateInfo) return null

  const isDownloading = status === 'downloading'
  const percent =
    progress?.total && progress.total > 0
      ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
      : null

  return (
    <div className="desktop-update-backdrop" role="presentation" onClick={onClose}>
      <div
        className="desktop-update-modal"
        role="dialog"
        aria-labelledby="desktop-update-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="desktop-update-title" className="desktop-update-title">
          Update available
        </h2>
        <p className="desktop-update-version">
          Olise {updateInfo.version} is ready
          {updateInfo.currentVersion ? ` (you have ${updateInfo.currentVersion})` : ''}.
        </p>
        {updateInfo.notes && <p className="desktop-update-notes">{updateInfo.notes}</p>}

        {isDownloading && (
          <div className="desktop-update-progress" aria-live="polite">
            <div className="desktop-update-progress-bar">
              <div
                className="desktop-update-progress-fill"
                style={{ width: percent != null ? `${percent}%` : '35%' }}
              />
            </div>
            <p className="desktop-update-progress-label">
              {percent != null ? `Downloading… ${percent}%` : 'Downloading update…'}
            </p>
          </div>
        )}

        {error && (
          <p className="desktop-update-error" role="alert">
            {error}
          </p>
        )}

        <div className="desktop-update-actions">
          <button
            type="button"
            className="desktop-update-btn desktop-update-btn--primary"
            onClick={() => void install()}
            disabled={isDownloading}
          >
            {isDownloading ? 'Installing…' : 'Update and restart'}
          </button>
          <button
            type="button"
            className="desktop-update-btn desktop-update-btn--ghost"
            onClick={onClose}
            disabled={isDownloading}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
