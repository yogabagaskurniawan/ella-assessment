import { eq } from "drizzle-orm";
import { db } from "../db/connection";
import { tasks, workflowExecutions, workflows, type StepLog, type WorkflowConfig, type WorkflowStep } from "../db/schema";

// TYPES
// $inferSelect = TypeScript type yang di-generate otomatis
// dari schema drizzle — kayak interface Task { id: string, title: string, ... }
type Task = typeof tasks.$inferSelect
type TriggerEvent = 'task.created' | 'task.updated'

// MAIN FUNCTION - dipanggil setiap task dibuat/diupdate
export async function runWorkflows(event:TriggerEvent, task:Task) {
    // ambil semua workflow yang enabled
    const allWorkFlows = await db.select().from(workflows).where(eq(workflows.enabled, true)) 

    // filter workflow yang triggernya cocok dengan event
    const matchingWorkflows = allWorkFlows.filter(w => {
        const config = w.config as WorkflowConfig
        return config.trigger === event
    }) 

    // jalankan setiap workflow yang cocok
    // pakai promise.allSetled supaya kalau 1 workflow gagal,
    // workflow lain tetap jalan
    await Promise.allSettled(
        matchingWorkflows.map(workflow => executeWorkflow(workflow, task))
    )
}

// EXECUTE WORKFLOW - jalankan 1 workflow untuk 1 task
async function executeWorkflow(workflow: typeof workflows.$inferSelect, task: Task) {
    const config = workflow.config as WorkflowConfig
    const stepLogs: StepLog[] = []

    // ambil versi task terbaru dari database
    // (mungkin sudah diubah oleh workflow lain)
    let currentTask = task

    try {
        // mulai dari step pertama
        let currentStepId: string | null = config.steps[0]?.id ?? null

        // loop sampai tidak ada step berikutnya
        while (currentStepId !== null) {
            // cari step berdasarkan id
            const step = config.steps.find(s => s.id === currentStepId)

            // kalau step tidak ditemukan = stop
            if (!step) break

            if (step.type === 'condition') {
                // evaluasi kondisi
                const passed = evaluateCondition(step, currentTask)
                
                stepLogs.push({
                    stepId: step.id,
                    type: 'condition',
                    status: 'success',
                    input: step.config as Record<string, unknown>,
                    output: passed ? 'true' : 'false',
                })

                // tentukan step berikutnya berdasarkan hasil kondisi
                currentStepId = passed
                    ? (step.nextOnTrue ?? null)
                    : (step.nextOnFalse ?? null)

            } else if (step.type === 'action') {
                // jalankan aksi
                try {
                    const output = await executeAction(step, currentTask)

                    // refresh task setelah action - karena action bisa mengubah task
                    const refreshed = await db.select().from(tasks).where(eq(tasks.id, currentTask.id))
                    if (refreshed.length > 0) currentTask = refreshed[0]

                    stepLogs.push({
                        stepId:step.id,
                        type: 'action',
                        status: 'success',
                        input: step.config as Record<string, unknown>,
                        output,
                    })

                    currentStepId = step.next ?? null

                } catch (actionError) {
                    // aksi gagal - catat error, stop workflow
                    stepLogs.push({
                        stepId: step.id,
                        type: 'action',
                        status: 'failure',
                        input: step.config as Record<string, unknown>,
                        error: String(actionError)
                    })

                    // simpan saveExecute dengan status failure
                    await saveExecution(workflow.id, task.id, 'failure', stepLogs)
                    return
                }
            }
        }
        // semua step selesai - simpan execution dengan status success
        await saveExecution(workflow.id, task.id, 'success', stepLogs)
    } catch (error) {
        await saveExecution(workflow.id, task.id, 'failure', stepLogs)
    }
}

// EVALUATE CONDITION - cek apakah kondisi terpenuhi
function evaluateCondition(step: WorkflowStep, task: Task): boolean {
    const {field, operator, value} = step.config as {
        field: string,
        operator: string
        value: unknown
    }

    // ambil nilai field dari task
    // field bisa 'priority', 'status', 'metadata.tags'
    const taskValue = getFieldValue(task, field)

    switch (operator) {
        case 'eq': return taskValue == value
        case 'neq': return taskValue != value
        case 'gt': return Number(taskValue) > Number(value)
        case 'gte': return Number(taskValue) >= Number(value)
        case 'lt': return Number(taskValue) < Number(value)
        case 'lte': return Number(taskValue) <= Number(value)
        case 'contains':
            // cek apakah arrray metadata.tags berisi value tertentu
            if (Array.isArray(taskValue)) {
                return taskValue.includes(value)
            }
            return false
        default:
            return false
    }
}

// GET FIELD VALUE - ambil nilai field dari task
// support dot notation: 'metadata.tags'
function getFieldValue(task: Task, field: string): unknown {
    // support dot notation = misal 'metadata.tags'
    const parts = field.split('.')
    let value: unknown = task

    for(const part of parts) {
        if (value === null || value === undefined) return undefined
        value = (value as Record<string, unknown>)[part]
    }

    return value
} 

// EXECUTE ACTION - jalankan aksi ke task
async function executeAction(step: WorkflowStep, task: Task): Promise<string> {
    const config = step.config as Record<string, unknown>
    const action = config.action as string

    switch (action) {
        case 'setStatus': {
            const newStatus = config.value as string
            await db.update(tasks)
                .set({status:newStatus as any, updatedAt: new Date()})
                .where(eq(tasks.id, task.id))
            return `status set to ${newStatus}`
        }

        case 'setPriority': {
            const newPriority = Number(config.value)
            await db.update(tasks)
                .set({ priority: newPriority, updatedAt: new Date() })
                .where(eq(tasks.id, task.id))
            return `priority set to ${newPriority}`
        }

        case 'appendLog': {
            // interpolasi templete - ganti {{ task.title }} dengan nilai aslinya
            const template = config.template as string  // ← pastikan ini 'template' bukan 'templete'
            const message = interpolate(template, task)

            // tambah log ke metadata.logs
            const currentMetadata = (task.metadata as Record<string, unknown>) ?? {}
            const currentLogs = (currentMetadata.logs as string[]) ?? []

            await db.update(tasks)
                .set({
                    metadata: {
                        ...currentMetadata,
                        logs: [...currentLogs, message]
                    },
                    updatedAt: new Date()
                })
                .where(eq(tasks.id, task.id))
                
            return `logged: ${message}`
        }
    
        default:
            throw new Error(`unknown action: ${action}`)
    }
}

// INTERPOLATE — ganti {{task.title}} dengan nilai asli
function interpolate(template: string, task: Task): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
        // Wrap task supaya {{task.title}} bisa diakses
        const context = { task }
        const value = getFieldValue(context, path.trim())
        if (value === undefined || value === null) return ''
        return String(value)
    })
}

// SAVE EXECUTION — simpan hasil eksekusi ke database
async function saveExecution(
    workflowId: number,
    taskId: number,
    status: 'success' | "failure",
    steps: StepLog[]
) {
    await db.insert(workflowExecutions).values({
        workflowId,
        taskId,
        status,
        steps 
    })
}