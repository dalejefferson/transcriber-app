import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

type Provider = 'openai' | 'claude' | 'gemini';

const SYSTEM_PROMPT = (transcript: string) =>
  `You are an AI assistant that helps users understand video transcripts. You have access to the following transcript from a video. Answer questions about it, summarize it, extract key points, or explain concepts from it in simple terms. Be concise and helpful.\n\nTRANSCRIPT:\n${transcript}`;

function streamOpenAI(apiKey: string, transcript: string, messages: { role: string; content: string }[]) {
  const client = new OpenAI({ apiKey });
  return new ReadableStream({
    async start(controller) {
      try {
        const chatMessages: OpenAI.ChatCompletionMessageParam[] = [
          { role: 'system', content: SYSTEM_PROMPT(transcript) },
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
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) controller.enqueue(new TextEncoder().encode(content));
        }
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        controller.enqueue(new TextEncoder().encode(`\n\n[Error: ${message}]`));
        controller.close();
      }
    },
  });
}

function streamClaude(apiKey: string, transcript: string, messages: { role: string; content: string }[]) {
  const client = new Anthropic({ apiKey });
  return new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          system: SYSTEM_PROMPT(transcript),
          messages: messages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        });
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        controller.enqueue(new TextEncoder().encode(`\n\n[Error: ${message}]`));
        controller.close();
      }
    },
  });
}

function streamGemini(apiKey: string, transcript: string, messages: { role: string; content: string }[]) {
  const genAI = new GoogleGenerativeAI(apiKey);
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
            { role: 'user', parts: [{ text: `System instructions: ${SYSTEM_PROMPT(transcript)}` }] },
            { role: 'model', parts: [{ text: 'Understood. I have the transcript and will help answer questions about it.' }] },
            ...history,
          ],
        });

        const lastMessage = messages[messages.length - 1]?.content || '';
        const result = await chat.sendMessageStream(lastMessage);
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(new TextEncoder().encode(text));
        }
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        controller.enqueue(new TextEncoder().encode(`\n\n[Error: ${message}]`));
        controller.close();
      }
    },
  });
}

export async function POST(request: Request) {
  try {
    const { messages, transcript, provider = 'openai', apiKey } = await request.json();

    if (!transcript) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    // Resolve API key: request body > env var fallback (OpenAI only)
    const resolvedKey = apiKey || (provider === 'openai' ? process.env.OPENAI_API_KEY : undefined);
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
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: unknown) {
    console.error('Chat error:', error);
    const message = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
