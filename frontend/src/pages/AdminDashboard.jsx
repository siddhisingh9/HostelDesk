import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { StatusBadge } from '../components/StatusBadge'
import { PriorityBar } from '../components/StatusBadge'
import { Activity } from 'lucide-react'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
      <div style={{ color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => <div key={p.name} style={{ color: p.color || 'var(--accent)' }}>{p.name}: {p.value}</div>)}
    </div>
  )
}

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, inprogress: 0, resolved: 0, high: 0 })
  const [overTime, setOverTime] = useState([])
  const [byCategory, setByCategory] = useState([])
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('complaints').select('*, profiles(name, room_number)').order('created_at', { ascending: false })
      .then(({ data }) => {
        const all = data || []
        setComplaints(all)
        setRecent(all.slice(0, 6))
        setStats({
          total: all.length,
          pending: all.filter(c => c.status === 'Pending').length,
          inprogress: all.filter(c => c.status === 'In Progress').length,
          resolved: all.filter(c => c.status === 'Resolved').length,
          high: all.filter(c => c.priority_score >= 8).length,
        })

        // Over time
        const now = new Date()
        const days = Array.from({ length: 14 }, (_, i) => {
          const d = new Date(now); d.setDate(d.getDate() - (13 - i))
          return d.toISOString().slice(0, 10)
        })
        const timeMap = {}
        all.forEach(c => { const d = c.created_at.slice(0, 10); timeMap[d] = (timeMap[d] || 0) + 1 })
        setOverTime(days.map(d => ({ date: d.slice(5), count: timeMap[d] || 0 })))

        // By category
        const cats = ['Maintenance','Food','Hygiene','Security','Internet','Noise','Other']
        const catMap = {}
        all.forEach(c => { catMap[c.category || 'Other'] = (catMap[c.category || 'Other'] || 0) + 1 })
        setByCategory(cats.map(cat => ({ category: cat, count: catMap[cat] || 0 })).filter(x => x.count > 0))

        setLoading(false)
      })
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner" /></div>

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Incharge Dashboard</h1>
          <div className="page-subtitle">Overview of all hostel complaints</div>
        </div>
        <Link to="/admin/complaints" className="btn btn-primary">View All Complaints →</Link>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><div className="stat-label">Total</div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card accent2"><div className="stat-label">Pending</div><div className="stat-value" style={{ color: 'var(--pending)' }}>{stats.pending}</div></div>
        <div className="stat-card" style={{'--accent': 'var(--inprogress)'}}><div className="stat-label">In Progress</div><div className="stat-value" style={{ color: 'var(--inprogress)' }}>{stats.inprogress}</div></div>
        <div className="stat-card accent3"><div className="stat-label">Resolved</div><div className="stat-value" style={{ color: 'var(--resolved)' }}>{stats.resolved}</div></div>
        <div className="stat-card danger"><div className="stat-label">High Priority</div><div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.high}</div></div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <h2 style={{ fontSize: 15, marginBottom: 20 }}>Complaints Over Time (14 days)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={overTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text3)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2} dot={false} name="Complaints" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 15, marginBottom: 20 }}>By Category</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="category" tick={{ fill: 'var(--text3)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="var(--accent)" name="Count" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <h2 style={{ fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={16} /> Recent Complaints
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recent.map(c => (
            <Link key={c.id} to={`/complaint/${c.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', gap: 14, alignItems: 'center',
                padding: '12px 16px', background: 'var(--surface2)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                transition: 'border-color 0.15s',
              }}
                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.topic}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                    {c.profiles?.name} · Room {c.profiles?.room_number} · {new Date(c.created_at).toLocaleDateString('en-IN')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  {c.priority_score && <PriorityBar score={c.priority_score} />}
                  <StatusBadge status={c.status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
