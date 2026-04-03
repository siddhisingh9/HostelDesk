import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn({ email, password })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    navigate('/')
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
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 32, color: 'var(--accent)' }}>
            Hostel<span style={{ color: 'var(--text)' }}>Desk</span>
          </div>
          <div style={{ color: 'var(--text2)', marginTop: 6 }}>Sign in to your account</div>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--text2)' }}>
          No account? <Link to="/signup" style={{ color: 'var(--accent)' }}>Sign up</Link>
          {' · '}
          <Link to="/public" style={{ color: 'var(--text3)' }}>Public Dashboard</Link>
        </div>
      </div>
    </div>
  )
}
