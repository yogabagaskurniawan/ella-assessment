type ExecutionStep = {
    stepId: string
    type: string
    status: string
    output?: string
    error?: string
}

type Execution = {
    id: number
    taskId: number   
    status: 'success' | 'failure'
    steps: ExecutionStep[]
    ranAt: string
    taskTitle: string | null 
}

type ExecutionHistoryProps = {
    executions: Execution[]
}

export default function ExecutionHistory({ executions }: ExecutionHistoryProps) {
    if (executions.length === 0) {
        return (
            <div className="text-center py-12 text-gray-400">
                <p>Belum ada eksekusi</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3">
            {executions.map(ex => (
                <div key={ex.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                ex.status === 'success'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                                {ex.status === 'success' ? '✓ Success' : '✗ Failure'}
                            </span>
                            {/* Task title dari backend */}
                            <span className="text-xs font-medium text-gray-700">
                                📋 {ex.taskTitle ?? `Task #${ex.taskId}`}
                            </span>
                        </div>
                        <span className="text-xs text-gray-400">
                            {new Date(ex.ranAt).toLocaleString('id-ID')}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        {ex.steps.map(step => (
                            <div
                                key={step.stepId}
                                className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${
                                step.status === 'success'
                                    ? 'bg-gray-50 border-l-2 border-green-400'
                                    : step.status === 'failure'
                                    ? 'bg-red-50 border-l-2 border-red-400'
                                    : 'bg-gray-50 border-l-2 border-gray-300'
                                }`}
                            >
                                <span className="mt-0.5">
                                    {step.type === 'condition' ? '?' : '⚡'}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <span className="font-semibold text-gray-700">{step.stepId}</span>
                                    {step.output && (
                                        <span className="text-gray-500 ml-2">→ {step.output}</span>
                                    )}
                                    {step.error && (
                                        <p className="text-red-600 mt-0.5 break-all">✗ {step.error}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}