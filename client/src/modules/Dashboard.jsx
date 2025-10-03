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
  { to: 'question-analysis', label: '❓ Question Analysis' },
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
      {tabs.map(t => {
        const to = `/dashboard/${t.to}`
        return (
          <NavLink key={t.to} to={to} end style={({isActive})=>({padding:'6px 10px',borderRadius:4,textDecoration:'none',color:isActive?'#fff':'#111',background:isActive?'#111':'#f3f4f6'})}>
          {t.label}
          </NavLink>
        )
      })}
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
    <div style={{height:'calc(100vh - 120px)'}}>
      <iframe
        title="Interview Session"
        src={`/interview-session${window.location.search ? ('?' + window.location.search.split('?')[1]) : ''}`}
        style={{width:'100%',height:'100%',border:'0'}}
      />
    </div>
  )
}

function useUserEmail() {
  const [email, setEmail] = useState('')
  useEffect(()=>{
    try {
      const stored = localStorage.getItem('bees_user_data')
      const data = stored ? JSON.parse(stored) : null
      const urlEmail = new URLSearchParams(window.location.search).get('email')
      const e = urlEmail || data?.email || ''
      if (e) setEmail(e)
    } catch {}
  }, [])
  return email
}

function MyInterviewsTab() {
  const email = useUserEmail()
  const [state, setState] = useState({ loading: true, error: '', items: [] })
  useEffect(()=>{
    (async ()=>{
      try {
        if (!email) throw new Error('Missing user email')
        const res = await fetch(`/api/interviewer/interviews?email=${encodeURIComponent(email)}`, {
          headers: { 'x-user-email': email }
        })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`)
        setState({ loading: false, error: '', items: json.data || [] })
      } catch (e) {
        setState({ loading: false, error: e.message || 'Failed to load', items: [] })
      }
    })()
  }, [email])
  if (state.loading) return <div style={{padding:16}}>Loading my interviews...</div>
  if (state.error) return <div style={{padding:16,color:'#b91c1c'}}>Error: {state.error}</div>
  if (!state.items.length) return <div style={{padding:16}}>No interviews found.</div>
  return (
    <div style={{padding:16}}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead>
          <tr>
            <th style={{textAlign:'left',borderBottom:'1px solid #eee',padding:'8px'}}>Date</th>
            <th style={{textAlign:'left',borderBottom:'1px solid #eee',padding:'8px'}}>Student</th>
            <th style={{textAlign:'left',borderBottom:'1px solid #eee',padding:'8px'}}>Session</th>
            <th style={{textAlign:'left',borderBottom:'1px solid #eee',padding:'8px'}}>Status</th>
            <th style={{textAlign:'left',borderBottom:'1px solid #eee',padding:'8px'}}>Verdict</th>
          </tr>
        </thead>
        <tbody>
          {state.items.map((it)=> (
            <tr key={it.id}>
              <td style={{padding:'8px',borderBottom:'1px solid #f1f5f9'}}>{new Date(it.created_at || it.interview_date || Date.now()).toLocaleString()}</td>
              <td style={{padding:'8px',borderBottom:'1px solid #f1f5f9'}}>{it.student_name || `${it.first_name || ''} ${it.last_name || ''}`}</td>
              <td style={{padding:'8px',borderBottom:'1px solid #f1f5f9'}}>{it.session_name || '-'}</td>
              <td style={{padding:'8px',borderBottom:'1px solid #f1f5f9'}}>{it.status}</td>
              <td style={{padding:'8px',borderBottom:'1px solid #f1f5f9'}}>{it.verdict || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdminOverviewTab() {
  const [state, setState] = useState({ loading: true, error: '', data: null })
  useEffect(()=>{
    (async ()=>{
      try {
        const res = await fetch('/api/admin/overview')
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`)
        setState({ loading: false, error: '', data: json.data })
      } catch (e) {
        setState({ loading: false, error: e.message || 'Failed to load', data: null })
      }
    })()
  }, [])
  if (state.loading) return <div style={{padding:16}}>Loading overview...</div>
  if (state.error) return <div style={{padding:16,color:'#b91c1c'}}>Error: {state.error}</div>
  return <pre style={{padding:16,background:'#f8fafc',overflow:'auto'}}>{JSON.stringify(state.data, null, 2)}</pre>
}

function AdminInterviewsTab() {
  const [state, setState] = useState({ loading: true, error: '', items: [] })
  // Embed legacy admin list with full filters and detail views
  return (
    <div style={{height:'calc(100vh - 120px)'}}>
      <iframe
        title="Admin Dashboard"
        src={`/admin-dashboard.html${window.location.search ? ('?' + window.location.search.split('?')[1]) : ''}`}
        style={{width:'100%',height:'100%',border:'0'}}
      />
    </div>
  )
}

