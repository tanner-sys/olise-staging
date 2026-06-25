import { Phone } from 'lucide-react'
import type { CrisisResource } from '../../lib/crisisStorage'
import './CrisisCard.css'

type CrisisCardProps = {
  category: string
  resources: CrisisResource[]
  onAcknowledge: () => void
  acknowledging?: boolean
}

function formatCategory(category: string): string {
  return category
    .replace(/^output:/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function CrisisCard({
  category,
  resources,
  onAcknowledge,
  acknowledging = false,
}: CrisisCardProps) {
  return (
    <div className="crisis-overlay" role="alertdialog" aria-labelledby="crisis-title">
      <div className="crisis-card">
        <div className="crisis-card-icon" aria-hidden>
          <Phone size={22} strokeWidth={1.75} />
        </div>
        <h2 id="crisis-title" className="crisis-card-title">
          You deserve real support right now
        </h2>
        <p className="crisis-card-lead">
          Olise is an educational tool — not emergency care or therapy. If you or someone else may
          be in danger, please contact a trained crisis counselor immediately.
        </p>
        <p className="crisis-card-category">Detected concern: {formatCategory(category)}</p>

        <ul className="crisis-resource-list">
          {resources.map((resource) => (
            <li key={resource.label}>
              <a className="crisis-resource-link" href={resource.href}>
                <span className="crisis-resource-label">{resource.label}</span>
                <span className="crisis-resource-detail">{resource.detail}</span>
              </a>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="crisis-ack-btn"
          onClick={onAcknowledge}
          disabled={acknowledging}
        >
          {acknowledging ? 'Saving…' : 'I understand — return to chat'}
        </button>
      </div>
    </div>
  )
}
