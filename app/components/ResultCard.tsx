'use client';

import React from 'react';
import {
  DocumentIcon,
  SparklesIcon,
  CopyIcon,
  CheckIcon,
  SendIcon,
  YouTubeIcon,
  XIcon,
  ChevronDownIcon,
  Spinner,
} from './icons';

interface Segment {
  text: string;
  start: number;
  end: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface TranscriptionResult {
  id: string;
  url: string;
  transcript: string;
  segments: Segment[];
  messages: ChatMessage[];
  chatInput: string;
  isStreaming: boolean;
  copied: boolean;
  expanded: boolean;
}

type Provider = "openai" | "claude" | "gemini";

const PROVIDER_INFO: Record<Provider, { label: string; color: string }> = {
  openai: { label: "OpenAI", color: "bg-emerald-500" },
  claude: { label: "Claude", color: "bg-orange-500" },
  gemini: { label: "Gemini", color: "bg-blue-500" },
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function detectPlatform(url: string): "youtube" | "twitter" | null {
  if (/^https?:\/\/(www\.)?(youtube\.com\/(watch|shorts)|youtu\.be\/|m\.youtube\.com\/watch)/i.test(url)) return "youtube";
  if (/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//i.test(url)) return "twitter";
  return null;
}

const PRESETS = ["Summarize", "Key Takeaways", "ELI5", "Action Items", "Like I'm 12"];

interface ResultCardProps {
  result: TranscriptionResult;
  provider: Provider;
  onToggleExpanded: (id: string) => void;
  onCopy: (id: string) => void;
  onChat: (resultId: string, userMessage: string) => void;
  onPreset: (resultId: string, preset: string) => void;
  onUpdateChatInput: (resultId: string, value: string) => void;
}

export const ResultCard = React.memo(function ResultCard({
  result,
  provider,
  onToggleExpanded,
  onCopy,
  onChat,
  onPreset,
  onUpdateChatInput,
}: ResultCardProps) {
  return (
    <div
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all animate-fade-in"
    >
      {/* Accordion Header */}
      <button
        onClick={() => onToggleExpanded(result.id)}
        className="flex w-full items-center gap-3 px-6 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <span className="shrink-0">
          {detectPlatform(result.url) === "youtube" ? (
            <span className="text-red-500 dark:text-red-400"><YouTubeIcon /></span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400"><XIcon /></span>
          )}
        </span>
        <span className="flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-300">
          {result.url}
        </span>
        {!result.transcript && (
          <span className="shrink-0 rounded-full bg-red-100 dark:bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
            Error
          </span>
        )}
        {result.transcript && (
          <span className="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            Done
          </span>
        )}
        <ChevronDownIcon
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${
            result.expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Accordion Content */}
      {result.expanded && (
        <div className="border-t border-slate-200 dark:border-slate-800">
          <div className="grid gap-6 p-6 lg:grid-cols-2">
            {/* Left Column - Transcript Panel */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DocumentIcon />
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Transcript
                  </h2>
                </div>
                {result.transcript && (
                  <button
                    onClick={() => onCopy(result.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 transition-colors hover:border-cyan-600 hover:text-cyan-600 dark:hover:text-cyan-400"
                  >
                    {result.copied ? (
                      <>
                        <CheckIcon />
                        Copied
                      </>
                    ) : (
                      <>
                        <CopyIcon />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="max-h-[500px] space-y-3 overflow-y-auto pr-2">
                {result.segments.length > 0
                  ? result.segments.map((seg, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="mt-0.5 shrink-0 rounded bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-xs text-cyan-600 dark:text-cyan-400">
                          {formatTime(seg.start)}
                        </span>
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                          {seg.text}
                        </p>
                      </div>
                    ))
                  : result.transcript ? (
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {result.transcript}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                      No transcript available.
                    </p>
                  )}
              </div>
            </div>

            {/* Right Column - AI Chat Panel */}
            <div className="flex max-h-[600px] flex-col rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
              <div className="border-b border-slate-200 dark:border-slate-700/50 p-5 pb-3">
                <div className="flex items-center gap-2">
                  <SparklesIcon />
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    AI Assistant
                  </h2>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${PROVIDER_INFO[provider].color}`}>
                    {PROVIDER_INFO[provider].label}
                  </span>
                </div>

                {/* Preset Buttons */}
                {result.transcript && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => onPreset(result.id, preset)}
                        disabled={result.isStreaming}
                        className="rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1 text-xs text-slate-600 dark:text-slate-300 transition-all hover:border-cyan-600/40 hover:bg-cyan-50 dark:hover:bg-cyan-600/20 hover:text-cyan-600 dark:hover:text-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {result.messages.length === 0 && (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-center text-sm text-slate-400 dark:text-slate-500">
                      Ask anything about the transcript or use a preset above.
                    </p>
                  </div>
                )}

                {result.messages.map((msg, i) => (
                  <div
                    key={`${msg.role}-${i}`}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "rounded-2xl rounded-br-md bg-cyan-50 dark:bg-cyan-600/20 text-cyan-900 dark:text-cyan-100"
                          : "rounded-2xl rounded-bl-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {msg.content}
                      {msg.role === "assistant" && msg.content === "" && result.isStreaming && (
                        <span className="inline-block h-4 w-1 animate-pulse bg-cyan-600 dark:bg-cyan-400" />
                      )}
                    </div>
                  </div>
                ))}

                {result.isStreaming &&
                  result.messages.length > 0 &&
                  result.messages[result.messages.length - 1].content !== "" &&
                  result.messages[result.messages.length - 1].role === "assistant" && (
                    <div className="flex justify-start">
                      <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-cyan-600 dark:bg-cyan-400" />
                    </div>
                  )}
              </div>

              {/* Chat Input Area */}
              {result.transcript && (
                <div className="border-t border-slate-200 dark:border-slate-700/50 p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={result.chatInput}
                      onChange={(e) => onUpdateChatInput(result.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !result.isStreaming)
                          onChat(result.id, result.chatInput);
                      }}
                      placeholder="Ask about the transcript..."
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/40"
                      disabled={result.isStreaming}
                    />
                    <button
                      onClick={() => onChat(result.id, result.chatInput)}
                      disabled={result.isStreaming || !result.chatInput.trim()}
                      className="flex items-center justify-center rounded-xl bg-cyan-600 px-4 py-2.5 text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {result.isStreaming ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <SendIcon />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