function QuestionsTab() {
  const email = useUserEmail()
  // For parity with legacy features, embed interviewer dashboard's question bank UI
  return (
    <div style={{height:'calc(100vh - 120px)'}}>
      <iframe
        title="Interviewer Dashboard - Question Bank"
        src={`/interviewer-dashboard.html${window.location.search ? ('?' + window.location.search.split('?')[1]) : ''}`}
        style={{width:'100%',height:'100%',border:'0'}}
      />
    </div>
  )
}

function QuestionAnalysisTab() {
  const email = useUserEmail()
  const [state, setState] = useState({ loading: true, error: '', items: [] })
  const [favorites, setFavorites] = useState(new Set())
  const [detail, setDetail] = useState(null)

  useEffect(()=>{
    (async ()=>{
      try {
        const [qRes, favRes] = await Promise.all([
          fetch('/api/admin/questions/analytics'),
          email ? fetch(`/api/interviewer/favorites?email=${encodeURIComponent(email)}`) : Promise.resolve({ ok:true, json: async()=>({ success:true, data: [] }) })
        ])
        const qJson = await qRes.json()
        const favJson = await favRes.json()
        if (!qRes.ok || qJson.success === false) throw new Error(qJson.error || `HTTP ${qRes.status}`)
        const items = qJson.data || []
        const favIds = new Set((favJson.data || []).map(f=>f.question_id))
        setFavorites(favIds)
        setState({ loading:false, error:'', items })
      } catch(e) {
        setState({ loading:false, error: e.message || 'Failed to load', items: [] })
      }
    })()
  }, [email])

  async function toggleFavorite(questionId) {
    try {
      const isFav = favorites.has(questionId)
      const method = isFav ? 'DELETE' : 'POST'
      const res = await fetch(`/api/interviewer/favorites?email=${encodeURIComponent(email)}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId })
      })
      const json = await res.json()
      if (!res.ok || json.success === false) throw new Error(json.error || `HTTP ${res.status}`)
      const next = new Set(favorites)
      if (isFav) next.delete(questionId); else next.add(questionId)
      setFavorites(next)
    } catch(e) {
      alert(`Failed to update favorite: ${e.message}`)
    }
  }

  async function viewDetails(id) {
    try {
      const res = await fetch(`/api/admin/questions/${id}/details`)
      const json = await res.json()
      if (!res.ok || json.success === false) throw new Error(json.error || `HTTP ${res.status}`)
      setDetail(json.data || json)
    } catch (e) {
      alert(`Failed to load details: ${e.message}`)
    }
  }

  function closeDetails() { setDetail(null) }

  if (state.loading) return <div style={{padding:16}}>Loading question analysis...</div>
  if (state.error) return <div style={{padding:16,color:'#b91c1c'}}>Error: {state.error}</div>
  if (!state.items.length) return <div style={{padding:16}}>No questions.</div>

  return (
    <div style={{padding:16}}>
      <div className="table-container" style={{overflowX:'auto'}}>
        <table className="table" style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <th style={{textAlign:'left',borderBottom:'1px solid #eee',padding:'8px'}}>Question</th>
              <th style={{textAlign:'left',borderBottom:'1px solid #eee',padding:'8px'}}>Category</th>
              <th style={{textAlign:'left',borderBottom:'1px solid #eee',padding:'8px'}}>Times Asked</th>
              <th style={{textAlign:'left',borderBottom:'1px solid #eee',padding:'8px'}}>Correct Answers</th>
              <th style={{textAlign:'left',borderBottom:'1px solid #eee',padding:'8px'}}>Success Rate</th>
              <th style={{textAlign:'left',borderBottom:'1px solid #eee',padding:'8px'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.items.map(q => {
              const timesAsked = (q.times_asked ?? q.count_of_times_asked ?? 0)
              const correct = (q.correct_answers ?? 0)
              const success = (q.success_rate != null ? `${q.success_rate}%` : '-')
              return (
                <tr key={q.id}>
                  <td style={{padding:'8px',borderBottom:'1px solid #f1f5f9'}}>
                    <span style={{marginRight:8}}>{q.question}</span>
                    <button onClick={()=>toggleFavorite(q.id)} title={favorites.has(q.id)?'Remove from favorites':'Add to favorites'} style={{border:'none',background:'transparent',fontSize:16,cursor:'pointer'}}>
                      {favorites.has(q.id) ? '★' : '☆'}
                    </button>
                  </td>
                  <td style={{padding:'8px',borderBottom:'1px solid #f1f5f9'}}>{q.category || '-'}</td>
                  <td style={{padding:'8px',borderBottom:'1px solid #f1f5f9'}}>{timesAsked}</td>
                  <td style={{padding:'8px',borderBottom:'1px solid #f1f5f9'}}>{correct}</td>
                  <td style={{padding:'8px',borderBottom:'1px solid #f1f5f9'}}>{success}</td>
                  <td style={{padding:'8px',borderBottom:'1px solid #f1f5f9'}}>
                    <button onClick={()=>viewDetails(q.id)} style={{background:'#000',color:'#fff',border:'none',padding:'6px 10px',borderRadius:4,cursor:'pointer'}}>View</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {detail && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.35)'}} onClick={closeDetails}>
          <div onClick={e=>e.stopPropagation()} style={{position:'absolute',top:0,right:0,width:420,height:'100%',background:'#fff',boxShadow:'-2px 0 10px rgba(0,0,0,0.1)',padding:16,overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h3 style={{margin:0}}>Question Details</h3>
              <button onClick={closeDetails} style={{border:'none',background:'transparent',fontSize:20,cursor:'pointer'}}>&times;</button>
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontWeight:600,marginBottom:6}}>{detail.question}</div>
              <div style={{color:'#475569',fontSize:14,marginBottom:6}}>Category: {detail.category || '-'}</div>
              <div style={{fontSize:14}}>Times Asked: {detail.times_asked ?? detail.count_of_times_asked ?? 0}</div>
              <div style={{fontSize:14}}>Correct Answers: {detail.correct_answers ?? 0}</div>
              <div style={{fontSize:14}}>Success Rate: {detail.success_rate != null ? `${detail.success_rate}%` : '-'}</div>
            </div>
            <div>
              <h4 style={{margin:'12px 0'}}>Student Answers</h4>
              {(detail.student_answers || []).map((a, idx)=> (
                <div key={idx} style={{border:'1px solid #e5e7eb',borderRadius:6,padding:10,marginBottom:8,background:'#f8fafc'}}>
                  <div style={{fontWeight:600}}>{a.student_name || 'Student'} ({a.zeta_id || '-'})</div>
                  <div style={{fontSize:12,color:'#64748b',margin:'4px 0'}}>Answered at: {a.answered_at ? new Date(a.answered_at).toLocaleString() : '-'}</div>
                  <div>Answer: {a.answer_text || '-'}</div>
                </div>
              ))}
              {!(detail.student_answers || []).length && (
                <div style={{color:'#64748b'}}>No answers recorded.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AdminSessionsTab() {
  const [state, setState] = useState({ loading: true, error: '', items: [] })
  useEffect(()=>{
    (async ()=>{
      try {
        const res = await fetch('/api/admin/sessions')
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`)
        setState({ loading: false, error: '', items: json.data || [] })
      } catch (e) {
        setState({ loading: false, error: e.message || 'Failed to load', items: [] })
      }
    })()
  }, [])
  if (state.loading) return <div style={{padding:16}}>Loading sessions...</div>
  if (state.error) return <div style={{padding:16,color:'#b91c1c'}}>Error: {state.error}</div>
  return <div style={{padding:16}}>Total sessions: {state.items.length}</div>
}

