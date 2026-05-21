type WorkflowStep = {
    id: string
    type: 'condition' | 'action'
    config: Record<string, unknown>
    nextOnTrue?: string | null
    nextOnFalse?: string | null
    next?: string | null
}

type WorkflowStepViewProps = {
    steps: WorkflowStep[]
}

export default function WorkflowStepView({ steps }: WorkflowStepViewProps) {
    return (
        <div className="flex flex-col gap-3">
            {steps.map((step, i) => (
                <div key={step.id}>
                    <div className={`rounded-xl border p-4 ${
                        step.type === 'condition'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-green-50 border-green-200'
                    }`}>
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    step.type === 'condition'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                    {step.type}
                                </span>
                            <span className="font-semibold text-gray-900 text-sm">{step.id}</span>
                        </div>

                        {/* Config */}
                        <div className="bg-white/70 rounded-lg px-3 py-2 text-xs text-gray-600 font-mono mb-2">
                            {JSON.stringify(step.config)}
                        </div>

                        {/* Next pointers */}
                        <div className="flex gap-3 text-xs">
                            {step.nextOnTrue && (
                                <span className="text-green-600">
                                    ✓ True → <span className="font-medium">{step.nextOnTrue}</span>
                                </span>
                            )}
                            {step.nextOnFalse && (
                                <span className="text-red-500">
                                    ✗ False → <span className="font-medium">{step.nextOnFalse}</span>
                                </span>
                            )}
                            {step.next && (
                                <span className="text-gray-500">
                                    → <span className="font-medium">{step.next}</span>
                                </span>
                            )}
                            {!step.nextOnTrue && !step.nextOnFalse && !step.next && (
                                <span className="text-gray-400">→ selesai</span>
                            )}
                        </div>
                    </div>

                    {i < steps.length - 1 && (
                        <div className="text-center text-gray-300 text-lg my-1">↓</div>
                    )}
                </div>
            ))}
        </div>
    )
}