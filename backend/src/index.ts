import { Hono } from "hono";
import { cors } from "hono/cors";
import { taskRoutes } from "./routes/tasks";
import { workflowRoutes } from "./routes/workflows";

const app = new Hono

// untuk mengizinkan semua origin untuk mengakses API
app.use('*', cors())

app.get('/', (c) => c.json({ status: 'ok', message: 'Ella API is running!' }))

// Daftarkan task routes
app.route('/tasks', taskRoutes)
// Daftarkan workflow routes
app.route('/workflows', workflowRoutes)

export default {
    port: process.env.PORT || 3000,
    hostname: '0.0.0.0',  // ← tambahkan ini
    fetch: app.fetch,
}