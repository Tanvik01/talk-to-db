import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import routes from './routes/index.js'
import { errorHandler } from './middleware/error-handler.js'

const app = express()

app.use(cors({
    origin: (origin, callback) => {
        // Allow all local, Vercel, Netlify, or undefined origins (e.g. mobile/curl)
        if (!origin || 
            origin.includes('localhost') || 
            origin.includes('127.0.0.1') || 
            origin.includes('vercel.app') || 
            origin.includes('netlify.app') ||
            (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)
        ) {
            callback(null, true);
        } else {
            callback(null, true);
        }
    },
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
