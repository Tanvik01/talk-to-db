import { Router } from 'express'
import { generateSQL } from '../services/ai-service.js'
import { executeQuery } from '../config/database.js'

const router = Router()

router.post('/', async (req, res) => {
    try {
        const messages = req.body.messages

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' })
        }

        // Step 1: Generate SQL from the user's natural language query
        console.log('Step 1: Generating SQL...')
        const sql = await generateSQL(messages)

        // Step 2: Execute the SQL against the database
        console.log('Step 2: Executing SQL...')
        let queryResult
        try {
            queryResult = await executeQuery(sql)
        } catch (dbError) {
            console.error('Database error:', dbError)
            return res.json({
                sql,
                error: `Database error: ${dbError.message}`,
                rows: [],
                rowCount: 0
            })
        }

        // Step 3: Return the SQL and results to the frontend
        console.log('Step 3: Returning results...')
        res.json({
            sql,
            rows: queryResult.rows,
            rowCount: queryResult.rowCount
        })

    } catch (error) {
        console.error('Chat error:', error)
        return res.status(500).json({ error: 'Failed to process chat request' })
    }
})

export default router
