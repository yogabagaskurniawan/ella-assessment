const OPERATORS = [
    { value: 'eq', label: 'sama dengan (==)' },
    { value: 'neq', label: 'tidak sama (!=)' },
    { value: 'gt', label: 'lebih besar (>)' },
    { value: 'gte', label: 'lebih besar/sama (>=)' },
    { value: 'lt', label: 'lebih kecil (<)' },
    { value: 'lte', label: 'lebih kecil/sama (<=)' },
    { value: 'contains', label: 'mengandung (contains)' },
]

const FIELDS = [
    { value: 'priority', label: 'Priority' },
    { value: 'status', label: 'Status' },
    { value: 'metadata.tags', label: 'Tags (metadata.tags)' },
]

const ACTIONS = [
    { value: 'setStatus', label: 'Set Status' },
    { value: 'setPriority', label: 'Set Priority' },
    { value: 'appendLog', label: 'Append Log' },
]

type StepType = 'condition' | 'action'

type WorkflowStep = {
    id: string
    type: StepType
    config: Record<string, unknown>
    nextOnTrue?: string
    nextOnFalse?: string
    next?: string
}

type StepCardProps = {
    step: WorkflowStep
    index: number
    allStepIds: string[]
    onUpdate: (id: string, updates: Partial<WorkflowStep>) => void
    onUpdateConfig: (id: string, key: string, value: unknown) => void
    onChangeType: (id: string, type: StepType) => void
    onRemove: (id: string) => void
}

export default function StepCard({
    step, index, allStepIds, onUpdate, onUpdateConfig, onChangeType, onRemove
}: StepCardProps) {
    const otherSteps = allStepIds.filter(sid => sid !== step.id)

    return (
        <div className={`rounded-xl border-2 p-4 ${
            step.type === 'condition'
                ? 'border-blue-200 bg-blue-50'
                : 'border-green-200 bg-green-50'
            }`}
        >    
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                <select
                    value={step.type}
                    onChange={e => onChangeType(step.id, e.target.value as StepType)}
                    className={`text-xs font-medium px-2 py-1 rounded-lg border focus:outline-none ${
                        step.type === 'condition'
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-green-100 text-green-700 border-green-300'
                    }`}
                    >
                    <option value="condition">Condition</option>
                    <option value="action">Action</option>
                </select>
                <input
                    value={step.id}
                    onChange={e => onUpdate(step.id, { id: e.target.value })}
                    placeholder="step-id"
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
                <button
                    onClick={() => onRemove(step.id)}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1"
                >
                    ✕
                </button>
            </div>

            {/* Condition config */}
            {step.type === 'condition' && (
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Field</label>
                            <select
                                value={step.config.field as string}
                                onChange={e => {
                                    // Ganti field DAN reset value ke kosong
                                    onUpdateConfig(step.id, 'field', e.target.value)
                                    onUpdateConfig(step.id, 'value', '')  // ← reset value
                                }}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                {FIELDS.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Operator</label>
                            <select
                                value={step.config.operator as string}
                                onChange={e => onUpdateConfig(step.id, 'operator', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                {OPERATORS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                        {/* Value — adaptif berdasarkan field yang dipilih */}
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Value</label>

                            {/* Priority → select 1-5 */}
                            {step.config.field === 'priority' && (
                                <select
                                    value={step.config.value as number}
                                    onChange={e => onUpdateConfig(step.id, 'value', Number(e.target.value))}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                <option value="">Pilih priority...</option>
                                    {[1, 2, 3, 4, 5].map(p => (
                                        <option key={p} value={p}>Priority {p}</option>
                                    ))}
                                </select>
                            )}

                            {/* Status → select todo/in_progress/done */}
                            {step.config.field === 'status' && (
                                <select
                                    value={step.config.value as string}
                                    onChange={e => onUpdateConfig(step.id, 'value', e.target.value)}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                    <option value="">Pilih status...</option>
                                    <option value="todo">Todo</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="done">Done</option>
                                </select>
                            )}

                            {/* Tags → input text biasa */}
                            {step.config.field === 'metadata.tags' && (
                                <input
                                    value={step.config.value as string}
                                    onChange={e => onUpdateConfig(step.id, 'value', e.target.value)}
                                    placeholder="contoh: bug"
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            )}
                        </div>
                    </div>

                    {/* Branching */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200">
                        <div>
                            <label className="text-xs font-medium text-green-600 block mb-1">
                                ✓ Kalau TRUE → lanjut ke:
                            </label>
                            <select
                                value={step.nextOnTrue ?? ''}
                                onChange={e => onUpdate(step.id, { nextOnTrue: e.target.value || undefined })}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="">— selesai —</option>
                                {otherSteps.map(sid => (
                                <option key={sid} value={sid}>{sid}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-red-500 block mb-1">
                                ✗ Kalau FALSE → lanjut ke:
                            </label>
                            <select
                                value={step.nextOnFalse ?? ''}
                                onChange={e => onUpdate(step.id, { nextOnFalse: e.target.value || undefined })}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="">— selesai —</option>
                                {otherSteps.map(sid => (
                                    <option key={sid} value={sid}>{sid}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Action config */}
            {step.type === 'action' && (
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Action</label>
                            <select
                                value={step.config.action as string}
                                onChange={e => {
                                    onUpdateConfig(step.id, 'action', e.target.value)
                                    onUpdateConfig(step.id, 'value', '')      // ← reset value
                                    onUpdateConfig(step.id, 'template', '')   // ← reset template
                                }}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                {ACTIONS.map(a => (
                                    <option key={a.value} value={a.value}>{a.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">
                                {step.config.action === 'appendLog' ? 'Template' : 'Value'}
                            </label>
                            {step.config.action === 'setStatus' && (
                                <select
                                    value={step.config.value as string}
                                    onChange={e => onUpdateConfig(step.id, 'value', e.target.value)}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                    <option value="">Pilih status...</option>
                                    <option value="todo">Todo</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="done">Done</option>
                                </select>
                            )}
                            {step.config.action === 'setPriority' && (
                                <select
                                    value={step.config.value as number}
                                    onChange={e => onUpdateConfig(step.id, 'value', Number(e.target.value))}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                    <option value="">Pilih priority...</option>
                                    {[1, 2, 3, 4, 5].map(p => (
                                    <option key={p} value={p}>Priority {p}</option>
                                    ))}
                                </select>
                            )}
                            {step.config.action === 'appendLog' && (
                                <div>
                                    <input
                                        value={step.config.value as string}
                                            onChange={e => {
                                            onUpdateConfig(step.id, 'value', e.target.value)
                                            onUpdateConfig(step.id, 'template', e.target.value)
                                        }}
                                        placeholder="contoh: queued: {{task.title}}"
                                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        Gunakan {'{{task.title}}'}, {'{{task.priority}}'} untuk interpolasi
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="pt-2 border-t border-green-200">
                        <label className="text-xs text-gray-500 block mb-1">Setelah ini → lanjut ke:</label>
                        <select
                            value={step.next ?? ''}
                            onChange={e => onUpdate(step.id, { next: e.target.value || undefined })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="">— selesai —</option>
                            {otherSteps.map(sid => (
                                <option key={sid} value={sid}>{sid}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
        </div>
    )
}