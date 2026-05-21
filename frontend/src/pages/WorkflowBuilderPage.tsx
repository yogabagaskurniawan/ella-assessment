import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { workflowApi } from '../api/client'
import StepCard from '../components/workflowBuilder/StepCard'
import toast from 'react-hot-toast'

type StepType = 'condition' | 'action'

type WorkflowStep = {
  id: string
  type: StepType
  config: Record<string, unknown>
  nextOnTrue?: string
  nextOnFalse?: string
  next?: string
}

type WorkflowConfig = {
  trigger: 'task.created' | 'task.updated'
  steps: WorkflowStep[]
}

function generateId() {
  return `step-${Math.random().toString(36).slice(2, 6)}`
}

function createEmptyStep(type: StepType): WorkflowStep {
  if (type === 'condition') {
    return {
      id: generateId(),
      type: 'condition',
      config: { field: 'priority', operator: 'eq', value: '' },
      nextOnTrue: undefined,
      nextOnFalse: undefined,
    }
  }
  return {
    id: generateId(),
    type: 'action',
    config: { action: 'setStatus', value: '' },
    next: undefined,
  }
}

export default function WorkflowBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState<'task.created' | 'task.updated'>('task.created')
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [enabled, setEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Load existing workflow kalau edit mode
  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    workflowApi.get(Number(id)).then(res => {
      const w = res.data
      setName(w.name)
      setTrigger(w.config.trigger)
      setSteps(w.config.steps)
      setEnabled(w.enabled)
    }).finally(() => setLoading(false))
  }, [id])

  // ── Step Management ──────────────────────────

  function handleAddStep(type: StepType) {
    setSteps(prev => [...prev, createEmptyStep(type)])
  }

  function handleRemoveStep(stepId: string) {
    setSteps(prev => {
      const filtered = prev.filter(s => s.id !== stepId)
      // Bersihkan referensi ke step yang dihapus
      return filtered.map(s => ({
        ...s,
        nextOnTrue: s.nextOnTrue === stepId ? undefined : s.nextOnTrue,
        nextOnFalse: s.nextOnFalse === stepId ? undefined : s.nextOnFalse,
        next: s.next === stepId ? undefined : s.next,
      }))
    })
  }

  function handleUpdateStep(stepId: string, updates: Partial<WorkflowStep>) {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, ...updates } : s))
  }

  function handleUpdateStepConfig(stepId: string, key: string, value: unknown) {
    setSteps(prev => prev.map(s =>
      s.id === stepId
        ? { ...s, config: { ...s.config, [key]: value } }
        : s
    ))
  }

  function handleChangeStepType(stepId: string, type: StepType) {
    setSteps(prev => prev.map(s =>
      s.id === stepId ? createEmptyStep(type) : s
    ))
  }

  // ── Validation ───────────────────────────────

  function validate(): string[] {
    const errs: string[] = []

    if (!name.trim()) errs.push('Nama workflow wajib diisi')
    if (steps.length === 0) errs.push('Workflow harus punya minimal 1 step')

    const stepIds = steps.map(s => s.id)

    steps.forEach(step => {
      if (!step.id) errs.push(`Step harus punya ID`)

      if (step.type === 'condition') {
        if (!step.config.field) errs.push(`Step "${step.id}": field wajib diisi`)
        if (!step.config.operator) errs.push(`Step "${step.id}": operator wajib diisi`)
        if (step.config.value === '') errs.push(`Step "${step.id}": value wajib diisi`)
        if (step.nextOnTrue && !stepIds.includes(step.nextOnTrue)) {
          errs.push(`Step "${step.id}": nextOnTrue referensi step yang tidak ada`)
        }
        if (step.nextOnFalse && !stepIds.includes(step.nextOnFalse)) {
          errs.push(`Step "${step.id}": nextOnFalse referensi step yang tidak ada`)
        }
      }

      if (step.type === 'action') {
        if (!step.config.action) errs.push(`Step "${step.id}": action wajib diisi`)
        if (step.config.value === '') errs.push(`Step "${step.id}": value wajib diisi`)
        if (step.next && !stepIds.includes(step.next)) {
          errs.push(`Step "${step.id}": next referensi step yang tidak ada`)
        }
      }
    })

    return errs
  }

  // ── Save ─────────────────────────────────────

  async function handleSave() {
    const errs = validate()
    setErrors(errs)
    if (errs.length > 0) {
      toast.error('Ada kesalahan pada form!')
      return
    }

    setSaving(true)
    try {
      const config: WorkflowConfig = { trigger, steps }
      if (isEdit) {
        await workflowApi.update(Number(id), { name, enabled, config })
        toast.success('Workflow berhasil diupdate!')
      } else {
        await workflowApi.create({ name, enabled, config })
        toast.success('Workflow berhasil dibuat!')
      }
      navigate('/workflows')
    } catch {
      toast.error('Gagal menyimpan workflow')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Memuat...</div>
  }

  // Step IDs untuk dropdown next
  const stepIds = steps.map(s => s.id)

  return (
    <div className="mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Workflow' : 'Buat Workflow Baru'}
        </h1>
        <button
          onClick={() => navigate('/workflows')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Kembali
        </button>
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-red-700 mb-2">
            Ada kesalahan:
          </p>
          <ul className="list-disc list-inside">
            {errors.map((e, i) => (
              <li key={i} className="text-sm text-red-600">{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Informasi Dasar
        </h2>
        <div className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Nama Workflow <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="contoh: Auto Escalate"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Trigger */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Trigger — kapan workflow ini jalan?
            </label>
            <select
              value={trigger}
              onChange={e => setTrigger(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="task.created">Task Dibuat (task.created)</option>
              <option value="task.updated">Task Diupdate (task.updated)</option>
            </select>
          </div>

          {/* Enabled */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enabled"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              className="w-4 h-4 accent-indigo-600"
            />
            <label htmlFor="enabled" className="text-sm text-gray-700">
              Aktifkan workflow ini
            </label>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">
            Steps ({steps.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleAddStep('condition')}
              className="px-3 py-1.5 text-xs border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              + Condition
            </button>
            <button
              onClick={() => handleAddStep('action')}
              className="px-3 py-1.5 text-xs border border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
            >
              + Action
            </button>
          </div>
        </div>

        {steps.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
            <p className="text-sm">Belum ada step</p>
            <p className="text-xs mt-1">Klik "+ Condition" atau "+ Action" untuk mulai</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <div key={i}>
              <StepCard
                step={step}
                index={i}
                allStepIds={stepIds}
                onUpdate={handleUpdateStep}
                onUpdateConfig={handleUpdateStepConfig}
                onChangeType={handleChangeStepType}
                onRemove={handleRemoveStep}
              />
              {i < steps.length - 1 && (
                <div className="text-center text-gray-300 text-xl my-1">↓</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Preview JSON Config */}
      <div className="mb-4">
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-2 mb-2">
            <span className="group-open:rotate-90 transition-transform">▶</span>
            Preview JSON Config
            <span className="text-xs font-normal text-gray-400">
              (data yang tersimpan di database)
            </span>
          </summary>
          <div className="bg-gray-900 rounded-xl p-4 overflow-auto max-h-80">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {JSON.stringify({ trigger, steps }, null, 2)}
            </pre>
          </div>
        </details>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate('/workflows')}
          className="px-6 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          Batal
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Workflow'}
        </button>
      </div>
    </div>
  )
}
