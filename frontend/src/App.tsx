import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import TasksPage from './pages/TasksPage'
import WorkflowsPage from './pages/WorkflowsPage'
import WorkflowBuilderPage from './pages/WorkflowBuilderPage'

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation()
  // const isActive = location.pathname === to
  const isActive = to === '/' 
    ? location.pathname === '/'           // Tasks hanya aktif kalau persis '/'
    : location.pathname.startsWith(to)    // Workflows aktif untuk semua /workflows/
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        isActive
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
          <span className="font-bold text-lg text-indigo-600">
            Ella Task Manager
          </span>
          <NavLink to="/">Tasks</NavLink>
          <NavLink to="/workflows">Workflows</NavLink>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<TasksPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/workflows/new" element={<WorkflowBuilderPage />} />
            <Route path="/workflows/:id/edit" element={<WorkflowBuilderPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App