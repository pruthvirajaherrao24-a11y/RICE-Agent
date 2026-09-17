"use client";

import React, { useState, useRef } from "react";
import { BorderBeam } from "@/components/ui/border-beam";
import { AtSign, ChevronDown, ArrowUp, Paperclip, FileText, Globe, Sparkles } from "lucide-react";

export function RiceHeader({ username = "user" }: { username?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-2 mb-8 select-none">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-white drop-shadow-md font-sans leading-tight max-w-2xl">
        Building the most capable
        <br />
        <span className="font-extralight text-white/80">Research AI</span>
      </h1>
    </div>
  );
}

interface ChatInputProps {
  onSend?: (message: string) => void;
  placeholder?: string;
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
}

export function ChatInput({
  onSend,
  placeholder = "Build anything...",
  value,
  setValue
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSend?.(value);
        setValue("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    }
  };

  const handleSend = () => {
    if (value.trim()) {
      onSend?.(value);
      setValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    // Forced width to 768px to ensure it stretches horizontally
    <div className="relative w-[768px] max-w-[90vw] rounded-2xl bg-[#141517] shadow-[inset_4px_4px_10px_rgba(0,0,0,0.7),inset_-4px_-4px_10px_rgba(255,255,255,0.02)] border border-white/[0.02] focus-within:border-white/[0.05] focus-within:shadow-[inset_4px_4px_12px_rgba(0,0,0,0.8),inset_-4px_-4px_12px_rgba(255,255,255,0.04)] overflow-hidden font-sans p-4 transition-all mx-auto breathing-glow">
      <div className="flex flex-col min-h-[90px] justify-between gap-4 p-0.5">

        {/* Top Row: Tag Icon + Textarea */}
        <div className="flex items-start gap-3 px-1">
          <button
            type="button"
            className="inline-flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-[#141517] shadow-[-3px_-3px_8px_rgba(255,255,255,0.03),3px_3px_10px_rgba(0,0,0,0.6)] active:shadow-[inset_-3px_-3px_8px_rgba(255,255,255,0.03),inset_3px_3px_10px_rgba(0,0,0,0.6)] text-neutral-400 hover:text-[#ffffffdc] transition-all cursor-pointer mt-1"
          >
            <AtSign className="w-4 h-4" />
          </button>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1} // Reset to 1 so it starts narrow vertically
            className="w-full bg-transparent text-sm md:text-base text-neutral-200 placeholder:text-neutral-500 focus:outline-none resize-none py-1.5 font-light leading-relaxed max-h-[300px] overflow-y-auto"
          />
        </div>

        {/* Bottom Row Controls */}
        <div className="flex items-center gap-3.5 pt-1">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-[#141517] shadow-[-3px_-3px_8px_rgba(255,255,255,0.03),3px_3px_10px_rgba(0,0,0,0.6)] active:shadow-[inset_-3px_-3px_8px_rgba(255,255,255,0.03),inset_3px_3px_10px_rgba(0,0,0,0.6)] text-xs text-neutral-300 hover:text-[#ffffffdc] transition-all cursor-pointer"
          >
            <span>Agent</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-[#141517] shadow-[-3px_-3px_8px_rgba(255,255,255,0.03),3px_3px_10px_rgba(0,0,0,0.6)] active:shadow-[inset_-3px_-3px_8px_rgba(255,255,255,0.03),inset_3px_3px_10px_rgba(0,0,0,0.6)] text-xs text-neutral-300 hover:text-[#ffffffdc] transition-all cursor-pointer"
          >
            <span>Auto</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-[#141517] shadow-[-3px_-3px_8px_rgba(255,255,255,0.03),3px_3px_10px_rgba(0,0,0,0.6)] active:shadow-[inset_-3px_-3px_8px_rgba(255,255,255,0.03),inset_3px_3px_10px_rgba(0,0,0,0.6)] text-neutral-400 hover:text-[#ffffffdc] transition-all cursor-pointer"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleSend}
            className={`flex items-center justify-center w-8 h-8 ml-auto rounded-full transition-all cursor-pointer ${value.trim()
              ? "bg-[#ffffffdc] text-[#141517] shadow-[-3px_-3px_8px_rgba(255,255,255,0.05),3px_3px_10px_rgba(0,0,0,0.6)] hover:brightness-115 active:scale-95"
              : "bg-[#141517] text-neutral-500 shadow-[-2px_-2px_6px_rgba(255,255,255,0.02),2px_2px_8px_rgba(0,0,0,0.5)]"
              }`}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}

export function BorderBeamChatInput({
  onSend,
  value,
  setValue
}: {
  onSend?: (msg: string) => void;
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    // Replaced w-full with forced 768px width to match the inner component
    <div className="relative flex items-center justify-center w-[768px] max-w-[90vw] mx-auto">
      <ChatInput onSend={onSend} value={value} setValue={setValue} />
    </div>
  );
}

export default BorderBeamChatInput;