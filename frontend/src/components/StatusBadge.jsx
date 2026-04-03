// StatusBadge.jsx
export function StatusBadge({ status }) {
  const map = {
    'Pending': 'badge-pending',
    'In Progress': 'badge-inprogress',
    'Resolved': 'badge-resolved',
  }
  return <span className={`badge ${map[status] || ''}`}>{status}</span>
}

// PriorityBar.jsx
export function PriorityBar({ score }) {
  const color = score >= 8 ? 'var(--danger)' : score >= 5 ? 'var(--warning)' : 'var(--success)'
  const label = score >= 8 ? 'High' : score >= 5 ? 'Medium' : 'Low'
  const cls = score >= 8 ? 'badge-priority-high' : score >= 5 ? 'badge-priority-mid' : 'badge-priority-low'
  return (
    <div className="priority-bar-wrap">
      <span className={`badge ${cls}`}>{label}</span>
      <div className="priority-bar-bg">
        <div className="priority-bar-fill" style={{ width: `${(score / 10) * 100}%`, background: color }} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--text3)', minWidth: 24 }}>{score}/10</span>
    </div>
  )
}
