import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import toast from 'react-hot-toast'
import { Sparkles, RefreshCw, Users } from 'lucide-react'

const API = import.meta.env.VITE_BACKEND_URL

export default function NewComplaint() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ topic: '', details: '', isPublic: false })
  const [aiResult, setAiResult] = useState(null)
  const [rewrite, setRewrite] = useState(null)
  const [duplicate, setDuplicate] = useState(null)
  const [openComplaints, setOpenComplaints] = useState([])
  const [step, setStep] = useState('form') // form | ai-review | submit
  const [loading, setLoading] = useState({ analyze: false, rewrite: false, submit: false })

  useEffect(() => {
    // Fetch open complaints for duplicate detection
    supabase.from('complaints').select('id, topic, details, title').neq('status', 'Resolved').limit(20)
      .then(({ data }) => setOpenComplaints(data || []))
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleAnalyze(e) {
    e.preventDefault()
    if (!form.topic || !form.details) { toast.error('Please fill in topic and details'); return }
    setLoading(l => ({ ...l, analyze: true }))

    try {
      // Run analyze and duplicate detection in parallel
      const [analyzeRes, dupRes] = await Promise.all([
        fetch(`${API}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: form.topic, details: form.details }),
        }).then(r => r.json()),
        openComplaints.length > 0 ? fetch(`${API}/detect-duplicate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            new_complaint: { topic: form.topic, details: form.details },
            open_complaints: openComplaints.map(c => ({ id: c.id, title: c.topic, topic: c.topic, details: c.details || '' })),
          }),
        }).then(r => r.json()) : Promise.resolve({ is_duplicate: false }),
      ])

      setAiResult(analyzeRes)
      if (dupRes.is_duplicate) setDuplicate(dupRes)
      setStep('ai-review')
    } catch (err) {
      toast.error('AI analysis failed. Check backend connection.')
      console.error(err)
    }
    setLoading(l => ({ ...l, analyze: false }))
  }

  async function handleRewrite() {
    setLoading(l => ({ ...l, rewrite: true }))
    try {
      const res = await fetch(`${API}/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: form.topic, details: form.details }),
      })
      const data = await res.json()
      setRewrite(data)
    } catch {
      toast.error('Rewrite failed')
    }
    setLoading(l => ({ ...l, rewrite: false }))
  }

  function acceptRewrite() {
    setForm(f => ({ ...f, topic: rewrite.rewritten_topic, details: rewrite.rewritten_details }))
    setRewrite(null)
    setAiResult(null)
    setStep('form')
    toast.success('Rewrite accepted! Re-analyze to update AI results.')
  }

  async function joinComplaint(complaintId) {
    const { error } = await supabase.from('complaint_joins').insert({ complaint_id: complaintId, user_id: profile.id })
    if (error && error.code !== '23505') { toast.error('Failed to join complaint'); return }
    toast.success('Joined complaint successfully!')
    navigate('/my-complaints')
  }

  async function handleSubmit() {
    setLoading(l => ({ ...l, submit: true }))
    const { error } = await supabase.from('complaints').insert({
      user_id: profile.id,
      title: form.topic,
      topic: form.topic,
      details: form.details,
      is_public: form.isPublic,
      category: aiResult?.category || 'Other',
      priority_score: aiResult?.priority_score || null,
      priority_reason: aiResult?.priority_reason || null,
      ai_summary: aiResult?.ai_summary || null,
    })
    setLoading(l => ({ ...l, submit: false }))
    if (error) { toast.error(error.message); return }
    toast.success('Complaint submitted!')
    navigate('/my-complaints')
  }

  return (
    <div className="fade-in" style={{ maxWidth: 680 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">New Complaint</h1>
          <div className="page-subtitle">Describe your issue and let AI help categorize it</div>
        </div>
      </div>

      {/* Duplicate warning */}
      {duplicate && (
        <div style={{
          background: 'rgba(247,194,106,0.1)',
          border: '1px solid rgba(247,194,106,0.3)',
          borderRadius: 'var(--radius)',
          padding: '16px 20px',
          marginBottom: 20,
        }}>
          <div style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} /> Similar Complaint Found
          </div>
          <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 12 }}>{duplicate.reason}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => joinComplaint(duplicate.similar_complaint_id)}>
              Join Existing Complaint
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setDuplicate(null)}>
              File New Anyway
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <form onSubmit={step === 'form' ? handleAnalyze : e => e.preventDefault()}>
          <div className="input-group">
            <label>Your Name</label>
            <input className="input" value={profile?.name || ''} disabled style={{ opacity: 0.6 }} />
          </div>
          <div className="input-group">
            <label>Topic / Subject *</label>
            <input className="input" placeholder="e.g. Water not coming in Room A-201" value={form.topic} onChange={e => set('topic', e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Details *</label>
            <textarea className="input" placeholder="Describe the issue in detail..." value={form.details} onChange={e => set('details', e.target.value)} required rows={5} />
          </div>

          <div className="toggle-row" onClick={() => set('isPublic', !form.isPublic)}>
            <div className={`toggle ${form.isPublic ? 'on' : ''}`} />
            <span style={{ fontSize: 14, color: 'var(--text2)' }}>
              Make public (visible in Discussions — others can upvote & join)
            </span>
          </div>

          {step === 'form' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={loading.analyze}>
                {loading.analyze ? <span className="spinner" /> : <><Sparkles size={15} /> Analyze & Continue</>}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleRewrite} disabled={loading.rewrite || !form.topic || !form.details}>
                {loading.rewrite ? <span className="spinner" /> : <><RefreshCw size={14} /> AI Rewrite</>}
              </button>
            </div>
          )}
        </form>

        {/* Rewrite suggestion */}
        {rewrite && (
          <div className="ai-box" style={{ marginTop: 16 }}>
            <div className="ai-box-header"><Sparkles size={13} /> AI Rewrite Suggestion</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Original</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', background: 'var(--surface2)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{form.topic}</div>
                  <div>{form.details}</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Suggested</div>
                <div style={{ fontSize: 13, color: 'var(--text)', background: 'rgba(124,106,247,0.08)', padding: 12, borderRadius: 8, border: '1px solid rgba(124,106,247,0.2)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{rewrite.rewritten_topic}</div>
                  <div>{rewrite.rewritten_details}</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={acceptRewrite}>Accept</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setRewrite(null)}>Dismiss</button>
            </div>
          </div>
        )}

        {/* AI Results */}
        {aiResult && step === 'ai-review' && (
          <div className="ai-box" style={{ marginTop: 16 }}>
            <div className="ai-box-header"><Sparkles size={13} /> AI Analysis Results</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>CATEGORY</div>
                <span className="badge badge-category">{aiResult.category}</span>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>PRIORITY</div>
                <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18 }}>{aiResult.priority_score}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text3)' }}>/10</span></span>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>PRIORITY REASON</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>{aiResult.priority_reason}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>AI SUMMARY</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>{aiResult.ai_summary}</div>
            </div>
          </div>
        )}

        {step === 'ai-review' && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading.submit}>
              {loading.submit ? <span className="spinner" /> : 'Submit Complaint'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setStep('form'); setAiResult(null); setDuplicate(null) }}>
              Edit
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
