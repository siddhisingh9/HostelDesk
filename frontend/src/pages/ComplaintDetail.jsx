import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import { StatusBadge } from '../components/StatusBadge'
import { PriorityBar } from '../components/StatusBadge'
import { Clock, Users, ChevronLeft, Sparkles, Send } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ComplaintDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [complaint, setComplaint] = useState(null)
  const [updates, setUpdates] = useState([])
  const [joinedUsers, setJoinedUsers] = useState([])
  const [newUpdate, setNewUpdate] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)

  const isIncharge = profile?.role === 'incharge'

  useEffect(() => {
    Promise.all([
      supabase.from('complaints').select('*').eq('id', id).single(),
      supabase.from('progress_updates').select('*, profiles(name)').eq('complaint_id', id).order('created_at'),
      supabase.from('complaint_joins').select('*, profiles(name, room_number)').eq('complaint_id', id),
    ]).then(([{ data: c }, { data: u }, { data: j }]) => {
      setComplaint(c)
      setUpdates(u || [])
      setJoinedUsers(j || [])
      setLoading(false)
    })

    // Realtime progress updates
    const sub = supabase.channel(`complaint-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'progress_updates', filter: `complaint_id=eq.${id}` }, async payload => {
        const { data } = await supabase.from('progress_updates').select('*, profiles(name)').eq('id', payload.new.id).single()
        if (data) setUpdates(u => [...u, data])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'complaints', filter: `id=eq.${id}` }, payload => {
        setComplaint(payload.new)
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [id])

  async function handleStatusChange(newStatus) {
    setStatusLoading(true)
    const { error } = await supabase.from('complaints').update({ status: newStatus }).eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success(`Status updated to ${newStatus}`)
      // Create notifications for owner + joined users
      const userIds = [complaint.user_id, ...joinedUsers.map(j => j.user_id)].filter((v, i, a) => a.indexOf(v) === i)
      await supabase.from('notifications').insert(userIds.map(uid => ({
        user_id: uid,
        type: 'Status Update',
        message: `Your complaint "${complaint.topic}" is now ${newStatus}.`,
      })))
    }
    setStatusLoading(false)
  }

  async function handleAddUpdate() {
    if (!newUpdate.trim()) return
    setSubmitting(true)
    const { error } = await supabase.from('progress_updates').insert({
      complaint_id: id,
      message: newUpdate.trim(),
      updated_by: profile.id,
    })
    if (error) { toast.error(error.message); setSubmitting(false); return }

    // Notify all joined + owner
    const userIds = [complaint.user_id, ...joinedUsers.map(j => j.user_id)].filter((v, i, a) => a.indexOf(v) === i)
    await supabase.from('notifications').insert(userIds.map(uid => ({
      user_id: uid,
      type: 'Progress Update',
      message: `New update on "${complaint.topic}": ${newUpdate.slice(0, 80)}`,
    })))

    setNewUpdate('')
    setSubmitting(false)
    toast.success('Update posted')
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner" /></div>
  if (!complaint) return <div className="card empty">Complaint not found</div>

  const statusFlow = ['Pending', 'In Progress', 'Resolved']
  const currentIdx = statusFlow.indexOf(complaint.status)

  return (
    <div className="fade-in" style={{ maxWidth: 760 }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>
        <ChevronLeft size={15} /> Back
      </button>

      {/* Header */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, marginBottom: 8 }}>{complaint.topic}</h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <StatusBadge status={complaint.status} />
              {complaint.category && <span className="badge badge-category">{complaint.category}</span>}
              {complaint.is_public && <span className="badge" style={{ background: 'rgba(106,247,192,0.1)', color: 'var(--accent3)' }}>Public</span>}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'right', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} />
              {new Date(complaint.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            {complaint.join_count > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Users size={12} /> {complaint.join_count} joined
              </div>
            )}
          </div>
        </div>

        <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 16, fontSize: 14, color: 'var(--text2)', lineHeight: 1.7 }}>
          {complaint.details}
        </div>

        {complaint.priority_score && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>PRIORITY</div>
            <PriorityBar score={complaint.priority_score} />
            {complaint.priority_reason && (
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
                <span style={{ color: 'var(--text3)' }}>Reason: </span>{complaint.priority_reason}
              </div>
            )}
          </div>
        )}

        {complaint.ai_summary && (
          <div className="ai-box">
            <div className="ai-box-header"><Sparkles size={13} /> AI Summary</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>{complaint.ai_summary}</div>
          </div>
        )}
      </div>

      {/* Incharge controls */}
      {isIncharge && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, marginBottom: 16 }}>Incharge Controls</h2>

          {/* Status stepper */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>CHANGE STATUS</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {statusFlow.map((s, i) => (
                <button key={s} className="btn btn-sm"
                  onClick={() => handleStatusChange(s)}
                  disabled={statusLoading || complaint.status === s}
                  style={{
                    background: complaint.status === s ? 'var(--accent)' : 'var(--surface2)',
                    color: complaint.status === s ? 'white' : 'var(--text2)',
                    border: `1px solid ${complaint.status === s ? 'var(--accent)' : 'var(--border)'}`,
                    opacity: i < currentIdx ? 0.5 : 1,
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Add progress update */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>ADD PROGRESS UPDATE</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <textarea className="input" placeholder="Describe progress made..." value={newUpdate}
                onChange={e => setNewUpdate(e.target.value)} rows={2} style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={handleAddUpdate} disabled={submitting || !newUpdate.trim()} style={{ alignSelf: 'flex-end' }}>
                {submitting ? <span className="spinner" /> : <Send size={15} />}
              </button>
            </div>
          </div>

          {/* Joined residents */}
          {joinedUsers.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>JOINED RESIDENTS ({joinedUsers.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {joinedUsers.map(j => (
                  <div key={j.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: 13 }}>
                    {j.profiles?.name} {j.profiles?.room_number && <span style={{ color: 'var(--text3)' }}>· Room {j.profiles.room_number}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress timeline */}
      <div className="card">
        <h2 style={{ fontSize: 15, marginBottom: 20 }}>Progress Timeline</h2>
        {updates.length === 0 ? (
          <div style={{ color: 'var(--text3)', fontSize: 14 }}>No updates yet.</div>
        ) : (
          <div className="timeline">
            {updates.map((u, i) => (
              <div key={u.id} className="timeline-item">
                <div className="timeline-dot">
                  <Clock size={13} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="timeline-content">
                  <div className="timeline-date">
                    {new Date(u.created_at).toLocaleString('en-IN')} · {u.profiles?.name}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text2)', background: 'var(--surface2)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginTop: 4 }}>
                    {u.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
