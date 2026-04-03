import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { ThumbsUp, Users, TrendingUp } from 'lucide-react'

const CATEGORIES = ['Maintenance','Food','Hygiene','Security','Internet','Noise','Other']
const CAT_COLORS = { Maintenance:'#7c6af7', Food:'#f7a26a', Hygiene:'#6af7c0', Security:'#f76a6a', Internet:'#6ab4f7', Noise:'#f7c26a', Other:'#a0a0b8' }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
      <div style={{ color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => <div key={p.name} style={{ color: p.color || 'var(--accent)' }}>{p.name}: {p.value}</div>)}
    </div>
  )
}

export default function PublicDashboard() {
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0, highPriority: 0 })
  const [overTime, setOverTime] = useState([])
  const [byCategory, setByCategory] = useState([])
  const [byStatus, setByStatus] = useState([])
  const [topComplaints, setTopComplaints] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('complaints').select('*').then(({ data: all }) => {
      if (!all) return
      const resolved = all.filter(c => c.status === 'Resolved').length
      const open = all.filter(c => c.status !== 'Resolved').length
      const highPriority = all.filter(c => c.priority_score >= 8).length
      setStats({ total: all.length, open, resolved, highPriority })

      // Over time (last 30 days)
      const now = new Date()
      const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now)
        d.setDate(d.getDate() - (13 - i))
        return d.toISOString().slice(0, 10)
      })
      const timeMap = {}
      all.forEach(c => { const d = c.created_at.slice(0, 10); timeMap[d] = (timeMap[d] || 0) + 1 })
      setOverTime(days.map(d => ({ date: d.slice(5), count: timeMap[d] || 0 })))

      // By category
      const catMap = {}
      all.forEach(c => { catMap[c.category || 'Other'] = (catMap[c.category || 'Other'] || 0) + 1 })
      setByCategory(CATEGORIES.map(cat => ({ category: cat, count: catMap[cat] || 0 })).filter(x => x.count > 0))

      // By status
      const statMap = {}
      all.forEach(c => { statMap[c.status] = (statMap[c.status] || 0) + 1 })
      setByStatus(Object.entries(statMap).map(([status, count]) => ({ status, count })))

      // Top 5 upvoted/joined
      const sorted = [...all].sort((a, b) => (b.upvotes + b.join_count) - (a.upvotes + a.join_count)).slice(0, 5)
      setTopComplaints(sorted)

      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
        <div>
          <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, color: 'var(--accent)' }}>
            Hostel<span style={{ color: 'var(--text)' }}>Desk</span>
            <span style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 400, marginLeft: 12 }}>Public Dashboard</span>
          </div>
          <div style={{ color: 'var(--text3)', fontSize: 14, marginTop: 4 }}>Live complaint statistics — no login required</div>
        </div>
        <Link to="/login" className="btn btn-primary">Login →</Link>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-label">Total Complaints</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card accent2">
          <div className="stat-label">Open</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.open}</div>
        </div>
        <div className="stat-card accent3">
          <div className="stat-label">Resolved</div>
          <div className="stat-value" style={{ color: 'var(--resolved)' }}>{stats.resolved}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">High Priority</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.highPriority}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid" style={{ marginBottom: 32 }}>
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
              <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                {byCategory.map((entry, i) => (
                  <rect key={i} fill={CAT_COLORS[entry.category] || 'var(--accent)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 15, marginBottom: 20 }}>By Status</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="status" tick={{ fill: 'var(--text3)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="var(--accent2)" name="Count" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top complaints */}
        <div className="card">
          <h2 style={{ fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} /> Top 5 Most Supported
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topComplaints.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: 'var(--text3)', minWidth: 24 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.topic}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', gap: 10, marginTop: 2 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><ThumbsUp size={10} /> {c.upvotes}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Users size={10} /> {c.join_count}</span>
                    <span className="badge badge-category" style={{ padding: '1px 6px', fontSize: 10 }}>{c.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
