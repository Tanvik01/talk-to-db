import { generateText } from 'ai'
import gemini from '../config/gemini.js'

const SYSTEM_PROMPT = `You are a SQL Expert. 
Convert natural language questions into SQL queries.
Database Schema: sales(id, product_name, amount, country, date).
Rules:
1. Return ONLY the raw SQL query.
2. Do not use Markdown code blocks.
3. Do not explain.
4. Do not include any text before or after the SQL.`

// Helper to convert UI messages (with parts) to Core messages (text content)
function convertToCoreMessages(messages) {
    return messages.map(m => {
        // If message has parts (new AI SDK format), join them
        if (m.parts && Array.isArray(m.parts)) {
            const textContent = m.parts
                .filter(p => p.type === 'text')
                .map(p => p.text)
                .join('')
            return {
                role: m.role,
                content: textContent
            }
        }
        // Fallback for standard messages
        return {
            role: m.role,
            content: m.content || ''
        }
    })
}

/**
 * Generate SQL from natural language using AI
 * @param {Array} messages - The chat messages from the frontend
 * @returns {Promise<string>} - The generated SQL query
 */
export async function generateSQL(messages) {
    console.log('Original messages:', JSON.stringify(messages, null, 2))

    // Convert UI messages to Core messages
    const coreMessages = convertToCoreMessages(messages)
    console.log('Converted core messages:', JSON.stringify(coreMessages, null, 2))

    try {
        // Use generateText with Gemini model
        const result = await generateText({
            model: gemini('gemini-2.0-flash'),
            system: SYSTEM_PROMPT,
            messages: coreMessages,
        })

        // Extract the SQL from the response
        const sql = result.text.trim()
        console.log('Generated SQL:', sql)

        return sql
    } catch (error) {
        console.error('Error generating SQL:', error)
        throw error
    }
}

