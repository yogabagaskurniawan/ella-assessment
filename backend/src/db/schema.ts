import { boolean, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

// TABEL TASKS
export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'done'])

export const tasks = pgTable("tasks", {
    id: serial('id').primaryKey(),
    title: text("title").notNull(),
    // nilai valid: 'todo' | 'in_progress' | 'done'
    status: taskStatusEnum("status").notNull().default('todo'),
    // nilai valid: '1' | '2' | '3' | '4' | '5'
    priority: integer('priority').notNull().default(1),
    metadata: jsonb("metadata").notNull().$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TABEL WORKFLOW
export type WorkflowConfig = {
    trigger: 'task.created' | 'task.updated'  // kapan workflow jalan
    steps: WorkflowStep[]                      // langkah-langkahnya
}
export type WorkflowStep = {
    id: string           // unik per step, misal "check-priority"
    type: 'condition' | 'action'
    config: Record<string, unknown>  // konfigurasi spesifik tiap step
    nextOnTrue?: string  // lanjut ke step mana kalau kondisi TRUE
    nextOnFalse?: string // lanjut ke step mana kalau kondisi FALSE
    next?: string        // untuk action (tidak bercabang)
}

export const workflows = pgTable('workflows', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    config: jsonb('config').$type<WorkflowConfig>().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// TABEL WORKFLOW EXECUTIONS
export const executionStatusEnum = pgEnum('execution_status', ['success', 'failure'])

export type StepLog = {
    stepId: string
    type: 'condition' | 'action'
    status: 'success' | 'failure' | 'skipped'
    input?: Record<string, unknown>
    output?: string
    error?: string
}

export const workflowExecutions = pgTable('workflow_executions', {
    id: serial('id').primaryKey(),
    workflowId: integer('workflow_id').references(() => workflows.id).notNull(),
    taskId: integer('task_id').references(() => tasks.id).notNull(),
    status: executionStatusEnum('status').notNull(),
    steps: jsonb('steps').$type<StepLog[]>().notNull().default([]),
    ranAt: timestamp('ran_at').defaultNow().notNull(),
})