import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { PriorityBar } from '../components/StatusBadge'
import AnnouncementBanner from '../components/AnnouncementBanner'
import { PlusCircle, Bell } from 'lucide-react'

export default function Dashboard() {
  const { profile } = useAuth()
  const [complaints, setComplaints] = useState([])
  const [notifications, setNotifications] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, inprogress: 0, resolved: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    Promise.all([
      supabase.from('complaints').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('notifications').select('*').eq('user_id', profile.id).eq('read', false).order('created_at', { ascending: false }).limit(5),
    ]).then(([{ data: c }, { data: n }]) => {
      const complaints = c || []
      setComplaints(complaints)
      setNotifications(n || [])
      setStats({
        total: complaints.length,
        pending: complaints.filter(x => x.status === 'Pending').length,
        inprogress: complaints.filter(x => x.status === 'In Progress').length,
        resolved: complaints.filter(x => x.status === 'Resolved').length,
      })
      setLoading(false)
    })

    // Realtime
    const sub = supabase.channel('dash-complaints')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints', filter: `user_id=eq.${profile.id}` }, payload => {
        if (payload.eventType === 'UPDATE') {
          setComplaints(cs => cs.map(c => c.id === payload.new.id ? payload.new : c))
        }
      }).subscribe()
    return () => supabase.removeChannel(sub)
  }, [profile])

  async function markRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(n => n.filter(x => x.id !== id))
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner" /></div>

  return (
    <div className="fade-in">
      <AnnouncementBanner />

      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {profile?.name?.split(' ')[0]} 👋</h1>
          <div className="page-subtitle">Here's a summary of your complaints</div>
        </div>
        <Link to="/new-complaint" className="btn btn-primary">
          <PlusCircle size={16} /> New Complaint
        </Link>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><div className="stat-label">Total</div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card accent2"><div className="stat-label">Pending</div><div className="stat-value" style={{ color: 'var(--pending)' }}>{stats.pending}</div></div>
        <div className="stat-card" style={{ '--accent': 'var(--inprogress)' }}><div className="stat-label">In Progress</div><div className="stat-value" style={{ color: 'var(--inprogress)' }}>{stats.inprogress}</div></div>
        <div className="stat-card accent3"><div className="stat-label">Resolved</div><div className="stat-value" style={{ color: 'var(--resolved)' }}>{stats.resolved}</div></div>
      </div>

      {/* Recent complaints */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16 }}>Recent Complaints</h2>
          <Link to="/my-complaints" style={{ fontSize: 13, color: 'var(--accent)' }}>View all →</Link>
        </div>
        {complaints.length === 0 ? (
          <div className="empty"><div>No complaints yet</div><Link to="/new-complaint" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>File your first complaint</Link></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {complaints.map(c => (
              <Link key={c.id} to={`/complaint/${c.id}`} style={{
                display: 'block',
                background: 'var(--surface2)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
                border: '1px solid var(--border)',
                textDecoration: 'none',
                transition: 'border-color 0.15s',
              }}
                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>{c.topic}</div>
                    <div style={{ fontSize: 13, color: 'var(--text3)' }}>{c.details?.slice(0, 80)}...</div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                {c.priority_score && (
                  <div style={{ marginTop: 10 }}>
                    <PriorityBar score={c.priority_score} />
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={16} /> Notifications
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.map(n => (
              <div key={n.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                background: 'rgba(124,106,247,0.06)',
                border: '1px solid rgba(124,106,247,0.15)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
              }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{n.type}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{n.message}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => markRead(n.id)} style={{ flexShrink: 0 }}>Dismiss</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
