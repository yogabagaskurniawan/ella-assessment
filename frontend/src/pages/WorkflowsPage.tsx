import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { workflowApi } from '../api/client'
import WorkflowCard from '../components/workflows/WorkflowCard'
import WorkflowStepView from '../components/workflows/WorkflowStepView'
import ExecutionHistory from '../components/workflows/ExecutionHistory'
import toast from 'react-hot-toast'

type WorkflowStep = {
    id: string
    type: 'condition' | 'action'
    config: Record<string, unknown>
    nextOnTrue?: string | null
    nextOnFalse?: string | null
    next?: string | null
}

type Workflow = {
    id: number
    name: string
    enabled: boolean
    config: {
        trigger: 'task.created' | 'task.updated'
        steps: WorkflowStep[]
    }
    createdAt: string
    updatedAt: string
}

type Execution = {
    id: number
    workflowId: number
    taskId: number
    status: 'success' | 'failure'
    steps: Array<{
        stepId: string
        type: string
        status: string
        input?: Record<string, unknown>
        output?: string
        error?: string
    }>
    ranAt: string
    taskTitle: string | null
}

export default function WorkflowsPage() {
    const [workflows, setWorkflows] = useState<Workflow[]>([])
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState<Workflow | null>(null)
    const [executions, setExecutions] = useState<Execution[]>([])
    const [activeTab, setActiveTab] = useState<'steps' | 'history'>('steps')

    async function fetchWorkflows() {
        setLoading(true)
        try {
            const res = await workflowApi.list()
            setWorkflows(res.data.data)
        } finally {
            setLoading(false)
        }
    }

    async function fetchExecutions(id: number) {
        const res = await workflowApi.executions(id)
        setExecutions(res.data.data)
    }

    useEffect(() => { fetchWorkflows() }, [])

    async function handleSelect(workflow: Workflow) {
        setSelected(workflow)
        setActiveTab('steps')
        await fetchExecutions(workflow.id)
    }

    async function handleToggle(id: number, enabled: boolean) {
        try {
            await workflowApi.update(id, { enabled: !enabled })
            toast.success(enabled ? 'Workflow dinonaktifkan' : 'Workflow diaktifkan')
            fetchWorkflows()
            if (selected?.id === id) {
                setSelected(prev => prev ? { ...prev, enabled: !enabled } : null)
            }
        } catch {
            toast.error('Gagal update workflow')
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('Yakin hapus workflow ini?')) return
        try {
            await workflowApi.delete(id)
            toast.success('Workflow berhasil dihapus!')
            if (selected?.id === id) setSelected(null)
            fetchWorkflows()
        } catch {
            toast.error('Gagal hapus workflow')
        }
    }

    return (
        <div className="grid grid-cols-5 gap-6">

            {/* Kiri — List */}
            <div className="col-span-2">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
                    <span className="text-sm text-gray-500">{workflows.length} total</span>
                    <Link
                        to="/workflows/new"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        + Buat Workflow
                    </Link>
                </div>

                {loading && <p className="text-gray-500 text-sm">Memuat...</p>}

                {!loading && workflows.length === 0 && (
                    <div className="text-center py-16 text-gray-400">
                        <p>Belum ada workflow</p>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    {workflows.map(w => (
                        <WorkflowCard
                            key={w.id}
                            workflow={w}
                            isSelected={selected?.id === w.id}
                            onSelect={handleSelect}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            </div>

            {/* Kanan — Detail */}
            <div className="col-span-3">
                {!selected ? (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                        <p>← Pilih workflow untuk lihat detail</p>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                            <span className="text-xs text-gray-400">
                                Trigger: <span className="font-medium text-indigo-600">{selected.config.trigger}</span>
                            </span>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 mb-4 border-b border-gray-200">
                            {(['steps', 'history'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                        activeTab === tab
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {tab === 'steps' ? 'Steps' : (
                                        <>
                                        Execution History
                                        {executions.length > 0 && (
                                            <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                                            {executions.length}
                                            </span>
                                        )}
                                        </>
                                    )}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'steps' && <WorkflowStepView steps={selected.config.steps} />}
                        {activeTab === 'history' && <ExecutionHistory executions={executions} />}
                    </div>
                )}
            </div>
        </div>
    )
}