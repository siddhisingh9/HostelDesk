import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Megaphone, X } from 'lucide-react'

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([])
  const [dismissed, setDismissed] = useState([])

  useEffect(() => {
    supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setAnnouncements(data || []))
  }, [])

  const visible = announcements.filter(a => !dismissed.includes(a.id))
  if (!visible.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
      {visible.map(a => (
        <div key={a.id} style={{
          background: 'rgba(247,162,106,0.1)',
          border: '1px solid rgba(247,162,106,0.3)',
          borderRadius: 'var(--radius)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}>
          <Megaphone size={16} style={{ color: 'var(--accent2)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent2)' }}>{a.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{a.content}</div>
          </div>
          <button className="btn-ghost" style={{ padding: 4, borderRadius: 4, color: 'var(--text3)' }} onClick={() => setDismissed(d => [...d, a.id])}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
