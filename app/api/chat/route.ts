import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

type Provider = 'openai' | 'claude' | 'gemini';

// Module-level client cache to avoid re-creating clients on every request
const clientCache = new Map<string, { openai?: OpenAI; anthropic?: Anthropic; google?: GoogleGenerativeAI }>();

function getOrCreateClient<T>(apiKey: string, provider: string, factory: () => T): T {
  if (!clientCache.has(apiKey)) clientCache.set(apiKey, {});
  const cache = clientCache.get(apiKey)!;
  if (!(provider in cache)) (cache as any)[provider] = factory();
  return (cache as any)[provider] as T;
}

// System prompt as a template string for concatenation instead of function call overhead
const SYSTEM_PROMPT_PREFIX = 'You are an AI assistant that helps users understand video transcripts. You have access to the following transcript from a video. Answer questions about it, summarize it, extract key points, or explain concepts from it in simple terms. Be concise and helpful.\n\nTRANSCRIPT:\n';

const STREAM_TIMEOUT_MS = 120_000;

function streamOpenAI(apiKey: string, transcript: string, messages: { role: string; content: string }[]) {
  const client = getOrCreateClient(apiKey, 'openai', () => new OpenAI({ apiKey }));
  return new ReadableStream({
    async start(controller) {
      try {
        const chatMessages: OpenAI.ChatCompletionMessageParam[] = [
          { role: 'system', content: SYSTEM_PROMPT_PREFIX + transcript },
          ...messages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ];
        const completion = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: chatMessages,
          stream: true,
        });

        await Promise.race([
          (async () => {
            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) controller.enqueue(new TextEncoder().encode(content));
            }
          })(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out after 120 seconds')), STREAM_TIMEOUT_MS)),
        ]);

        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        controller.enqueue(new TextEncoder().encode(`\n\n[Error: ${message}]`));
        controller.close();
      }
    },
    cancel() {
      // Client disconnected - cleanup handled by GC
    },
  });
}

function streamClaude(apiKey: string, transcript: string, messages: { role: string; content: string }[]) {
  const client = getOrCreateClient(apiKey, 'anthropic', () => new Anthropic({ apiKey }));
  return new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          system: SYSTEM_PROMPT_PREFIX + transcript,
          messages: messages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        });

        await Promise.race([
          (async () => {
            for await (const event of stream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                controller.enqueue(new TextEncoder().encode(event.delta.text));
              }
            }
          })(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out after 120 seconds')), STREAM_TIMEOUT_MS)),
        ]);

        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        controller.enqueue(new TextEncoder().encode(`\n\n[Error: ${message}]`));
        controller.close();
      }
    },
    cancel() {
      // Client disconnected - cleanup handled by GC
    },
  });
}

function streamGemini(apiKey: string, transcript: string, messages: { role: string; content: string }[]) {
  const genAI = getOrCreateClient(apiKey, 'google', () => new GoogleGenerativeAI(apiKey));
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  return new ReadableStream({
    async start(controller) {
      try {
        // Build Gemini chat history from messages (all but the last user message)
        const history = messages.slice(0, -1).map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const chat = model.startChat({
          history: [
            { role: 'user', parts: [{ text: `System instructions: ${SYSTEM_PROMPT_PREFIX}${transcript}` }] },
            { role: 'model', parts: [{ text: 'Understood. I have the transcript and will help answer questions about it.' }] },
            ...history,
          ],
        });

        const lastMessage = messages[messages.length - 1]?.content || '';
        const result = await chat.sendMessageStream(lastMessage);

        await Promise.race([
          (async () => {
            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (text) controller.enqueue(new TextEncoder().encode(text));
            }
          })(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out after 120 seconds')), STREAM_TIMEOUT_MS)),
        ]);

        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        controller.enqueue(new TextEncoder().encode(`\n\n[Error: ${message}]`));
        controller.close();
      }
    },
    cancel() {
      // Client disconnected - cleanup handled by GC
    },
  });
}

export async function POST(request: Request) {
  try {
    const { messages, transcript, provider = 'openai', apiKey } = await request.json();

    // Validate provider
    const VALID_PROVIDERS = ['openai', 'claude', 'gemini'] as const;
    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` }, { status: 400 });
    }

    // Validate transcript
    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }
    if (transcript.length > 500000) {
      return NextResponse.json({ error: 'Transcript too long. Max 500K characters.' }, { status: 400 });
    }

    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }
    if (messages.length > 50) {
      return NextResponse.json({ error: 'Too many messages. Max 50.' }, { status: 400 });
    }
    for (const msg of messages) {
      if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
        return NextResponse.json({ error: 'Invalid message role' }, { status: 400 });
      }
      if (!msg.content || typeof msg.content !== 'string') {
        return NextResponse.json({ error: 'Invalid message content' }, { status: 400 });
      }
    }

    // Validate API key
    const resolvedKey = (apiKey && typeof apiKey === 'string' && apiKey.trim()) || (provider === 'openai' ? process.env.OPENAI_API_KEY : undefined);
    if (!resolvedKey) {
      return NextResponse.json(
        { error: `No API key provided for ${provider}. Please add your key in Settings.` },
        { status: 400 }
      );
    }

    let stream: ReadableStream;
    switch (provider as Provider) {
      case 'claude':
        stream = streamClaude(resolvedKey, transcript, messages);
        break;
      case 'gemini':
        stream = streamGemini(resolvedKey, transcript, messages);
        break;
      case 'openai':
      default:
        stream = streamOpenAI(resolvedKey, transcript, messages);
        break;
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, private',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: unknown) {
    console.error('Chat error:', error);
    const message = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
