import { db } from './connection'
import { tasks, workflowExecutions, workflows } from './schema'

async function seed() {
    console.log('🌱 Checking database...')
    // Cek apakah workflows sudah ada
    const existing = await db.select().from(workflows)
    if (existing.length > 0) {
        console.log('✓ Database sudah ada data, skip seeding')
        process.exit(0)
    }

    console.log('🌱 Seeding database...')

    // ── Hapus data lama ──────────────────────────
    await db.delete(workflowExecutions)
    await db.delete(workflows)
    await db.delete(tasks)
    console.log('✓ Cleared existing data')

    // ── Seed Workflows ───────────────────────────

    // 1. Auto Escalate
    await db.insert(workflows).values({
        name: 'Auto Escalate',
        enabled: true,
        config: {
            trigger: 'task.created',
            steps: [
                {
                    id: 'cek-priority-5',
                    type: 'condition',
                    config: { field: 'priority', operator: 'eq', value: 5 },
                    nextOnTrue: 'set-in-progress',
                    nextOnFalse: undefined,
                },
                {
                    id: 'set-in-progress',
                    type: 'action',
                    config: { action: 'setStatus', value: 'in_progress' },
                    next: 'log-critical',
                },
                {
                    id: 'log-critical',
                    type: 'action',
                    config: {
                        action: 'appendLog',
                        value: 'Critical task started: {{task.title}}',
                        template: 'Critical task started: {{task.title}}',
                    },
                    next: undefined,
                },
            ],
        },
    })
    console.log('✓ Created workflow: Auto Escalate')

    // 2. Tag-driven Priority (on create)
    await db.insert(workflows).values({
        name: 'Tag-driven Priority',
        enabled: true,
        config: {
            trigger: 'task.created',
            steps: [
                {
                    id: 'cek-tag-bug',
                    type: 'condition',
                    config: { field: 'metadata.tags', operator: 'contains', value: 'bug' },
                    nextOnTrue: 'cek-priority-rendah',
                    nextOnFalse: undefined,
                },
                {
                    id: 'cek-priority-rendah',
                    type: 'condition',
                    config: { field: 'priority', operator: 'lt', value: 4 },
                    nextOnTrue: 'set-priority-4',
                    nextOnFalse: undefined,
                },
                {
                    id: 'set-priority-4',
                    type: 'action',
                    config: { action: 'setPriority', value: 4 },
                    next: undefined,
                },
            ],
        },
    })
    console.log('✓ Created workflow: Tag-driven Priority')

    // 3. Tag-driven Priority (on update)
    await db.insert(workflows).values({
        name: 'Tag-driven Priority (on update)',
        enabled: true,
        config: {
            trigger: 'task.updated',
            steps: [
                {
                    id: 'cek-tag-bug',
                    type: 'condition',
                    config: { field: 'metadata.tags', operator: 'contains', value: 'bug' },
                    nextOnTrue: 'cek-priority-rendah',
                    nextOnFalse: undefined,
                },
                {
                    id: 'cek-priority-rendah',
                    type: 'condition',
                    config: { field: 'priority', operator: 'lt', value: 4 },
                    nextOnTrue: 'set-priority-4',
                    nextOnFalse: undefined,
                },
                {
                    id: 'set-priority-4',
                    type: 'action',
                    config: { action: 'setPriority', value: 4 },
                    next: undefined,
                },
            ],
        },
    })
    console.log('✓ Created workflow: Tag-driven Priority (on update)')

    // 4. Smart Routing — ini yang punya branching TRUE dan FALSE
    await db.insert(workflows).values({
        name: 'Smart Routing',
        enabled: true,
        config: {
            trigger: 'task.created',
            steps: [
                {
                    id: 'cek-priority-tinggi',
                    type: 'condition',
                    config: { field: 'priority', operator: 'gte', value: 4 },
                    nextOnTrue: 'set-in-progress',
                    nextOnFalse: 'log-queued',
                    // ↑ ini contoh branching — TRUE ke satu action, FALSE ke action lain
                },
                {
                    id: 'set-in-progress',
                    type: 'action',
                    config: { action: 'setStatus', value: 'in_progress' },
                    next: undefined,
                },
                {
                    id: 'log-queued',
                    type: 'action',
                    config: {
                        action: 'appendLog',
                        value: 'queued: {{task.title}}',
                        template: 'queued: {{task.title}}',
                    },
                    next: undefined,
                },
            ],
        },
    })
    console.log('✓ Created workflow: Smart Routing')

    // 5. Completion Tracking
    await db.insert(workflows).values({
        name: 'Completion Tracking',
        enabled: true,
        config: {
            trigger: 'task.updated',
            steps: [
                {
                    id: 'cek-status-done',
                    type: 'condition',
                    config: { field: 'status', operator: 'eq', value: 'done' },
                    nextOnTrue: 'log-completion',
                    nextOnFalse: undefined,
                },
                {
                    id: 'log-completion',
                    type: 'action',
                    config: {
                        action: 'appendLog',
                        value: 'Completed: {{task.title}} at {{task.updatedAt}}',
                        template: 'Completed: {{task.title}} at {{task.updatedAt}}',
                    },
                    next: undefined,
                },
            ],
        },
    })
    console.log('✓ Created workflow: Completion Tracking')

    // ── Seed Tasks ───────────────────────────────
    await db.insert(tasks).values([
        {
            title: 'Server down!',
            priority: 5,
            status: 'in_progress',
            metadata: { logs: ['Critical task started: Server down!'] },
        },
        {
            title: 'Fix login bug',
            priority: 4,
            status: 'todo',
            metadata: { tags: ['bug'] },
        },
        {
            title: 'Update documentation',
            priority: 2,
            status: 'todo',
            metadata: { logs: ['queued: Update documentation'] },
        },
    ])
    console.log('✓ Created 3 example tasks')

    console.log('\n✅ Seeding complete!')
    process.exit(0)
}

seed().catch(err => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
})