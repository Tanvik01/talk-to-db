import { Router } from 'express'
import { executeQuery } from '../config/database.js'

const router = Router()

router.post('/', async (req, res) => {
    const { sql } = req.body

    if (!sql || typeof sql !== 'string') {
        return res.status(400).json({ error: 'SQL query is required' })
    }
    const trimmedSql = sql.trim().toUpperCase()
    if(trimmedSql.includes(";")){
        return res.status(400).json({
            error: 'Do not add semicolons in query'
        })
    }
    if (!trimmedSql.startsWith('SELECT')) {
        return res.status(400).json({
            error: 'Only SELECT queries are allowed for safety'
        })
    }

    try {
        console.log('Query Terminal executing:', sql)
        const result = await executeQuery(sql)
        res.json({
            sql,
            rows: result.rows,
            rowCount: result.rowCount
        })
    } catch (error) {
        console.error('Query Terminal error:', error)
        res.status(400).json({ error: error.message })
    }
})

export default router
