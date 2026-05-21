import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000',
    headers: {
        'Content-Type': 'application/json',
    },
})

// TASK
export const taskApi = {
    // GET /tasks
    list: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
        api.get('/tasks', {params}),

    // POST /tasks
    create: (data: {title:string; priority?:number; metadata?: object}) =>
        api.post('/tasks', data),

    // PATCH /task/:id
    update: (id: number, data: object) =>
        api.patch(`/tasks/${id}`, data),

    // Delete /task/:id
    delete: (id: number) =>
        api.delete(`/tasks/${id}`),
}

// WORKFLOWS 
export const workflowApi = {
    // GET /workflows
    list: () => api.get('/workflows'),

    // GET /workflows/:id
    get: (id: number) => api.get(`/workflows/${id}`),

    // POST /workflows
    create: (data: object) => api.post('/workflows', data),

    // PATCH /workflows/:id
    update: (id: number, data: object) => api.patch(`/workflows/${id}`, data),

    // DELETE /workflows/:id
    delete: (id: number) => api.delete(`/workflows/${id}`),

    // GET /workflows/:id/executions
    executions: (id: number) => api.get(`/workflows/${id}/executions`),
}

export default api








