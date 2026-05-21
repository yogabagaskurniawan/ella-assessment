type Task = {
    id: number
    title: string
    status: 'todo' | 'in_progress' | 'done'
    priority: number
    metadata: Record<string, unknown>
    createdAt: string
    updatedAt: string
}

type TaskCardProps = {
    task: Task
    onStatusChange: (id: number, status: string) => void
    onEdit: (task: Task) => void
    onDelete: (id: number) => void
}

const statusColor = {
    todo: 'bg-gray-100 text-gray-700 border-gray-300',
    in_progress: 'bg-blue-100 text-blue-700 border-blue-300',
    done: 'bg-green-100 text-green-700 border-green-300',
}

const priorityColor = (p: number) =>
    p >= 4 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'

export default function TaskCard({ task, onStatusChange, onEdit, onDelete }: TaskCardProps) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-4 hover:border-indigo-200 transition-colors">
            {/* Priority */}
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${priorityColor(task.priority)}`}>
                P{task.priority}
            </span>

            {/* Title + tags + logs */}
            <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{task.title}</p>
                {/* Waktu dibuat */}
                <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(task.createdAt).toLocaleString('id-ID')}
                </p>

                {(task.metadata?.tags as string[])?.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                        {(task.metadata.tags as string[]).map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
                {(task.metadata?.logs as string[])?.length > 0 && (
                    <div className="mt-1 flex flex-col gap-0.5">
                        {(task.metadata.logs as string[]).map((log, i) => (
                            <p key={i} className="text-xs text-gray-400 truncate">📋 {log}</p>
                        ))}
                    </div>
                )}
            </div>

            {/* Status */}
            <select
                value={task.status}
                onChange={e => onStatusChange(task.id, e.target.value)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border cursor-pointer focus:outline-none ${statusColor[task.status]}`}
            >
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
            </select>

            {/* Actions */}
            <button
                onClick={() => onEdit(task)}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
                Edit
            </button>
            <button
                onClick={() => onDelete(task.id)}
                className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
                Hapus
            </button>
        </div>
    )
}