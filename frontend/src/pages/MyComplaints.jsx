import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { PriorityBar } from '../components/StatusBadge'
import { FileText, PlusCircle } from 'lucide-react'

export default function MyComplaints() {
  const { profile } = useAuth()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    if (!profile) return
    supabase.from('complaints').select('*').eq('user_id', profile.id).order('created_at', { ascending: false })
      .then(({ data }) => { setComplaints(data || []); setLoading(false) })

    const sub = supabase.channel('my-complaints-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints', filter: `user_id=eq.${profile.id}` }, payload => {
        if (payload.eventType === 'UPDATE') setComplaints(cs => cs.map(c => c.id === payload.new.id ? payload.new : c))
        if (payload.eventType === 'INSERT') setComplaints(cs => [payload.new, ...cs])
        if (payload.eventType === 'DELETE') setComplaints(cs => cs.filter(c => c.id !== payload.old.id))
      }).subscribe()
    return () => supabase.removeChannel(sub)
  }, [profile])

  const statuses = ['All', 'Pending', 'In Progress', 'Resolved']
  const filtered = filter === 'All' ? complaints : complaints.filter(c => c.status === filter)

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner" /></div>

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Complaints</h1>
          <div className="page-subtitle">{complaints.length} total complaint{complaints.length !== 1 ? 's' : ''}</div>
        </div>
        <Link to="/new-complaint" className="btn btn-primary"><PlusCircle size={15} /> New Complaint</Link>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)} className="btn btn-sm"
            style={{
              background: filter === s ? 'var(--accent)' : 'var(--surface)',
              color: filter === s ? 'white' : 'var(--text2)',
              border: `1px solid ${filter === s ? 'var(--accent)' : 'var(--border)'}`,
            }}>
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card empty">
          <FileText size={40} />
          <div style={{ marginTop: 8 }}>No complaints {filter !== 'All' ? `with status "${filter}"` : 'yet'}</div>
          <Link to="/new-complaint" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>File a Complaint</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(c => (
            <Link key={c.id} to={`/complaint/${c.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ transition: 'border-color 0.15s, transform 0.15s', cursor: 'pointer' }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{c.topic}</div>
                    <div style={{ fontSize: 13, color: 'var(--text3)' }}>{c.details?.slice(0, 100)}{c.details?.length > 100 ? '...' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <StatusBadge status={c.status} />
                    {c.category && <span className="badge badge-category">{c.category}</span>}
                  </div>
                </div>
                {c.priority_score && (
                  <div style={{ marginBottom: 10 }}>
                    <PriorityBar score={c.priority_score} />
                  </div>
                )}
                {c.ai_summary && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>AI: </span>{c.ai_summary}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
                  {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {c.is_public && <span style={{ marginLeft: 8, color: 'var(--accent)' }}>· Public</span>}
                  {c.join_count > 0 && <span style={{ marginLeft: 8 }}>· {c.join_count} joined</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
