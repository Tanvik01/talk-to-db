import { createOpenAI } from '@ai-sdk/openai'

const ollama = createOpenAI({
    baseURL: 'http://localhost:11434/v1/',
    apiKey: 'ollama',
})

export default ollama
