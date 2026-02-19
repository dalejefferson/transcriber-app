'use client';

import React from 'react';
import { EyeIcon, EyeSlashIcon } from './icons';

type Provider = "openai" | "claude" | "gemini";

const PROVIDER_INFO: Record<Provider, { label: string; color: string }> = {
  openai: { label: "OpenAI", color: "bg-emerald-500" },
  claude: { label: "Claude", color: "bg-orange-500" },
  gemini: { label: "Gemini", color: "bg-blue-500" },
};

interface SettingsDropdownProps {
  showSettings: boolean;
  provider: Provider;
  setProvider: (p: Provider) => void;
  apiKey: string;
  setApiKey: (k: string) => void;
  showKey: boolean;
  setShowKey: (s: boolean) => void;
  saved: boolean;
  onSave: () => void;
  settingsRef: React.RefObject<HTMLDivElement | null>;
}

export const SettingsDropdown = React.memo(function SettingsDropdown(props: SettingsDropdownProps) {
  if (!props.showSettings) return null;

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-xl shadow-slate-200/60 dark:shadow-black/40">
      <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">AI Provider Settings</h3>

      {/* Provider Selection */}
      <div className="mb-4 flex gap-2">
        {(Object.keys(PROVIDER_INFO) as Provider[]).map((p) => (
          <button
            key={p}
            onClick={() => props.setProvider(p)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              props.provider === p
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
        {PROVIDER_INFO[props.provider].label} API Key
      </label>
      <div className="relative mb-4">
        <input
          type={props.showKey ? "text" : "password"}
          value={props.apiKey}
          onChange={(e) => props.setApiKey(e.target.value)}
          placeholder={`Enter your ${PROVIDER_INFO[props.provider].label} API key...`}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 pr-10 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/40"
        />
        <button
          type="button"
          onClick={() => props.setShowKey(!props.showKey)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
        >
          {props.showKey ? <EyeSlashIcon /> : <EyeIcon />}
        </button>
      </div>

      {/* Save Button */}
      <button
        onClick={props.onSave}
        className={`w-full rounded-lg py-2 text-sm font-semibold transition-all ${
          props.saved
            ? "bg-emerald-600 text-white"
            : "bg-cyan-600 text-white hover:bg-cyan-500"
        }`}
      >
        {props.saved ? "Saved!" : "Save"}
      </button>
    </div>
  );
});
