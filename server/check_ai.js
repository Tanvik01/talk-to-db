
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

console.log('Checking streamText result prototype...');

async function check() {
    const model = createOpenAI({
        apiKey: 'test',
    })('gpt-3.5-turbo');

    try {
        const result = streamText({
            model,
            prompt: 'hello',
        });

        console.log('Result keys:', Object.keys(result));
        console.log('Has pipeDataStreamToResponse:', typeof result.pipeDataStreamToResponse);
        console.log('Has toDataStreamResponse:', typeof result.toDataStreamResponse);
    } catch (e) {
        console.log('Error creating stream (expected due to no key):', e.message);
        // Since we can't easily execute without a key, we might have to rely on type definitions or assume `toDataStreamResponse` exists if `pipe` failed.
    }
}

// Just checking if I can inspect the prototype/definition without full execution
// It's hard without successful execution.
