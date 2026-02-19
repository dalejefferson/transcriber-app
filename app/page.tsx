"use client";

import { useState, useRef, useEffect } from "react";

interface Segment {
  text: string;
  start: number;
  end: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// --- Inline SVG Icons ---

function DocumentIcon() {
  return (
    <svg
      className="h-5 w-5 text-cyan-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg
      className="h-5 w-5 text-cyan-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
      />
    </svg>
  );
}

type Provider = "openai" | "claude" | "gemini";

const PROVIDER_INFO: Record<Provider, { label: string; color: string }> = {
  openai: { label: "OpenAI", color: "bg-emerald-500" },
  claude: { label: "Claude", color: "bg-orange-500" },
  gemini: { label: "Gemini", color: "bg-blue-500" },
};

function GearIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeSlashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// --- Main Page Component ---

export default function Home() {
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [provider, setProvider] = useState<Provider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Load settings from localStorage
  useEffect(() => {
    const savedProvider = localStorage.getItem("transcriber_provider") as Provider | null;
    const savedKey = localStorage.getItem("transcriber_apiKey");
    if (savedProvider) setProvider(savedProvider);
    if (savedKey) setApiKey(savedKey);
  }, []);

  // Close settings on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    }
    if (showSettings) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSettings]);

  function saveSettings() {
    localStorage.setItem("transcriber_provider", provider);
    localStorage.setItem("transcriber_apiKey", apiKey);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setShowSettings(false);
    }, 800);
  }

  // Auto-scroll chat messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fade in content when transcript loads
  useEffect(() => {
    if (transcript) {
      const timer = setTimeout(() => setShowContent(true), 50);
      return () => clearTimeout(timer);
    }
    setShowContent(false);
  }, [transcript]);

  async function handleTranscribe() {
    if (!url.trim()) return;
    setIsTranscribing(true);
    setError("");
    setTranscript("");
    setSegments([]);
    setMessages([]);

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Transcription failed. Please try again.");
        return;
      }

      setTranscript(data.transcript);
      setSegments(data.segments);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsTranscribing(false);
    }
  }

  async function handleChat(userMessage: string) {
    if (!userMessage.trim() || isStreaming) return;

    const newUserMsg: ChatMessage = { role: "user", content: userMessage };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setChatInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          transcript,
          provider,
          apiKey,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              errData.error || "Sorry, something went wrong. Please try again.",
          },
        ]);
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Failed to read response stream." },
        ]);
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let assistantContent = "";

      // Add placeholder assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: assistantContent,
          };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error. Please check your connection.",
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }

  function handlePreset(preset: string) {
    const prompts: Record<string, string> = {
      Summarize:
        "Give me a concise summary of this transcript in bullet points.",
      "Key Takeaways":
        "What are the top 5 key takeaways from this transcript?",
      ELI5: "Explain what this video is about like I'm 5 years old.",
      "Action Items":
        "What are the actionable items or advice from this transcript?",
    };
    const prompt = prompts[preset];
    if (prompt) handleChat(prompt);
  }

  function handleCopy() {
    const fullText = segments
      .map((seg) => `[${formatTime(seg.start)}] ${seg.text}`)
      .join("\n");
    navigator.clipboard.writeText(fullText || transcript).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const presets = ["Summarize", "Key Takeaways", "ELI5", "Action Items"];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="relative py-12 text-center">
          {/* Settings Gear Button */}
          <div className="absolute right-0 top-12" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-400 transition-all hover:border-cyan-600 hover:text-cyan-400"
            >
              <GearIcon />
              <span className={`h-2 w-2 rounded-full ${PROVIDER_INFO[provider].color}`} />
              <span className="text-xs">{PROVIDER_INFO[provider].label}</span>
            </button>

            {/* Settings Dropdown */}
            {showSettings && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl shadow-black/40">
                <h3 className="mb-4 text-sm font-semibold text-white">AI Provider Settings</h3>

                {/* Provider Selection */}
                <div className="mb-4 flex gap-2">
                  {(Object.keys(PROVIDER_INFO) as Provider[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setProvider(p)}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        provider === p
                          ? "border border-cyan-500 bg-cyan-600/20 text-cyan-300"
                          : "border border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                      }`}
                    >
                      <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${PROVIDER_INFO[p].color}`} />
                      {PROVIDER_INFO[p].label}
                    </button>
                  ))}
                </div>

                {/* API Key Input */}
                <label className="mb-1.5 block text-xs text-slate-400">
                  {PROVIDER_INFO[provider].label} API Key
                </label>
                <div className="relative mb-4">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`Enter your ${PROVIDER_INFO[provider].label} API key...`}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 pr-10 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKey ? <EyeSlashIcon /> : <EyeIcon />}
                  </button>
                </div>

                {/* Save Button */}
                <button
                  onClick={saveSettings}
                  className={`w-full rounded-lg py-2 text-sm font-semibold transition-all ${
                    saved
                      ? "bg-emerald-600 text-white"
                      : "bg-cyan-600 text-white hover:bg-cyan-500"
                  }`}
                >
                  {saved ? "Saved!" : "Save"}
                </button>
              </div>
            )}
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white">
            Transcriber
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-400">
            Paste any X/Twitter video URL to get an instant transcript +
            AI-powered insights
          </p>

          {/* URL Input Row */}
          <div className="mx-auto mt-8 flex max-w-2xl gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isTranscribing) handleTranscribe();
              }}
              placeholder="https://x.com/user/status/..."
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/40"
              disabled={isTranscribing}
            />
            <button
              onClick={handleTranscribe}
              disabled={isTranscribing || !url.trim()}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isTranscribing ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span>Transcribing...</span>
                </>
              ) : (
                "Transcribe"
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <p className="mx-auto mt-4 max-w-2xl text-sm text-red-400">
              {error}
            </p>
          )}

          {/* Progress Bar */}
          {isTranscribing && (
            <div className="mx-auto mt-6 max-w-2xl">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-600" />
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Downloading and transcribing audio... This may take a minute.
              </p>
            </div>
          )}
        </div>

        {/* Content Section - Two Column Grid */}
        {transcript && (
          <div
            className={`grid gap-6 pb-12 transition-all duration-500 lg:grid-cols-2 ${
              showContent
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            }`}
          >
            {/* Left Column - Transcript Panel */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DocumentIcon />
                  <h2 className="text-lg font-semibold text-white">
                    Transcript
                  </h2>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-600 hover:text-cyan-400"
                >
                  {copied ? (
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
              </div>

              <div
                ref={transcriptRef}
                className="max-h-[600px] space-y-3 overflow-y-auto pr-2"
              >
                {segments.length > 0
                  ? segments.map((seg, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="mt-0.5 shrink-0 rounded bg-slate-800 px-2 py-0.5 text-xs text-cyan-400">
                          {formatTime(seg.start)}
                        </span>
                        <p className="text-sm leading-relaxed text-slate-300">
                          {seg.text}
                        </p>
                      </div>
                    ))
                  : (
                    <p className="text-sm leading-relaxed text-slate-300">
                      {transcript}
                    </p>
                  )}
              </div>
            </div>

            {/* Right Column - AI Chat Panel */}
            <div className="flex max-h-[700px] flex-col rounded-2xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 p-6 pb-4">
                <div className="flex items-center gap-2">
                  <SparklesIcon />
                  <h2 className="text-lg font-semibold text-white">
                    AI Assistant
                  </h2>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${PROVIDER_INFO[provider].color}`}>
                    {PROVIDER_INFO[provider].label}
                  </span>
                </div>

                {/* Preset Buttons */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePreset(preset)}
                      disabled={isStreaming}
                      className="rounded-full border border-slate-700 bg-slate-800 px-4 py-1.5 text-sm text-slate-300 transition-all hover:border-cyan-600/40 hover:bg-cyan-600/20 hover:text-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 space-y-4 overflow-y-auto p-6">
                {messages.length === 0 && (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-center text-sm text-slate-500">
                      Ask anything about the transcript or use a preset above to
                      get started.
                    </p>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "rounded-2xl rounded-br-md bg-cyan-600/20 text-cyan-100"
                          : "rounded-2xl rounded-bl-md bg-slate-800 text-slate-200"
                      }`}
                    >
                      {msg.content}
                      {msg.role === "assistant" &&
                        msg.content === "" &&
                        isStreaming && (
                          <span className="inline-block h-4 w-1 animate-pulse bg-cyan-400" />
                        )}
                    </div>
                  </div>
                ))}

                {/* Streaming indicator when last message has content */}
                {isStreaming &&
                  messages.length > 0 &&
                  messages[messages.length - 1].content !== "" &&
                  messages[messages.length - 1].role === "assistant" && (
                    <div className="flex justify-start">
                      <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-cyan-400" />
                    </div>
                  )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Area */}
              <div className="border-t border-slate-800 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isStreaming)
                        handleChat(chatInput);
                    }}
                    placeholder="Ask about the transcript..."
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/40"
                    disabled={isStreaming}
                  />
                  <button
                    onClick={() => handleChat(chatInput)}
                    disabled={isStreaming || !chatInput.trim()}
                    className="flex items-center justify-center rounded-xl bg-cyan-600 px-4 py-2.5 text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isStreaming ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <SendIcon />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
