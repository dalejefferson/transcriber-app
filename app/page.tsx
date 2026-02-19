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
      className="h-5 w-5 text-cyan-600 dark:text-cyan-400"
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
      className="h-5 w-5 text-cyan-600 dark:text-cyan-400"
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

function SunIcon() {
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
        d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
      />
    </svg>
  );
}

function MoonIcon() {
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
        d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
      />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
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

// --- URL Helpers ---

function isYouTubeUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(youtube\.com\/(watch|shorts)|youtu\.be\/|m\.youtube\.com\/watch)/i.test(url);
}

function isTwitterUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(twitter\.com|x\.com)\//i.test(url);
}

function detectPlatform(url: string): "youtube" | "twitter" | null {
  if (isYouTubeUrl(url)) return "youtube";
  if (isTwitterUrl(url)) return "twitter";
  return null;
}

// --- Chevron Icon for Accordion ---

function ChevronDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// --- Types for multi-URL results ---

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

// --- Main Page Component ---

export default function Home() {
  const [urls, setUrls] = useState<string[]>([""]);
  const [results, setResults] = useState<TranscriptionResult[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeProgress, setTranscribeProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState("");
  const [provider, setProvider] = useState<Provider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const settingsRef = useRef<HTMLDivElement>(null);

  // Load settings from localStorage
  useEffect(() => {
    const savedProvider = localStorage.getItem("transcriber_provider") as Provider | null;
    const savedKey = localStorage.getItem("transcriber_apiKey");
    if (savedProvider) setProvider(savedProvider);
    if (savedKey) setApiKey(savedKey);
  }, []);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("transcriber_theme") as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('transcriber_theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  }

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

  // --- Multi-URL input handlers ---

  function handleUrlChange(index: number, value: string) {
    setUrls((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }

  function addUrlField() {
    setUrls((prev) => [...prev, ""]);
  }

  function removeUrlField(index: number) {
    if (urls.length <= 1) return;
    setUrls((prev) => prev.filter((_, i) => i !== index));
  }

  // --- Queued transcription ---

  async function handleTranscribe() {
    const validUrls = urls
      .map((u) => u.trim())
      .filter((u) => u && (isYouTubeUrl(u) || isTwitterUrl(u)));

    if (validUrls.length === 0) {
      setError("Please enter at least one valid YouTube or X/Twitter URL.");
      return;
    }

    setIsTranscribing(true);
    setError("");
    setTranscribeProgress({ current: 0, total: validUrls.length });

    // Collapse existing results
    setResults((prev) => prev.map((r) => ({ ...r, expanded: false })));

    for (let i = 0; i < validUrls.length; i++) {
      setTranscribeProgress({ current: i + 1, total: validUrls.length });

      try {
        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: validUrls[i] }),
        });

        const data = await res.json();

        if (!res.ok) {
          // Add error result but continue with remaining URLs
          setResults((prev) => [
            ...prev.map((r) => ({ ...r, expanded: false })),
            {
              id: crypto.randomUUID(),
              url: validUrls[i],
              transcript: "",
              segments: [],
              messages: [{ role: "assistant" as const, content: `Transcription failed: ${data.error || "Unknown error"}` }],
              chatInput: "",
              isStreaming: false,
              copied: false,
              expanded: true,
            },
          ]);
          continue;
        }

        setResults((prev) => [
          ...prev.map((r) => ({ ...r, expanded: false })),
          {
            id: crypto.randomUUID(),
            url: validUrls[i],
            transcript: data.transcript,
            segments: data.segments,
            messages: [],
            chatInput: "",
            isStreaming: false,
            copied: false,
            expanded: true,
          },
        ]);
      } catch {
        setResults((prev) => [
          ...prev.map((r) => ({ ...r, expanded: false })),
          {
            id: crypto.randomUUID(),
            url: validUrls[i],
            transcript: "",
            segments: [],
            messages: [{ role: "assistant" as const, content: "Network error. Please check your connection." }],
            chatInput: "",
            isStreaming: false,
            copied: false,
            expanded: true,
          },
        ]);
      }
    }

    setIsTranscribing(false);
    // Clear URL inputs after successful queue
    setUrls([""]);
  }

  // --- Per-result chat handler ---

  async function handleChat(resultId: string, userMessage: string) {
    if (!userMessage.trim()) return;

    const resultIndex = results.findIndex((r) => r.id === resultId);
    if (resultIndex === -1) return;
    const result = results[resultIndex];
    if (result.isStreaming) return;

    const newUserMsg: ChatMessage = { role: "user", content: userMessage };
    const updatedMessages = [...result.messages, newUserMsg];

    // Update messages and clear input
    setResults((prev) => {
      const updated = [...prev];
      updated[resultIndex] = { ...updated[resultIndex], messages: updatedMessages, chatInput: "", isStreaming: true };
      return updated;
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          transcript: result.transcript,
          provider,
          apiKey,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setResults((prev) => {
          const updated = [...prev];
          updated[resultIndex] = {
            ...updated[resultIndex],
            messages: [...updatedMessages, { role: "assistant", content: errData.error || "Sorry, something went wrong." }],
            isStreaming: false,
          };
          return updated;
        });
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setResults((prev) => {
          const updated = [...prev];
          updated[resultIndex] = {
            ...updated[resultIndex],
            messages: [...updatedMessages, { role: "assistant", content: "Failed to read response stream." }],
            isStreaming: false,
          };
          return updated;
        });
        return;
      }

      const decoder = new TextDecoder();
      let assistantContent = "";

      // Add placeholder
      setResults((prev) => {
        const updated = [...prev];
        updated[resultIndex] = {
          ...updated[resultIndex],
          messages: [...updatedMessages, { role: "assistant", content: "" }],
        };
        return updated;
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        setResults((prev) => {
          const updated = [...prev];
          const msgs = [...updated[resultIndex].messages];
          msgs[msgs.length - 1] = { role: "assistant", content: assistantContent };
          updated[resultIndex] = { ...updated[resultIndex], messages: msgs };
          return updated;
        });
      }
    } catch {
      setResults((prev) => {
        const updated = [...prev];
        updated[resultIndex] = {
          ...updated[resultIndex],
          messages: [...updated[resultIndex].messages, { role: "assistant", content: "Network error. Please check your connection." }],
        };
        return updated;
      });
    } finally {
      setResults((prev) => {
        const updated = [...prev];
        updated[resultIndex] = { ...updated[resultIndex], isStreaming: false };
        return updated;
      });
    }
  }

  function handlePreset(resultId: string, preset: string) {
    const prompts: Record<string, string> = {
      Summarize: "Give me a concise summary of this transcript in bullet points.",
      "Key Takeaways": "What are the top 5 key takeaways from this transcript?",
      ELI5: "Explain what this video is about like I'm 5 years old.",
      "Action Items": "What are the actionable items or advice from this transcript?",
      "Like I'm 12": "Break down what this video is about in the simplest way possible, like you're explaining it to a 12-year-old. Use everyday language, no jargon, and fun analogies.",
    };
    const prompt = prompts[preset];
    if (prompt) handleChat(resultId, prompt);
  }

  function handleCopy(resultId: string) {
    const result = results.find((r) => r.id === resultId);
    if (!result) return;
    const fullText = result.segments.length > 0
      ? result.segments.map((seg) => `[${formatTime(seg.start)}] ${seg.text}`).join("\n")
      : result.transcript;
    navigator.clipboard.writeText(fullText).then(() => {
      setResults((prev) =>
        prev.map((r) => (r.id === resultId ? { ...r, copied: true } : r))
      );
      setTimeout(() => {
        setResults((prev) =>
          prev.map((r) => (r.id === resultId ? { ...r, copied: false } : r))
        );
      }, 2000);
    });
  }

  function toggleExpanded(resultId: string) {
    setResults((prev) =>
      prev.map((r) => (r.id === resultId ? { ...r, expanded: !r.expanded } : r))
    );
  }

  function updateResultChatInput(resultId: string, value: string) {
    setResults((prev) =>
      prev.map((r) => (r.id === resultId ? { ...r, chatInput: value } : r))
    );
  }

  const presets = ["Summarize", "Key Takeaways", "ELI5", "Action Items", "Like I'm 12"];
  const hasValidUrls = urls.some((u) => {
    const trimmed = u.trim();
    return trimmed && (isYouTubeUrl(trimmed) || isTwitterUrl(trimmed));
  });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="py-12 text-center">
          {/* Theme Toggle & Settings */}
          <div className="mx-auto mb-6 flex items-center justify-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-600 dark:text-slate-400 transition-all hover:text-cyan-500 dark:hover:text-cyan-400"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <div ref={settingsRef} className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-500 dark:text-slate-400 transition-all hover:border-cyan-600 hover:text-cyan-600 dark:hover:text-cyan-400"
              >
                <GearIcon />
                <span className={`h-2 w-2 rounded-full ${PROVIDER_INFO[provider].color}`} />
                <span className="text-xs">{PROVIDER_INFO[provider].label}</span>
              </button>

              {/* Settings Dropdown */}
              {showSettings && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-xl shadow-slate-200/60 dark:shadow-black/40">
                  <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">AI Provider Settings</h3>

                  {/* Provider Selection */}
                  <div className="mb-4 flex gap-2">
                    {(Object.keys(PROVIDER_INFO) as Provider[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setProvider(p)}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                          provider === p
                            ? "border border-cyan-500 bg-cyan-50 dark:bg-cyan-600/20 text-cyan-700 dark:text-cyan-300"
                            : "border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                      >
                        <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${PROVIDER_INFO[p].color}`} />
                        {PROVIDER_INFO[p].label}
                      </button>
                    ))}
                  </div>

                  {/* API Key Input */}
                  <label className="mb-1.5 block text-xs text-slate-500 dark:text-slate-400">
                    {PROVIDER_INFO[provider].label} API Key
                  </label>
                  <div className="relative mb-4">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={`Enter your ${PROVIDER_INFO[provider].label} API key...`}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 pr-10 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
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
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Echotext
          </h1>
          <p className="mx-auto mt-3 max-w-2xl select-none text-lg text-slate-500 dark:text-slate-400">
            Drop a link. Get the words.
          </p>

          {/* Supported Platform Badges */}
          <div className="mx-auto mt-4 flex items-center justify-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/60 px-3 py-1 text-xs text-red-500 dark:text-red-400">
              <YouTubeIcon />
              YouTube
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/60 px-3 py-1 text-xs text-slate-600 dark:text-slate-300">
              <XIcon />
              X / Twitter
            </span>
          </div>

          {/* Multi-URL Input Section */}
          <div className="mx-auto mt-8 max-w-2xl space-y-3">
            {urls.map((urlValue, index) => (
              <div key={index} className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={urlValue}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isTranscribing) handleTranscribe();
                    }}
                    placeholder={`Paste a YouTube or X/Twitter video URL...`}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3 pr-10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/40"
                    disabled={isTranscribing}
                  />
                  {/* Platform detection badge inside input */}
                  {urlValue.trim() && detectPlatform(urlValue.trim()) && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {detectPlatform(urlValue.trim()) === "youtube" ? (
                        <span className="text-red-500 dark:text-red-400"><YouTubeIcon /></span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400"><XIcon /></span>
                      )}
                    </span>
                  )}
                </div>
                {urls.length > 1 && (
                  <button
                    onClick={() => removeUrlField(index)}
                    disabled={isTranscribing}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 transition-all hover:border-red-300 hover:text-red-500 dark:hover:border-red-500/50 dark:hover:text-red-400 disabled:opacity-50"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            ))}

            {/* Add URL + Transcribe Row */}
            <div className="flex gap-3">
              <button
                onClick={addUrlField}
                disabled={isTranscribing}
                className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-500 dark:text-slate-400 transition-all hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 disabled:opacity-50"
              >
                <PlusIcon />
                Add URL
              </button>
              <button
                onClick={handleTranscribe}
                disabled={isTranscribing || !hasValidUrls}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isTranscribing ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    <span>
                      Transcribing {transcribeProgress.current} of {transcribeProgress.total}...
                    </span>
                  </>
                ) : (
                  `Transcribe${urls.filter((u) => u.trim() && (isYouTubeUrl(u.trim()) || isTwitterUrl(u.trim()))).length > 1 ? ` (${urls.filter((u) => u.trim() && (isYouTubeUrl(u.trim()) || isTwitterUrl(u.trim()))).length})` : ""}`
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <p className="mx-auto mt-4 max-w-2xl text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {/* Progress Bar */}
          {isTranscribing && (
            <div className="mx-auto mt-6 max-w-2xl">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-600" />
              </div>
              <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
                Downloading and transcribing audio ({transcribeProgress.current}/{transcribeProgress.total})... This may take a minute per video.
              </p>
            </div>
          )}
        </div>

        {/* Stacked Accordion Results */}
        {results.length > 0 && (
          <div className="space-y-4 pb-12">
            {results.map((result) => (
              <div
                key={result.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all animate-fade-in"
              >
                {/* Accordion Header */}
                <button
                  onClick={() => toggleExpanded(result.id)}
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
                              onClick={() => handleCopy(result.id)}
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
                              {presets.map((preset) => (
                                <button
                                  key={preset}
                                  onClick={() => handlePreset(result.id, preset)}
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
                              key={i}
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
                                onChange={(e) => updateResultChatInput(result.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !result.isStreaming)
                                    handleChat(result.id, result.chatInput);
                                }}
                                placeholder="Ask about the transcript..."
                                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/40"
                                disabled={result.isStreaming}
                              />
                              <button
                                onClick={() => handleChat(result.id, result.chatInput)}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