function AdminStudentsTab() {
  const [state, setState] = useState({ loading: true, error: '', items: [] })
  useEffect(()=>{
    (async ()=>{
      try {
        const res = await fetch('/api/admin/students')
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`)
        setState({ loading: false, error: '', items: json.data || [] })
      } catch (e) {
        setState({ loading: false, error: e.message || 'Failed to load', items: [] })
      }
    })()
  }, [])
  if (state.loading) return <div style={{padding:16}}>Loading students...</div>
  if (state.error) return <div style={{padding:16,color:'#b91c1c'}}>Error: {state.error}</div>
  return <div style={{padding:16}}>Total students: {state.items.length}</div>
}

export default function Dashboard() {
  const { role, loading } = useUserRole()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(()=>{
    // Normalize any nested/duplicated paths like /dashboard/interview/interview/...
    if (!loading) {
      const p = location.pathname
      if (p.startsWith('/dashboard/dashboard')) {
        navigate(p.replace('/dashboard/dashboard', '/dashboard'), { replace: true })
        return
      }
      const normalized = p.replace('/dashboard/interview/interview', '/dashboard/interview')
      if (normalized !== p) {
        navigate(normalized, { replace: true })
        return
      }
      if (p === '/dashboard') navigate('/dashboard/interview', { replace: true })
    }
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
            <Route path="overview" element={<AdminOverviewTab />} />
            <Route path="interviews" element={<AdminInterviewsTab />} />
            <Route path="questions" element={<QuestionsTab />} />
            <Route path="question-analysis" element={<QuestionAnalysisTab />} />
            <Route path="sessions" element={<AdminSessionsTab />} />
            <Route path="students" element={<AdminStudentsTab />} />
            <Route path="my-interviews" element={<MyInterviewsTab />} />
            <Route path="*" element={<Placeholder title="Not Found" />} />
          </Routes>
        </div>
      </Guard>
    </div>
  )
}


