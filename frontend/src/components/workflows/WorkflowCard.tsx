import { Link } from 'react-router-dom'

type Workflow = {
    id: number
    name: string
    enabled: boolean
    config: {
            trigger: 'task.created' | 'task.updated'
            steps: Array<{
            id: string
            type: 'condition' | 'action'  // ← ganti dari string ke literal
            config: Record<string, unknown>
            nextOnTrue?: string | null
            nextOnFalse?: string | null
            next?: string | null
        }>
    }
    createdAt: string
    updatedAt: string
}

type WorkflowCardProps = {
    workflow: Workflow
    isSelected: boolean
    onSelect: (workflow: Workflow) => void
    onToggle: (id: number, enabled: boolean) => void
    onDelete: (id: number) => void
}

export default function WorkflowCard({ workflow: w, isSelected, onSelect, onToggle, onDelete }: WorkflowCardProps) {
    return (
        <div
            onClick={() => onSelect(w)}
            className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all hover:border-indigo-300 ${
                isSelected ? 'border-indigo-500 shadow-sm' : 'border-gray-200'
            }`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900 truncate">{w.name}</span>
                <button
                    onClick={e => { e.stopPropagation(); onToggle(w.id, w.enabled) }}
                    className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                        w.enabled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                >
                    {w.enabled ? '● Aktif' : '○ Nonaktif'}
                </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
                    {w.config.trigger}
                </span>
                <span>{w.config.steps.length} steps</span>
            </div>

            <div className="mt-2 flex gap-3">
                <Link
                    to={`/workflows/${w.id}/edit`}
                    onClick={e => e.stopPropagation()}
                    className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                >
                    Edit
                </Link>
                <button
                    onClick={e => { e.stopPropagation(); onDelete(w.id) }}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                    Hapus
                </button>
            </div>
        </div>
    )
}