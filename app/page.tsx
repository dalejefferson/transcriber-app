"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  GearIcon,
  SunIcon,
  MoonIcon,
  YouTubeIcon,
  XIcon,
  PlusIcon,
  TrashIcon,
  Spinner,
} from "./components/icons";
import { SettingsDropdown } from "./components/SettingsDropdown";
import { ResultCard } from "./components/ResultCard";

// --- Types ---

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

// --- Module-level regex constants ---

const YOUTUBE_URL_REGEX = /^https?:\/\/(www\.)?(youtube\.com\/(watch|shorts)|youtu\.be\/|m\.youtube\.com\/watch)/i;
const TWITTER_URL_REGEX = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\//i;

function isYouTubeUrl(url: string): boolean {
  return YOUTUBE_URL_REGEX.test(url);
}

function isTwitterUrl(url: string): boolean {
  return TWITTER_URL_REGEX.test(url);
}

function detectPlatform(url: string): "youtube" | "twitter" | null {
  if (isYouTubeUrl(url)) return "youtube";
  if (isTwitterUrl(url)) return "twitter";
  return null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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
  const streamingRef = useRef<string>('');

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

  // Close settings on click outside (empty deps - always active)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Memoized event handlers ---

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('transcriber_theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      return newTheme;
    });
  }, []);

  const saveSettings = useCallback(() => {
    localStorage.setItem("transcriber_provider", provider);
    localStorage.setItem("transcriber_apiKey", apiKey);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setShowSettings(false);
    }, 800);
  }, [provider, apiKey]);

  const handleUrlChange = useCallback((index: number, value: string) => {
    setUrls((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }, []);

  const addUrlField = useCallback(() => {
    setUrls((prev) => [...prev, ""]);
  }, []);

  const removeUrlField = useCallback((index: number) => {
    setUrls((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleCopy = useCallback((resultId: string) => {
    setResults((prev) => {
      const result = prev.find((r) => r.id === resultId);
      if (!result) return prev;
      const fullText = result.segments.length > 0
        ? result.segments.map((seg) => `[${formatTime(seg.start)}] ${seg.text}`).join("\n")
        : result.transcript;
      navigator.clipboard.writeText(fullText);
      return prev.map((r) => (r.id === resultId ? { ...r, copied: true } : r));
    });
    setTimeout(() => {
      setResults((prev) =>
        prev.map((r) => (r.id === resultId ? { ...r, copied: false } : r))
      );
    }, 2000);
  }, []);

  const toggleExpanded = useCallback((resultId: string) => {
    setResults((prev) =>
      prev.map((r) => (r.id === resultId ? { ...r, expanded: !r.expanded } : r))
    );
  }, []);

  const updateResultChatInput = useCallback((resultId: string, value: string) => {
    setResults((prev) =>
      prev.map((r) => (r.id === resultId ? { ...r, chatInput: value } : r))
    );
  }, []);

  const handleTranscribe = useCallback(async () => {
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
    setUrls([""]);
  }, [urls]);

  const handleChat = useCallback(async (resultId: string, userMessage: string) => {
    if (!userMessage.trim()) return;

    let resultIndex = -1;
    let result: TranscriptionResult | undefined;

    setResults((prev) => {
      resultIndex = prev.findIndex((r) => r.id === resultId);
      if (resultIndex === -1) return prev;
      result = prev[resultIndex];
      return prev;
    });

    // Re-find from current state
    const currentResults = await new Promise<TranscriptionResult[]>((resolve) => {
      setResults((prev) => {
        resolve(prev);
        return prev;
      });
    });

    resultIndex = currentResults.findIndex((r) => r.id === resultId);
    if (resultIndex === -1) return;
    result = currentResults[resultIndex];
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
      streamingRef.current = '';

      // Add placeholder
      setResults((prev) => {
        const updated = [...prev];
        updated[resultIndex] = {
          ...updated[resultIndex],
          messages: [...updatedMessages, { role: "assistant", content: "" }],
        };
        return updated;
      });

      // Flush interval: update state every 100ms instead of on every chunk
      const flushInterval = setInterval(() => {
        if (streamingRef.current) {
          setResults((prev) => {
            const updated = [...prev];
            const msgs = [...updated[resultIndex].messages];
            msgs[msgs.length - 1] = { role: "assistant", content: streamingRef.current };
            updated[resultIndex] = { ...updated[resultIndex], messages: msgs };
            return updated;
          });
        }
      }, 100);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;
        streamingRef.current = assistantContent;
      }

      // Final flush after stream ends
      clearInterval(flushInterval);
      setResults((prev) => {
        const updated = [...prev];
        const msgs = [...updated[resultIndex].messages];
        msgs[msgs.length - 1] = { role: "assistant", content: assistantContent };
        updated[resultIndex] = { ...updated[resultIndex], messages: msgs };
        return updated;
      });
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
  }, [provider, apiKey]);

  const handlePreset = useCallback((resultId: string, preset: string) => {
    const prompts: Record<string, string> = {
      Summarize: "Give me a concise summary of this transcript in bullet points.",
      "Key Takeaways": "What are the top 5 key takeaways from this transcript?",
      ELI5: "Explain what this video is about like I'm 5 years old.",
      "Action Items": "What are the actionable items or advice from this transcript?",
      "Like I'm 12": "Break down what this video is about in the simplest way possible, like you're explaining it to a 12-year-old. Use everyday language, no jargon, and fun analogies.",
    };
    const prompt = prompts[preset];
    if (prompt) handleChat(resultId, prompt);
  }, [handleChat]);

  // --- Memoized derived values ---

  const hasValidUrls = useMemo(() => {
    return urls.some((u) => {
      const trimmed = u.trim();
      return trimmed && (isYouTubeUrl(trimmed) || isTwitterUrl(trimmed));
    });
  }, [urls]);

  const validUrlCount = useMemo(() => {
    return urls.filter((u) => u.trim() && (isYouTubeUrl(u.trim()) || isTwitterUrl(u.trim()))).length;
  }, [urls]);

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

              <SettingsDropdown
                showSettings={showSettings}
                provider={provider}
                setProvider={setProvider}
                apiKey={apiKey}
                setApiKey={setApiKey}
                showKey={showKey}
                setShowKey={setShowKey}
                saved={saved}
                onSave={saveSettings}
                settingsRef={settingsRef}
              />
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
            {urls.map((urlValue, index) => {
              const detectedPlatform = detectPlatform(urlValue.trim());
              return (
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
                    {/* Platform detection badge - always reserves space */}
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${!detectedPlatform ? 'invisible' : ''}`}>
                      {detectedPlatform === "youtube" ? (
                        <span className="text-red-500 dark:text-red-400"><YouTubeIcon /></span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400"><XIcon /></span>
                      )}
                    </span>
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
              );
            })}

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
                  `Transcribe${validUrlCount > 1 ? ` (${validUrlCount})` : ""}`
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
              <ResultCard
                key={result.id}
                result={result}
                provider={provider}
                onToggleExpanded={toggleExpanded}
                onCopy={handleCopy}
                onChat={handleChat}
                onPreset={handlePreset}
                onUpdateChatInput={updateResultChatInput}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
