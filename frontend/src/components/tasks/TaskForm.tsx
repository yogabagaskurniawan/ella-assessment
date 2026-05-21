import { useState } from 'react'

type TaskFormProps = {
    onSubmit: (data: { title: string; priority: number; tags: string[] }) => Promise<void>
}

export default function TaskForm({ onSubmit }: TaskFormProps) {
    const [title, setTitle] = useState('')
    const [priority, setPriority] = useState(1)
    const [tags, setTags] = useState<string[]>([])
    const [tagInput, setTagInput] = useState('')
    const [creating, setCreating] = useState(false)

    function handleAddTag() {
        const tag = tagInput.trim().toLowerCase()
        if (!tag || tags.includes(tag)) return
        setTags(prev => [...prev, tag])
        setTagInput('')
    }

    function handleRemoveTag(tag: string) {
        setTags(prev => prev.filter(t => t !== tag))
    }

    async function handleSubmit() {
        if (!title.trim()) return
        setCreating(true)
        try {
            await onSubmit({ title, priority, tags })
            setTitle('')
            setPriority(1)
            setTags([])
            setTagInput('')
        } finally {
            setCreating(false)
        }
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Buat Task Baru</h2>

            {/* Row 1 — Title + Priority + Button */}
            <div className="flex gap-3 mb-3">
                <input
                    placeholder="Judul task..."
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                    value={priority}
                    onChange={e => setPriority(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    {[1, 2, 3, 4, 5].map(p => (
                        <option key={p} value={p}>Priority {p}</option>
                    ))}
                </select>
                <button
                    onClick={handleSubmit}
                    disabled={creating || !title.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {creating ? 'Membuat...' : '+ Buat Task'}
                </button>
            </div>

            {/* Row 2 — Tags */}
            <div>
                <div className="flex gap-2 mb-2">
                    <input
                        placeholder="Tambah tag... (contoh: bug, urgent)"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                        onClick={handleAddTag}
                        disabled={!tagInput.trim()}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        + Tag
                    </button>
                </div>
                {tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                    {tags.map(tag => (
                    <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium"
                    >
                        #{tag}
                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-indigo-900 font-bold">×</button>
                    </span>
                    ))}
                </div>
                )}
            </div>
        </div>
    )
}