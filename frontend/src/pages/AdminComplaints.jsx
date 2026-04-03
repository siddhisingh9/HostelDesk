import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { PriorityBar } from '../components/StatusBadge'
import { Search, ChevronUp, ChevronDown, ThumbsUp, Users } from 'lucide-react'

const STATUSES = ['All', 'Pending', 'In Progress', 'Resolved']
const CATEGORIES = ['All', 'Maintenance', 'Food', 'Hygiene', 'Security', 'Internet', 'Noise', 'Other']
const PRIORITIES = ['All', 'High (8-10)', 'Medium (4-7)', 'Low (1-3)']

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    supabase.from('complaints').select('*, profiles(name, room_number)').order('created_at', { ascending: false })
      .then(({ data }) => { setComplaints(data || []); setLoading(false) })
  }, [])

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function SortIcon({ col }) {
    if (sortKey !== col) return <ChevronUp size={12} style={{ opacity: 0.2 }} />
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  const filtered = complaints.filter(c => {
    if (statusFilter !== 'All' && c.status !== statusFilter) return false
    if (categoryFilter !== 'All' && c.category !== categoryFilter) return false
    if (priorityFilter !== 'All') {
      const s = c.priority_score || 0
      if (priorityFilter === 'High (8-10)' && s < 8) return false
      if (priorityFilter === 'Medium (4-7)' && (s < 4 || s > 7)) return false
      if (priorityFilter === 'Low (1-3)' && s > 3) return false
    }
    if (search) {
      const q = search.toLowerCase()
      if (!c.topic?.toLowerCase().includes(q) && !c.profiles?.name?.toLowerCase().includes(q) && !c.category?.toLowerCase().includes(q)) return false
    }
    return true
  }).sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey]
    if (sortKey === 'profiles') { va = a.profiles?.name || ''; vb = b.profiles?.name || '' }
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    return sortDir === 'asc' ? (va || 0) - (vb || 0) : (vb || 0) - (va || 0)
  })

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner" /></div>

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">All Complaints</h1>
          <div className="page-subtitle">{filtered.length} of {complaints.length} complaints</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input className="input" placeholder="Search by name, topic, category…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
          </div>
          <select className="input" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="input" style={{ width: 'auto' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="input" style={{ width: 'auto' }} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th onClick={() => toggleSort('profiles')}>Resident <SortIcon col="profiles" /></th>
                <th onClick={() => toggleSort('topic')}>Topic <SortIcon col="topic" /></th>
                <th onClick={() => toggleSort('category')}>Category <SortIcon col="category" /></th>
                <th onClick={() => toggleSort('priority_score')}>Priority <SortIcon col="priority_score" /></th>
                <th onClick={() => toggleSort('join_count')}><Users size={12} /> Joined <SortIcon col="join_count" /></th>
                <th onClick={() => toggleSort('upvotes')}><ThumbsUp size={12} /> Votes <SortIcon col="upvotes" /></th>
                <th onClick={() => toggleSort('status')}>Status <SortIcon col="status" /></th>
                <th onClick={() => toggleSort('created_at')}>Date <SortIcon col="created_at" /></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>No complaints match filters</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/complaint/${c.id}`}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{c.profiles?.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>Room {c.profiles?.room_number}</div>
                  </td>
                  <td style={{ maxWidth: 200 }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.topic}</div>
                    {c.priority_reason && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.priority_reason}</div>
                    )}
                  </td>
                  <td>{c.category && <span className="badge badge-category">{c.category}</span>}</td>
                  <td style={{ minWidth: 140 }}>
                    {c.priority_score ? <PriorityBar score={c.priority_score} /> : <span style={{ color: 'var(--text3)' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>{c.join_count || 0}</td>
                  <td style={{ textAlign: 'center' }}>{c.upvotes || 0}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
