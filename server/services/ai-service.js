import 'dotenv/config'
import { generateText } from 'ai'
import { getGeminiModel } from '../config/gemini.js'

const SYSTEM_PROMPT = `You are a SQL Expert. 
Convert natural language questions into SQLite queries.
Database Schema: sales(id, product_name, amount, country, date).
Rules:
1. Return ONLY the raw SQL query.
2. Do not use Markdown code blocks or backticks.
3. Do not explain.
4. Do not include any text before or after the SQL.
5. Use standard SELECT queries.`

// Helper to convert UI messages to Core messages
function convertToCoreMessages(messages) {
    return messages.map(m => {
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
        return {
            role: m.role,
            content: m.content || ''
        }
    })
}

/**
 * Fallback SQL generator for common questions if no API key is set
 */
function generateFallbackSQL(userQuery) {
    const q = userQuery.toLowerCase();
    if (q.includes('india')) {
        return "SELECT * FROM sales WHERE LOWER(country) = 'india'";
    }
    if (q.includes('usa') || q.includes('united states')) {
        return "SELECT * FROM sales WHERE LOWER(country) = 'usa'";
    }
    if (q.includes('total') && (q.includes('country') || q.includes('by country'))) {
        return "SELECT country, SUM(amount) AS total_amount FROM sales GROUP BY country ORDER BY total_amount DESC";
    }
    if (q.includes('total') || q.includes('sum')) {
        return "SELECT SUM(amount) AS total_sales FROM sales";
    }
    if (q.includes('product')) {
        return "SELECT product_name, SUM(amount) AS total_amount, COUNT(*) AS count FROM sales GROUP BY product_name ORDER BY total_amount DESC";
    }
    return "SELECT * FROM sales LIMIT 10";
}

/**
 * Generate SQL from natural language using AI
 * @param {Array} messages - The chat messages from the frontend
 * @returns {Promise<string>} - The generated SQL query
 */
export async function generateSQL(messages) {
    console.log('Original messages:', JSON.stringify(messages, null, 2))

    const coreMessages = convertToCoreMessages(messages)
    console.log('Converted core messages:', JSON.stringify(coreMessages, null, 2))

    const lastMessage = coreMessages[coreMessages.length - 1]?.content || ''

    try {
        const model = getGeminiModel('gemini-2.5-flash')

        const result = await generateText({
            model,
            system: SYSTEM_PROMPT,
            messages: coreMessages,
        })

        let sql = result.text.trim()
        // Strip any markdown code blocks if model returned them
        sql = sql.replace(/```sql/gi, '').replace(/```/g, '').trim()
        console.log('Generated SQL:', sql)

        return sql
    } catch (error) {
        console.error('Gemini API Error:', error.message)
        
        // If API key is missing, provide fallback so demo continues working
        if (error.message.includes('API key is missing') || error.message.includes('API_KEY')) {
            console.log('Using demo fallback SQL generator for:', lastMessage)
            const fallbackSql = generateFallbackSQL(lastMessage)
            console.log('Fallback Generated SQL:', fallbackSql)
            return fallbackSql
        }

        throw error
    }
}
