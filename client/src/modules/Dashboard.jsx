import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

function useUserRole() {
  const [role, setRole] = useState('interviewer')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('bees_user_data')
    const data = stored ? JSON.parse(stored) : null
    const userEmail = data?.email || new URLSearchParams(window.location.search).get('email') || ''
    setEmail(userEmail)
    async function fetchRole() {
      try {
        const base = ''
        const res = await fetch(`/api/user/role?email=${encodeURIComponent(userEmail)}`)
        const json = await res.json()
        if (json && json.success && json.role) setRole(json.role)
      } catch {}
      setLoading(false)
    }
    if (userEmail) fetchRole(); else setLoading(false)
  }, [])

  return { role, email, loading }
}

const AdminTabs = [
  { to: 'interview', label: 'Start Interview' },
  { to: 'overview', label: '📊 Overview' },
  { to: 'interviews', label: '🎯 Interviews' },
  { to: 'questions', label: '❓ Questions' },
  { to: 'sessions', label: '📅 Sessions' },
  { to: 'students', label: '👥 Students' },
  { to: 'my-interviews', label: '📋 My Interviews' },
]

const InterviewerTabs = [
  { to: 'interview', label: 'Start Interview' },
  { to: 'my-interviews', label: '📋 My Interviews' },
  { to: 'questions', label: '❓ Question Bank' },
]

function Header({ role }) {
  const navigate = useNavigate()
  return (
    <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',borderBottom:'1px solid #e5e7eb',position:'sticky',top:0,background:'#fff',zIndex:10}}>
      <Link to="/dashboard" style={{textDecoration:'none',color:'#111',fontWeight:700}}>Bees</Link>
      <button onClick={() => navigate('/dashboard/interview')} style={{background:'#000',color:'#fff',border:'none',padding:'8px 12px',borderRadius:4,cursor:'pointer'}}>Start Interview</button>
    </header>
  )
}

function Tabs({ role }) {
  const tabs = role === 'admin' || role === 'superadmin' ? AdminTabs : InterviewerTabs
  return (
    <nav style={{display:'flex',gap:12,padding:'8px 16px',borderBottom:'1px solid #eee',flexWrap:'wrap'}}>
      {tabs.map(t => (
        <NavLink key={t.to} to={t.to} end style={({isActive})=>({padding:'6px 10px',borderRadius:4,textDecoration:'none',color:isActive?'#fff':'#111',background:isActive?'#111':'#f3f4f6'})}>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}

function Guard({ role, children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const allowed = useMemo(()=>{
    const adminAllowed = new Set(AdminTabs.map(t=>t.to))
    const interviewerAllowed = new Set(InterviewerTabs.map(t=>t.to))
    const seg = location.pathname.split('/').pop() || 'interview'
    return (role === 'admin' || role === 'superadmin') ? adminAllowed.has(seg) : interviewerAllowed.has(seg)
  }, [location.pathname, role])

  useEffect(()=>{
    if (!allowed) navigate('/dashboard/interview', { replace: true })
  }, [allowed, navigate])

  return children
}

function Placeholder({ title }) {
  return <div style={{padding:16}}>{title}</div>
}

function Interview() {
  const [loading, setLoading] = useState(true)
  const [activeInterview, setActiveInterview] = useState(null)
  useEffect(()=>{
    (async ()=>{
      try {
        const stored = sessionStorage.getItem('active_interview')
        if (stored) setActiveInterview(JSON.parse(stored))
      } finally { setLoading(false) }
    })()
  }, [])
  if (loading) return <div style={{padding:16}}>Loading...</div>
  return (
    <div style={{padding:16}}>
      {activeInterview ? (
        <div>Resuming interview #{activeInterview.id}</div>
      ) : (
        <div>Start a new interview by searching for a student...</div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { role, loading } = useUserRole()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(()=>{
    if (!loading && location.pathname === '/dashboard') navigate('/dashboard/interview', { replace: true })
  }, [loading, location.pathname, navigate])

  if (loading) return <div style={{padding:16}}>Loading role...</div>

  return (
    <div style={{display:'flex',flexDirection:'column',minHeight:'100vh'}}>
      <Header role={role} />
      <Tabs role={role} />
      <Guard role={role}>
        <div style={{flex:1,overflow:'auto'}}>
          <Routes>
            <Route path="interview" element={<Interview />} />
            <Route path="overview" element={<Placeholder title="Overview" />} />
            <Route path="interviews" element={<Placeholder title="All Interviews" />} />
            <Route path="questions" element={<Placeholder title="Question Bank" />} />
            <Route path="sessions" element={<Placeholder title="Sessions" />} />
            <Route path="students" element={<Placeholder title="Students" />} />
            <Route path="my-interviews" element={<Placeholder title="My Interviews" />} />
            <Route path="*" element={<Placeholder title="Not Found" />} />
          </Routes>
        </div>
      </Guard>
    </div>
  )
}


