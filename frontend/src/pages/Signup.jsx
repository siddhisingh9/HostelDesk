import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', roomNumber: '', role: 'resident', secret: '' })
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const INCHARGE_SECRET = import.meta.env.VITE_INCHARGE_SECRET

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.role === 'incharge' && form.secret !== INCHARGE_SECRET) {
      toast.error('Invalid incharge secret code')
      return
    }
    setLoading(true)
    const { error } = await signUp({
      email: form.email,
      password: form.password,
      name: form.name,
      roomNumber: form.roomNumber,
      role: form.role,
    })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Account created! Please check your email to confirm.')
    navigate('/login')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 32, color: 'var(--accent)' }}>
            Hostel<span style={{ color: 'var(--text)' }}>Desk</span>
          </div>
          <div style={{ color: 'var(--text2)', marginTop: 6 }}>Create your account</div>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Full Name</label>
              <input className="input" placeholder="Your name" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input className="input" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label>Room Number</label>
                <input className="input" placeholder="e.g. A-201" value={form.roomNumber} onChange={e => set('roomNumber', e.target.value)} />
              </div>
              <div className="input-group">
                <label>Role</label>
                <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="resident">Resident</option>
                  <option value="incharge">Incharge</option>
                </select>
              </div>
            </div>
            {form.role === 'incharge' && (
              <div className="input-group">
                <label>Incharge Secret Code</label>
                <input className="input" type="password" placeholder="Enter secret code" value={form.secret} onChange={e => set('secret', e.target.value)} required />
              </div>
            )}
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create Account'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--text2)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
        </div>
      </div>
    </div>
  )
}
