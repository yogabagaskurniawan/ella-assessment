import { Hono } from "hono";
import { db } from '../db/connection'
import { tasks, workflowExecutions } from '../db/schema'
import { and, desc, eq, ilike } from "drizzle-orm";
import { runWorkflows } from "../workflows/engine";

export const taskRoutes = new Hono()

// POST /task - buat task baru
taskRoutes.post('/', async(c) => {
    try {
        const body = await c.req.json()

        // validasi title
        if (!body.title) {
            return c.json({ error: 'Title is requirwd'}, 400)
        }

        // validasi priority 1-5
        if (body.priority && (body.priority < 1 || body.priority > 5)) {
            return c.json({ error: 'Priority must be between 1 and 5'}, 400)
        }

        // Validasi status
        const validStatus = ['todo', 'in_progress', 'done']
        if (body.status && !validStatus.includes(body.status)) {
            return c.json({ error: 'Status must be todo, in_progress, or done' }, 400)
        }

        // // Validasi metadata
        if (body.metadata !== undefined) {
            if (
                typeof body.metadata !== 'object' || 
                Array.isArray(body.metadata) || 
                body.metadata === null
            ) {
                return c.json({ error: 'Metadata must be a JSON object' }, 400)
            }
        }

        const task = await db.insert(tasks).values({
            title: body.title,
            status: body.status ?? 'todo',
            priority: body.priority ?? 1,
            metadata: body.metadata ?? {},
        }).returning()

        // panggil engine setelah task dibuat
        await runWorkflows('task.created', task[0])

        // Ambil data terbaru SETELAH engine jalan
        // karena engine mungkin sudah mengubah task
        const updatedTask = await db.select().from(tasks).where(eq(tasks.id, task[0].id))

        return c.json(updatedTask[0], 201)
        
    } catch (error) {
        // console.error('CREATE TASK ERROR:', error)
        return c.json({ error: 'Failed to create task'}, 500)
    }
})

// GET /task - list semua task
taskRoutes.get('/', async(c) => {
    try {
        const page = Number(c.req.query('page') ?? 1)
        const limit = Number(c.req.query('limit') ?? 10)
        const search = c.req.query('search')
        const status = c.req.query('status')
        const offset = (page - 1) * limit

        // Bangun conditions
        const conditions = []
        if (status) {
            conditions.push(eq(tasks.status, status as any))
        }
        if (search) {
            conditions.push(ilike(tasks.title, `%${search}%`))
        }

        // Query data dengan pagination
        let query = db.select().from(tasks).$dynamic()
        if (conditions.length > 0) {
            query = query.where(and(...conditions))
        }
        query = query.orderBy(desc(tasks.createdAt)).limit(limit).offset(offset)
        const result = await query

        // Hitung total dengan filter yang sama
        let countQuery = db.select().from(tasks).$dynamic()
        if (conditions.length > 0) {
            countQuery = countQuery.where(and(...conditions))
        }
        const totalResult = await countQuery
        const total = totalResult.length

        return c.json({
            data: result,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 0
        })

    } catch (error) {
        console.error('FETCH TASKS ERROR:', error)
        return c.json({ error: 'Failed to fetch tasks' }, 500)
    }
})

// PATCH /task/:id - update task
taskRoutes.patch('/:id', async(c) => {
    try {
        const id = Number(c.req.param('id'))

        if (isNaN(id)) {
            return c.json({ error: 'Invalid ID' }, 400)
        }
        const body = await c.req.json()

        // validasi title
        // if (!body.title) {
        //     return c.json({ error: 'Title is requirwd'}, 400)
        // }

        // Validasi priority kalau dikirim
        if (body.priority && (body.priority < 1 || body.priority > 5)) {
            return c.json({ error: 'Priority must be between 1 and 5' }, 400)
        }

        // Validasi status kalau dikirim
        const validStatus = ['todo', 'in_progress', 'done']
        if (body.status && !validStatus.includes(body.status)) {
            return c.json({ error: 'Status must be todo, in_progress, or done' }, 400)
        }

        // // Validasi metadata
        if (body.metadata !== undefined) {
            if (
                typeof body.metadata !== 'object' || 
                Array.isArray(body.metadata) || 
                body.metadata === null
            ) {
                return c.json({ error: 'Metadata must be a JSON object' }, 400)
            }
        }

        // cek task ada tidak
        const existing = await db.select().from(tasks).where(eq(tasks.id, id))
        if (existing.length === 0 ){
            return c.json({ error: "Task not found"}, 404)
        }

        // update
        const update = await db.update(tasks)
            .set({
                ...(body.title && { title: body.title }),
                ...(body.status && { status: body.status }),
                ...(body.priority && { priority: body.priority }),
                ...(body.metadata && { metadata: body.metadata }),
                updatedAt: new Date()
            })
            .where(eq(tasks.id, id))
            .returning()

        // panggil engine setelah task diupdate
        await runWorkflows('task.updated', update[0])

        const updatedTask = await db.select().from(tasks).where(eq(tasks.id, update[0].id))

        return c.json(updatedTask[0], 201)
    } catch (error) {
        return c.json({ error: 'Failed to update task' }, 500)
    }
})

taskRoutes.delete('/:id', async(c) => {
    try {
        const id = Number(c.req.param('id'))

        if (isNaN(id)) {
            return c.json({ error: 'Invalid ID' }, 400)
        }

        const existing = await db.select().from(tasks).where(eq(tasks.id, id))
        if (existing.length === 0) {
            return c.json({ error: 'Task not found' }, 404)
        }

        // Hapus executions yang terkait dulu
        // karena ada foreign key constraint
        await db.delete(workflowExecutions).where(eq(workflowExecutions.taskId, id))

        // Baru hapus task-nya
        await db.delete(tasks).where(eq(tasks.id, id))

        return c.json({ message: 'Task deleted successfully' })
    } catch (error) {
        return c.json({ error: 'Failed to delete task' }, 500)
    }
})