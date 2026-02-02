import { createGoogleGenerativeAI } from '@ai-sdk/google'

const gemini = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
})

export default gemini
