import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Home, FileText, MessageSquare, PlusCircle, Megaphone,
  LogOut, BarChart2, List, User, Bell
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!profile) return
    supabase.from('notifications').select('id', { count: 'exact' })
      .eq('user_id', profile.id).eq('read', false)
      .then(({ count }) => setUnread(count || 0))

    const sub = supabase.channel('notif-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        () => {
          supabase.from('notifications').select('id', { count: 'exact' })
            .eq('user_id', profile.id).eq('read', false)
            .then(({ count }) => setUnread(count || 0))
        })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [profile])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const isIncharge = profile?.role === 'incharge'

  const residentLinks = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/new-complaint', icon: PlusCircle, label: 'New Complaint' },
    { to: '/my-complaints', icon: FileText, label: 'My Complaints' },
    { to: '/discussions', icon: MessageSquare, label: 'Discussions' },
    { to: '/announcements', icon: Megaphone, label: 'Announcements' },
  ]

  const inchargeLinks = [
    { to: '/admin', icon: BarChart2, label: 'Dashboard' },
    { to: '/admin/complaints', icon: List, label: 'All Complaints' },
    { to: '/discussions', icon: MessageSquare, label: 'Discussions' },
    { to: '/announcements', icon: Megaphone, label: 'Announcements' },
  ]

  const links = isIncharge ? inchargeLinks : residentLinks

  return (
    <nav style={{
      width: 240,
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, paddingLeft: 8 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: 'var(--accent)' }}>
          Hostel<span style={{ color: 'var(--text)' }}>Desk</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {isIncharge ? 'Incharge Panel' : 'Resident Portal'}
        </div>
      </div>

      {/* Links */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/' || to === '/admin'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              color: isActive ? 'var(--accent)' : 'var(--text2)',
              background: isActive ? 'rgba(124,106,247,0.12)' : 'transparent',
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              transition: 'all 0.15s',
              textDecoration: 'none',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Profile + sign out */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(124,106,247,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)', fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>
            {profile?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{profile?.room_number ? `Room ${profile.room_number}` : profile?.role}</div>
          </div>
          {unread > 0 && (
            <div style={{ marginLeft: 'auto', background: 'var(--accent)', color: 'white', borderRadius: '99px', fontSize: 10, padding: '2px 6px', fontWeight: 700 }}>{unread}</div>
          )}
        </div>
        <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '8px 12px', fontSize: 13 }} onClick={handleSignOut}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </nav>
  )
}
