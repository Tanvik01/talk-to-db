import express from 'express'
import cors from 'cors'
import routes from './routes/index.js'
import { errorHandler } from './middleware/error-handler.js'

const app = express()


app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174', 'https://talk-to-db.netlify.app'],
    credentials: true,
}))
app.use(express.json())

// Routes
app.use('/api', routes)

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
})

// Error handling
app.use(errorHandler)

export default app
