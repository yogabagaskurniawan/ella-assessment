import { useState, useEffect } from 'react'
import { taskApi } from '../api/client'
import TaskForm from '../components/tasks/TaskForm'
import TaskCard from '../components/tasks/TaskCard'
import TaskEditModal from '../components/tasks/TaskEditModal'
import Pagination from '../components/tasks/Pagination'
import toast from 'react-hot-toast'

type Task = {
    id: number
    title: string
    status: 'todo' | 'in_progress' | 'done'
    priority: number
    metadata: Record<string, unknown>
    createdAt: string
    updatedAt: string
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const limit = 10

    const [editTask, setEditTask] = useState<Task | null>(null)

    async function fetchTasks() {
        setLoading(true)
        try {
            const res = await taskApi.list({ search: search || undefined, status: statusFilter || undefined, page, limit })
            setTasks(res.data.data)
            setTotal(res.data.total)
            setTotalPages(res.data.totalPages)
        } catch {
            toast.error('Gagal membuat task')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { setPage(1) }, [search, statusFilter])
    useEffect(() => { fetchTasks() }, [page, search, statusFilter])

    async function handleCreate(data: { title: string; priority: number; tags: string[] }) {
        if (!data.title.trim()) {
            toast.error('Judul task tidak boleh kosong!')
            return
        }
        if (data.priority < 1 || data.priority > 5) {
            toast.error('Priority harus antara 1-5!')
            return
        }
        try {
            await taskApi.create({
                title: data.title,
                priority: data.priority,
                metadata: data.tags.length > 0 ? { tags: data.tags } : {}
            })
            toast.success('Task berhasil dibuat!')
            fetchTasks()
        } catch {
            toast.error('Gagal membuat task')
        }
    }

    async function handleStatusChange(id: number, status: string) {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: status as Task['status'] } : t))
        try {
            await taskApi.update(id, { status })
            toast.success('Status berhasil diubah!')
            await new Promise(resolve => setTimeout(resolve, 500))
            fetchTasks()
        } catch {
            toast.error('Gagal update status')
            fetchTasks()
        }
    }

    async function handleSaveEdit(id: number, data: any) {
        if (!data.title?.trim()) {
            toast.error('Judul task tidak boleh kosong!')
            return
        }
        if (data.priority < 1 || data.priority > 5) {
            toast.error('Priority harus antara 1-5!')
            return
        }
        try {
            await taskApi.update(id, data)
            toast.success('Task berhasil diupdate!')
            await new Promise(resolve => setTimeout(resolve, 500))
            fetchTasks()
        } catch {
            toast.error('Gagal update task')
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('Yakin hapus task ini?')) return
        try {
            await taskApi.delete(id)
            toast.success('Task berhasil dihapus!')
            fetchTasks()
        } catch {
            toast.error('Gagal hapus task')
        }
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    Tasks <span className="text-sm font-normal text-gray-500">({total} total)</span>
                </h1>
            </div>

            {/* Form */}
            <TaskForm onSubmit={handleCreate} />

            {/* Search & Filter */}
            <div className="flex gap-3 mb-4">
                <input
                    placeholder="Cari task..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">Semua Status</option>
                    <option value="todo">Todo</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                </select>
            </div>

            {/* Loading */}
            {loading && <div className="text-center py-12 text-gray-500">Memuat...</div>}

            {/* Empty */}
            {!loading && tasks.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-lg">Belum ada task</p>
                    <p className="text-sm mt-1">Buat task pertama kamu di atas!</p>
                </div>
            )}

            {/* Task List */}
            <div className="flex flex-col gap-2">
                {tasks.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        onEdit={setEditTask}
                        onDelete={handleDelete}
                    />
                ))}
            </div>

            {/* Pagination */}
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

            {/* Edit Modal */}
            {editTask && (
                <TaskEditModal
                    task={editTask}
                    onSave={handleSaveEdit}
                    onClose={() => setEditTask(null)}
                />
            )}
        </div>
    )
}