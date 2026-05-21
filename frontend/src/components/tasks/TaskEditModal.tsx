import { useState } from 'react'

type Task = {
    id: number
    title: string
    status: 'todo' | 'in_progress' | 'done'
    priority: number
    metadata: Record<string, unknown>
}

type TaskEditModalProps = {
    task: Task
    onSave: (id: number, data: object) => Promise<void>
    onClose: () => void
}

export default function TaskEditModal({ task, onSave, onClose }: TaskEditModalProps) {
    const [title, setTitle] = useState(task.title)
    const [status, setStatus] = useState(task.status)
    const [priority, setPriority] = useState(task.priority)
    const [tags, setTags] = useState<string[]>((task.metadata?.tags as string[]) ?? [])
    const [tagInput, setTagInput] = useState('')
    const [saving, setSaving] = useState(false)

    function handleAddTag() {
        const tag = tagInput.trim().toLowerCase()
        if (!tag || tags.includes(tag)) return
        setTags(prev => [...prev, tag])
        setTagInput('')
    }

    async function handleSave() {
        setSaving(true)
        try {
            await onSave(task.id, {
                title,
                status,
                priority,
                metadata: { ...(task.metadata ?? {}), tags }
            })
            onClose()
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Task</h2>

                {/* Title */}
                <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 block mb-1">Judul</label>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Status */}
                <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 block mb-1">Status</label>
                    <select
                        value={status}
                        onChange={e => setStatus(e.target.value as Task['status'])}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="todo">Todo</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                    </select>
                </div>

                {/* Priority */}
                <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 block mb-1">Priority</label>
                    <select
                        value={priority}
                        onChange={e => setPriority(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {[1, 2, 3, 4, 5].map(p => (
                            <option key={p} value={p}>Priority {p}</option>
                        ))}
                    </select>
                </div>

                {/* Tags */}
                <div className="mb-6">
                    <label className="text-sm font-medium text-gray-700 block mb-1">Tags</label>
                    <div className="flex gap-2 mb-2">
                        <input
                            placeholder="Tambah tag..."
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                            onClick={handleAddTag}
                            disabled={!tagInput.trim()}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                        >
                            + Tag
                        </button>
                    </div>
                    {tags.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            {tags.map(tag => (
                                <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                                    #{tag}
                                    <button onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="hover:text-indigo-900 font-bold">×</button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-end">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                        Batal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !title.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </div>
        </div>
    )
}