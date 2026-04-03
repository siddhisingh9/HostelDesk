import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import NewComplaint from './pages/NewComplaint'
import MyComplaints from './pages/MyComplaints'
import ComplaintDetail from './pages/ComplaintDetail'
import Discussions from './pages/Discussions'
import PublicDashboard from './pages/PublicDashboard'
import AdminDashboard from './pages/AdminDashboard'
import AdminComplaints from './pages/AdminComplaints'
import Announcements from './pages/Announcements'
import Navbar from './components/Navbar'

function PrivateRoute({ children, role }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (role && profile?.role !== role) return <Navigate to="/" replace />
  return children
}

function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content fade-in">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  const { user, profile } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/public" element={<PublicDashboard />} />

        {/* Resident routes */}
        <Route path="/" element={
          <PrivateRoute>
            <AppShell>
              {profile?.role === 'incharge' ? <AdminDashboard /> : <Dashboard />}
            </AppShell>
          </PrivateRoute>
        } />
        <Route path="/new-complaint" element={
          <PrivateRoute role="resident">
            <AppShell><NewComplaint /></AppShell>
          </PrivateRoute>
        } />
        <Route path="/my-complaints" element={
          <PrivateRoute role="resident">
            <AppShell><MyComplaints /></AppShell>
          </PrivateRoute>
        } />
        <Route path="/complaint/:id" element={
          <PrivateRoute>
            <AppShell><ComplaintDetail /></AppShell>
          </PrivateRoute>
        } />
        <Route path="/discussions" element={
          <PrivateRoute>
            <AppShell><Discussions /></AppShell>
          </PrivateRoute>
        } />

        {/* Incharge routes */}
        <Route path="/admin" element={
          <PrivateRoute role="incharge">
            <AppShell><AdminDashboard /></AppShell>
          </PrivateRoute>
        } />
        <Route path="/admin/complaints" element={
          <PrivateRoute role="incharge">
            <AppShell><AdminComplaints /></AppShell>
          </PrivateRoute>
        } />
        <Route path="/announcements" element={
          <PrivateRoute>
            <AppShell><Announcements /></AppShell>
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
