import { Hono } from "hono";
import { db } from "../db/connection";
import { tasks, workflowExecutions, workflows, type WorkflowConfig } from "../db/schema";
import { desc, eq } from "drizzle-orm";

export const workflowRoutes = new Hono()

//  POST /workflows - Buat workflow baru
workflowRoutes.post('/', async(c) => {
    try {
        const body = await c.req.json()

        // validasi
        if (!body.name){
            return c.json({ error: 'Name is required'}, 400)
        }
        if (!body.config) {
            return c.json({error: 'Config is required'}, 400)
        }

        // validasi config
        const configError = validateWorkflowConfig(body.config)
        if(configError) {
            return c.json({ error: configError }, 400)
        }

        const workflow = await db.insert(workflows).values({
            name: body.name,
            enabled: body.enabled ?? true,
            config: body.config,
        }).returning()

        return c.json(workflow[0], 201)
    } catch (error) {
        console.error('CREATE WORKFLOW ERROR:', error)
        return c.json({ error: 'Failed to create workflow' }, 500)
    }
})

// GET /workflows — List semua workflow
workflowRoutes.get('/', async(c) =>{
    try {
        const result = await db.select().from(workflows).orderBy(desc(workflows.createdAt))
        return c.json({
            data: result,
            total: result.length
        })
    } catch (error) {
        return c.json({ error: 'Failed to fetch workflows' }, 500)
    }
})

// GET /workflows/:id — Detail workflow
workflowRoutes.get('/:id', async(c) => {
    try {
        const id = Number(c.req.param('id'))

        if (isNaN(id)) {
            return c.json({ error: 'Invalid ID' }, 400)
        }
        const workflow = await db.select().from(workflows).where(eq(workflows.id, id))
        
        if(workflow.length === 0){
            return c.json({ error: 'Workflow not found' }, 404)
        }

        return c.json(workflow[0])
    } catch (error) {
        console.error('DETAIL WORKFLOW ERROR:', error)
        return c.json({ error: 'Failed to fetch workflow' }, 500)
    }
})

// PATCH /workflows/:id — Update workflow
workflowRoutes.patch('/:id', async (c) => {
    try {
        const id = Number(c.req.param('id'))

        if (isNaN(id)) {
            return c.json({ error: 'Invalid ID' }, 400)
        }
        const body = await c.req.json()

        const existing = await db.select().from(workflows)
            .where(eq(workflows.id, id))

        if (existing.length === 0) {
            return c.json({ error: 'Workflow not found' }, 404)
        }

        // Validasi config kalau dikirim
        if (body.config) {
            const configError = validateWorkflowConfig(body.config)
            if (configError) {
                return c.json({ error: configError }, 400)
            }
        }

        const updated = await db.update(workflows)
            .set({
                ...(body.name && { name: body.name }),
                ...(body.enabled !== undefined && { enabled: body.enabled }),
                ...(body.config && { config: body.config }),
                updatedAt: new Date(),
            })
            .where(eq(workflows.id, id))
            .returning()

        return c.json(updated[0])

    } catch (error) {
        return c.json({ error: 'Failed to update workflow' }, 500)
    }
})

// DELETE /workflows/:id — Hapus workflow
workflowRoutes.delete('/:id', async (c) => {
    try {
        const id = Number(c.req.param('id'))

        if (isNaN(id)) {
            return c.json({ error: 'Invalid ID' }, 400)
        }

        const existing = await db.select().from(workflows)
            .where(eq(workflows.id, id))

        if (existing.length === 0) {
            return c.json({ error: 'Workflow not found' }, 404)
        }

        await db.delete(workflows).where(eq(workflows.id, id))

        return c.json({ message: 'Workflow deleted successfully' })

    } catch (error) {
        return c.json({ error: 'Failed to delete workflow' }, 500)
    }
})

// ═══════════════════════════════
// GET /workflows/:id/executions — History eksekusi
// ═══════════════════════════════
workflowRoutes.get('/:id/executions', async (c) => {
    try {
        const id = Number(c.req.param('id'))

        if (isNaN(id)) {
            return c.json({ error: 'Invalid ID' }, 400)
        }

        // const executions = await db.select().from(workflowExecutions)
        //     .where(eq(workflowExecutions.workflowId, id))
        //     .orderBy(desc(workflowExecutions.ranAt))

        // Join workflow_executions dengan tasks
        const executions = await db
            .select({
                id: workflowExecutions.id,
                workflowId: workflowExecutions.workflowId,
                taskId: workflowExecutions.taskId,
                taskTitle: tasks.title,  // ← ambil dari tabel tasks
                status: workflowExecutions.status,
                steps: workflowExecutions.steps,
                ranAt: workflowExecutions.ranAt,
            })
            .from(workflowExecutions)
            .leftJoin(tasks, eq(workflowExecutions.taskId, tasks.id))
            .where(eq(workflowExecutions.workflowId, id))
            .orderBy(desc(workflowExecutions.ranAt))

        return c.json({
            data: executions,
            total: executions.length
        })

    } catch (error) {
        return c.json({ error: 'Failed to fetch executions' }, 500)
    }
})

// VALIDATE WORKFLOW CONFIG
function validateWorkflowConfig(config: WorkflowConfig): string | null {
    // cek triger valid
    const validTriggers = ['task.created', 'task.updated']
    if (!config.trigger || !validTriggers.includes(config.trigger)) {
        return 'Trigger must be task.created or task.updated'
    }

    // Cek steps ada dan tidak kosong
    if (!config.steps || config.steps.length === 0) {
        return 'Workflow must have at least one step'
    }

    // Kumpulkan semua step id — untuk cek referensi
    const stepIds = config.steps.map(s => s.id)

    for (const step of config.steps) {
        // cek id ada
        if (!step.id){
            return 'Every step must have an id'
        }

        // cek type valid
        if (!['condition', 'action'].includes(step.type)) {
            return `Step "${step.id}" type must be condition or action`
        }

        // Cek config ada
        if (!step.config) {
            return `Step "${step.id}" must have a config`
        }

        if (step.type === 'condition') {
            // Cek nextOnTrue dan nextOnFalse referensi valid
            if (step.nextOnTrue && !stepIds.includes(step.nextOnTrue)) {
                return `Step "${step.id}" nextOnTrue references unknown step "${step.nextOnTrue}"`
            }
            if (step.nextOnFalse && !stepIds.includes(step.nextOnFalse)) {
                return `Step "${step.id}" nextOnFalse references unknown step "${step.nextOnFalse}"`
            }
        }

        if (step.type === 'action') {
            // Cek next referensi valid
            if (step.next && !stepIds.includes(step.next)) {
                return `Step "${step.id}" next references unknown step "${step.next}"`
            }
        }
    }
    return null // null = valid, tidak ada error
}