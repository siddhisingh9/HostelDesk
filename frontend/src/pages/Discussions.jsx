import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { PriorityBar } from '../components/StatusBadge'
import { ThumbsUp, Users, ArrowUpDown } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Discussions() {
  const { profile } = useAuth()
  const [complaints, setComplaints] = useState([])
  const [myUpvotes, setMyUpvotes] = useState(new Set())
  const [myJoins, setMyJoins] = useState(new Set())
  const [sort, setSort] = useState('upvotes')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('complaints').select('*, profiles(name, room_number)').eq('is_public', true).order('created_at', { ascending: false }),
      supabase.from('upvotes').select('complaint_id').eq('user_id', profile.id),
      supabase.from('complaint_joins').select('complaint_id').eq('user_id', profile.id),
    ]).then(([{ data: c }, { data: u }, { data: j }]) => {
      setComplaints(c || [])
      setMyUpvotes(new Set((u || []).map(x => x.complaint_id)))
      setMyJoins(new Set((j || []).map(x => x.complaint_id)))
      setLoading(false)
    })
  }, [profile])

  async function toggleUpvote(complaintId) {
    const hasUpvoted = myUpvotes.has(complaintId)
    if (hasUpvoted) {
      await supabase.from('upvotes').delete().eq('complaint_id', complaintId).eq('user_id', profile.id)
      setMyUpvotes(s => { const n = new Set(s); n.delete(complaintId); return n })
      setComplaints(cs => cs.map(c => c.id === complaintId ? { ...c, upvotes: c.upvotes - 1 } : c))
    } else {
      const { error } = await supabase.from('upvotes').insert({ complaint_id: complaintId, user_id: profile.id })
      if (error) { toast.error('Failed to upvote'); return }
      setMyUpvotes(s => new Set([...s, complaintId]))
      setComplaints(cs => cs.map(c => c.id === complaintId ? { ...c, upvotes: c.upvotes + 1 } : c))
    }
  }

  async function joinComplaint(complaintId) {
    if (myJoins.has(complaintId)) { toast('You already joined this complaint'); return }
    const { error } = await supabase.from('complaint_joins').insert({ complaint_id: complaintId, user_id: profile.id })
    if (error && error.code !== '23505') { toast.error('Failed to join'); return }
    setMyJoins(s => new Set([...s, complaintId]))
    setComplaints(cs => cs.map(c => c.id === complaintId ? { ...c, join_count: (c.join_count || 0) + 1 } : c))
    toast.success('Joined complaint!')
  }

  const sortOptions = [
    { value: 'upvotes', label: 'Most Upvoted' },
    { value: 'join_count', label: 'Most Joined' },
    { value: 'priority_score', label: 'Priority' },
    { value: 'created_at', label: 'Newest' },
  ]

  const sorted = [...complaints].sort((a, b) => {
    if (sort === 'created_at') return new Date(b.created_at) - new Date(a.created_at)
    return (b[sort] || 0) - (a[sort] || 0)
  })

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner" /></div>

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Discussions</h1>
          <div className="page-subtitle">Public complaints — upvote or join to show support</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowUpDown size={14} style={{ color: 'var(--text3)' }} />
          <select className="input" style={{ width: 'auto' }} value={sort} onChange={e => setSort(e.target.value)}>
            {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="card empty"><div>No public complaints yet</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sorted.map(c => {
            const owned = c.user_id === profile.id
            const joined = myJoins.has(c.id)
            const upvoted = myUpvotes.has(c.id)
            return (
              <div key={c.id} className="card fade-in">
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  {/* Upvote column */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 48 }}>
                    <button
                      onClick={() => toggleUpvote(c.id)}
                      disabled={owned}
                      style={{
                        background: upvoted ? 'rgba(124,106,247,0.2)' : 'var(--surface2)',
                        border: `1px solid ${upvoted ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 10px',
                        cursor: owned ? 'default' : 'pointer',
                        color: upvoted ? 'var(--accent)' : 'var(--text3)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        transition: 'all 0.15s',
                      }}
                    >
                      <ThumbsUp size={15} />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{c.upvotes || 0}</span>
                    </button>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                      <StatusBadge status={c.status} />
                      {c.category && <span className="badge badge-category">{c.category}</span>}
                    </div>
                    <Link to={`/complaint/${c.id}`} style={{ textDecoration: 'none' }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>{c.topic}</h3>
                    </Link>
                    <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 10 }}>
                      {c.details?.slice(0, 120)}{c.details?.length > 120 ? '...' : ''}
                    </div>

                    {c.priority_score && <div style={{ marginBottom: 10 }}><PriorityBar score={c.priority_score} /></div>}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text3)' }}>
                      <span>By {c.profiles?.name} · Room {c.profiles?.room_number}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Users size={12} /> {c.join_count || 0} joined
                      </span>
                      <span>{new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>

                  {/* Join button */}
                  {!owned && (
                    <button
                      className={`btn btn-sm ${joined ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => joinComplaint(c.id)}
                      disabled={joined}
                      style={{ flexShrink: 0, alignSelf: 'center' }}
                    >
                      <Users size={13} /> {joined ? 'Joined' : 'Join'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
