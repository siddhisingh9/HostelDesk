import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import { Megaphone, Send } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Announcements() {
  const { profile } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', content: '' })
  const [submitting, setSubmitting] = useState(false)

  const isIncharge = profile?.role === 'incharge'

  useEffect(() => {
    supabase.from('announcements').select('*, profiles(name)').order('created_at', { ascending: false })
      .then(({ data }) => { setAnnouncements(data || []); setLoading(false) })

    const sub = supabase.channel('announcements-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, async payload => {
        const { data } = await supabase.from('announcements').select('*, profiles(name)').eq('id', payload.new.id).single()
        if (data) setAnnouncements(a => [data, ...a])
      }).subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  async function handlePost(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) { toast.error('Fill in all fields'); return }
    setSubmitting(true)

    const { error } = await supabase.from('announcements').insert({
      title: form.title.trim(),
      content: form.content.trim(),
      created_by: profile.id,
    })
    if (error) { toast.error(error.message); setSubmitting(false); return }

    // Notify all residents
    const { data: residents } = await supabase.from('profiles').select('id').eq('role', 'resident')
    if (residents?.length) {
      await supabase.from('notifications').insert(residents.map(r => ({
        user_id: r.id,
        type: 'Announcement',
        message: `New announcement: "${form.title}"`,
      })))
    }

    setForm({ title: '', content: '' })
    setSubmitting(false)
    toast.success('Announcement posted and residents notified!')
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner" /></div>

  return (
    <div className="fade-in" style={{ maxWidth: 700 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Announcements</h1>
          <div className="page-subtitle">{isIncharge ? 'Post announcements to all residents' : 'Announcements from hostel incharge'}</div>
        </div>
      </div>

      {/* Post form — incharge only */}
      {isIncharge && (
        <div className="card" style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, marginBottom: 16 }}>Post New Announcement</h2>
          <form onSubmit={handlePost}>
            <div className="input-group">
              <label>Title</label>
              <input className="input" placeholder="Announcement title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="input-group">
              <label>Content</label>
              <textarea className="input" placeholder="Write your announcement..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="spinner" /> : <><Send size={14} /> Post Announcement</>}
            </button>
          </form>
        </div>
      )}

      {/* List */}
      {announcements.length === 0 ? (
        <div className="card empty">
          <Megaphone size={40} />
          <div style={{ marginTop: 8 }}>No announcements yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {announcements.map(a => (
            <div key={a.id} className="card fade-in" style={{
              borderLeft: '3px solid var(--accent2)',
              paddingLeft: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 8 }}>
                <h3 style={{ fontSize: 16, color: 'var(--accent2)' }}>{a.title}</h3>
                <div style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
                  {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 10 }}>
                {a.content}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                Posted by {a.profiles?.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
