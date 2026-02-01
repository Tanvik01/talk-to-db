import { generateSQLFromChat } from '../services/ai-service.js'

export async function handleChat(req, res) {
    try {
        const { messages } = req.body

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' })
        }

        const result = await generateSQLFromChat(messages)

        // Stream the response
        return result.toTextStreamResponse()
    } catch (error) {
        console.error('Chat error:', error)
        return res.status(500).json({ error: 'Failed to process chat request' })
    }
}
