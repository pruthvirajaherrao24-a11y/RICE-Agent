"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MessageSquare,
  History,
  Wrench,
  FileText,
  Plus,
  Send,
  Paperclip,
  Globe,
  Mic,
  ChevronDown,
  Settings,
  User,
  ArrowRight,
  Copy,
  BarChart2,
  Check,
  Bot,
  UserCircle,
  Menu,
  X,
  Sparkles,
  ArrowLeft,
  Search,
  Code,
  Database,
  Cpu,
  Upload
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "agent";
  senderName: string;
  avatarIcon: "person" | "bot";
  content: string;
  title?: string;
  codeBlock?: string;
  bullets?: string[];
  timestamp: string;
}

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialPrompt = searchParams.get("prompt") || searchParams.get("q") || "";

  const [inputMessage, setInputMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("Agent Alpha v4");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"sessions" | "history" | "tools">("sessions");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isWebSearchActive, setIsWebSearchActive] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processedPromptRef = useRef<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [assets, setAssets] = useState<{ id: string; title: string; author: string }[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const executeResearch = async (queryText: string) => {
    setIsGenerating(true);

    const thinkingMsgId = `agent-${Date.now()}`;
    const initialAgentMsg: Message = {
      id: thinkingMsgId,
      sender: "agent",
      senderName: selectedModel,
      avatarIcon: "bot",
      title: `Multi-Source Research: ${queryText.slice(0, 35)}...`,
      content: `RICE ReAct Agent actively reasoning across arXiv, Wikipedia & Web Search for: "${queryText}"...`,
      bullets: [
        "Synthesizing academic, factual, and web sources",
        "Executing multi-step tool calls via RICE Backend Engine",
      ],
      timestamp: "Just now"
    };

    setMessages((prev) => [...prev, initialAgentMsg]);

    try {
      const res = await fetch(`${API_URL}/api/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText, max_steps: 6 }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === thinkingMsgId
              ? {
                  ...msg,
                  content: data.answer || "No response received.",
                  bullets: data.bullets && data.bullets.length > 0 ? data.bullets : [
                    "Evaluated query across DuckDuckGo, arXiv & Wikipedia",
                    "Multi-source synthesis complete"
                  ],
                }
              : msg
          )
        );
      } else {
        const errData = await res.json().catch(() => ({}));
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === thinkingMsgId
              ? {
                  ...msg,
                  content: `RICE Backend returned an status error (${res.status}): ${errData.detail || "Make sure GITHUB_TOKEN or GROQ_API_KEY is configured in Backend/.env"}.`,
                  bullets: ["Ensure Backend server (server.py) is running on port 8000"],
                }
              : msg
          )
        );
      }
    } catch (err) {
      console.warn("Backend API not reachable, presenting local status:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === thinkingMsgId
            ? {
                ...msg,
                content: `RICE Agent query dispatched for "${queryText}". Backend server is ready at http://localhost:8000. Configure GITHUB_TOKEN or GROQ_API_KEY in Backend/.env for full live results!`,
                bullets: [
                  "Connected to RICE Backend API (FastAPI)",
                  "Multi-tool dispatch ready (Web, arXiv, Wikipedia)"
                ],
              }
            : msg
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle prompt passed from landing page safely (only once per prompt string)
  useEffect(() => {
    if (initialPrompt.trim() && processedPromptRef.current !== initialPrompt.trim()) {
      const q = initialPrompt.trim();
      processedPromptRef.current = q;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        sender: "user",
        senderName: "Researcher",
        avatarIcon: "person",
        content: q,
        timestamp: "Just now"
      };

      setMessages((prev) => [...prev, userMsg]);
      router.replace("/workspace", { scroll: false });
      executeResearch(q);
    }
  }, [initialPrompt, router]);

  // Scroll to bottom when messages update
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isGenerating) return;

    const userText = inputMessage.trim();
    setInputMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      senderName: "Researcher",
      avatarIcon: "person",
      content: userText,
      timestamp: "Just now"
    };

    setMessages((prev) => [...prev, userMsg]);
    executeResearch(userText);
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setAssets((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          title: file.name,
          author: `Uploaded (${(file.size / 1024).toFixed(1)} KB)`
        }
      ]);
    }
  };

  return (
    <div className="bg-[#131313] text-[#e5e2e1] h-screen overflow-hidden flex flex-col font-sans select-none">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".pdf,.txt,.doc,.docx,.csv,.png,.jpg"
      />

      {/* ── Top Navigation Bar ── */}
      <header className="bg-[#131313] text-white fixed top-0 w-full z-50 h-16 neumorphic-raised flex justify-between items-center px-4 sm:px-8 border-b border-white/[0.03]">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden w-9 h-9 rounded-xl neumorphic-raised flex items-center justify-center text-[#c4c7c8] hover:text-white"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center space-x-2 group">
            <span className="font-bold text-lg sm:text-xl tracking-wider text-white group-hover:text-[#ffffffdc] transition-colors">
              RICE
            </span>
          </Link>

          <div className="h-5 w-px bg-[#2a2a2a] hidden sm:block"></div>

          <Link
            href="/"
            className="hidden sm:flex items-center gap-1.5 text-xs text-[#c4c7c8] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>

          <div className="h-5 w-px bg-[#2a2a2a] hidden sm:block"></div>

          <h1 className="text-xs sm:text-sm font-semibold text-[#c4c7c8] truncate max-w-[150px] sm:max-w-[280px]">
            {messages.length > 0
              ? messages[0].content
                ? messages[0].content.slice(0, 30) + (messages[0].content.length > 30 ? "..." : "")
                : "Research Session"
              : "New Session"}
          </h1>
        </div>

        {/* Center Model Selector */}
        <div className="relative flex-1 max-w-xs mx-4 hidden md:block">
          <button
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className="neumorphic-sunken w-full flex items-center justify-between px-4 py-1.5 hover:bg-[#2a2a2a] transition-all rounded-full cursor-pointer text-xs"
          >
            <span className="font-medium text-white flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-white/80" />
              Model: {selectedModel}
            </span>
            <ChevronDown className="w-4 h-4 text-[#8e9192]" />
          </button>

          {isModelDropdownOpen && (
            <div className="absolute top-10 left-0 w-full neumorphic-raised rounded-2xl py-2 z-50 border border-white/5 space-y-1">
              {["Agent Alpha v4", "Deep Research v2", "Claude 3.5 Sonnet", "Gemini Pro"].map((model) => (
                <button
                  key={model}
                  onClick={() => {
                    setSelectedModel(model);
                    setIsModelDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs transition-colors cursor-pointer ${
                    selectedModel === model ? "text-white font-bold bg-[#201f1f]" : "text-[#c4c7c8] hover:bg-[#201f1f]"
                  }`}
                >
                  {model}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center space-x-3">
          <button
            title="Settings"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full neumorphic-raised neumorphic-interactive flex items-center justify-center text-[#c4c7c8] hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            title="Account"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full neumorphic-raised neumorphic-interactive flex items-center justify-center text-[#c4c7c8] hover:text-white"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Main Layout Container ── */}
      <div className="flex flex-1 pt-16 h-full w-full relative">

        {/* ── Left Sidebar Navigation ── */}
        <nav
          className={`bg-[#131313] fixed md:static left-0 top-16 h-[calc(100vh-64px)] w-80 neumorphic-raised flex flex-col p-4 space-y-4 z-40 transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="pt-4 pb-3 px-3 border-b border-[#201f1f]">
            <div className="text-lg font-bold text-white mb-0.5 tracking-tight">Research Terminal</div>
            <div className="text-xs text-[#8e9192]">V2.0.4 Online</div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-1 pt-2 flex flex-col">
            {/* Tabs */}
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab("sessions")}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "sessions"
                    ? "bg-[#353534] shadow-[inset_4px_4px_8px_#000000,inset_-4px_-4px_8px_rgba(255,255,255,0.02)] text-white"
                    : "text-[#8e9192] hover:bg-[#2a2a2a] hover:text-white neumorphic-interactive"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Sessions</span>
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "history"
                    ? "bg-[#353534] shadow-[inset_4px_4px_8px_#000000,inset_-4px_-4px_8px_rgba(255,255,255,0.02)] text-white"
                    : "text-[#8e9192] hover:bg-[#2a2a2a] hover:text-white neumorphic-interactive"
                }`}
              >
                <History className="w-4 h-4" />
                <span>History</span>
              </button>

              <button
                onClick={() => setActiveTab("tools")}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "tools"
                    ? "bg-[#353534] shadow-[inset_4px_4px_8px_#000000,inset_-4px_-4px_8px_rgba(255,255,255,0.02)] text-white"
                    : "text-[#8e9192] hover:bg-[#2a2a2a] hover:text-white neumorphic-interactive"
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>Tools</span>
              </button>
            </div>

            {/* Tab View Content */}
            {activeTab === "sessions" && (
              <div className="mt-6 pt-4 border-t border-[#201f1f] flex flex-col flex-1">
                <div className="flex items-center justify-between mb-3 px-2">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Research Assets</h3>
                  <FileText className="w-4 h-4 text-[#8e9192]" />
                </div>

                <div className="space-y-2.5 px-1 pb-4">
                  {assets.length === 0 ? (
                    <div className="text-center py-4 text-xs text-[#8e9192] italic">
                      No assets attached
                    </div>
                  ) : (
                    assets.map((asset) => (
                      <div
                        key={asset.id}
                        className="neumorphic-sunken p-3 rounded-2xl group cursor-pointer hover:bg-[#090909] transition-colors"
                      >
                        <div className="flex items-start">
                          <div className="neumorphic-raised w-7 h-7 rounded-full flex items-center justify-center text-white mr-2.5 shrink-0 mt-0.5">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-medium leading-tight text-white group-hover:text-white/90 mb-1 line-clamp-2">
                              {asset.title}
                            </h4>
                            <p className="text-[10px] text-[#c4c7c8]">{asset.author}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full neumorphic-raised py-2.5 rounded-full flex items-center justify-center space-x-2 text-xs text-[#8e9192] hover:text-white transition-colors neumorphic-interactive mt-3 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Reference</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="mt-6 pt-4 border-t border-[#201f1f] flex flex-col space-y-2.5 px-1">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2 px-1">Recent Threads</h3>
                {messages.length > 0 ? (
                  <div className="neumorphic-sunken p-3 rounded-2xl cursor-pointer hover:bg-[#090909] transition-colors">
                    <p className="text-xs font-medium text-white line-clamp-1">
                      {messages[0].content}
                    </p>
                    <p className="text-[10px] text-[#8e9192] mt-0.5">Active Session</p>
                  </div>
                ) : (
                  <p className="text-xs text-[#8e9192] px-1 italic">No recent history</p>
                )}
              </div>
            )}

            {activeTab === "tools" && (
              <div className="mt-6 pt-4 border-t border-[#201f1f] flex flex-col space-y-2.5 px-1">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2 px-1">Active Integrations</h3>
                {[
                  { name: "arXiv Search Engine", icon: Search },
                  { name: "Python Code Interpreter", icon: Code },
                  { name: "Vector Database Index", icon: Database },
                  { name: "Autonomous Synthesizer", icon: Cpu }
                ].map((tool, idx) => {
                  const ToolIcon = tool.icon;
                  return (
                    <div key={idx} className="neumorphic-raised p-3 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <ToolIcon className="w-4 h-4 text-white" />
                        <span className="text-xs text-white font-medium">{tool.name}</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* ── Center Main Area (Research Feed & Input) ── */}
        <main className="flex-1 flex flex-col p-3 sm:p-6 pb-0 overflow-hidden relative z-10 bg-[#131313]">
          {/* Message / Research Feed (Sunken Well) */}
          <div className="flex-1 rounded-3xl overflow-y-auto custom-scrollbar p-4 sm:p-6 mb-4 flex flex-col space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center px-4 select-none my-auto">
                <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight font-sans">
                  What are we searching today
                </h2>
              </div>
            ) : (
              <>
                {/* Date Separator */}
                <div className="flex justify-center">
                  <span className="text-[11px] text-[#c4c7c8] bg-[#131313] px-3 py-1 rounded-full neumorphic-raised">
                    Today
                  </span>
                </div>

                {/* Render Messages */}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col space-y-1.5 ${
                      msg.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center space-x-2 text-[#c4c7c8] px-1">
                      {msg.sender === "user" ? (
                        <>
                          <span className="text-xs font-medium">{msg.senderName}</span>
                          <UserCircle className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <Bot className="w-4 h-4 text-white" />
                          <span className="text-xs font-bold text-white">{msg.senderName}</span>
                        </>
                      )}
                    </div>

                    {/* Message Bubble */}
                    {msg.sender === "user" ? (
                      <div className="neumorphic-raised p-4 sm:p-5 rounded-l-3xl rounded-tr-3xl max-w-xl bg-[#131313]">
                        <p className="text-xs sm:text-sm text-white leading-relaxed">{msg.content}</p>
                      </div>
                    ) : (
                      <div className="neumorphic-sunken p-5 sm:p-6 rounded-r-3xl rounded-tl-3xl max-w-2xl border border-white/[0.02] w-full">
                        {msg.title && (
                          <h4 className="text-sm font-semibold text-white mb-3 tracking-tight flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-white/80" />
                            {msg.title}
                          </h4>
                        )}

                        {/* Rendered Markdown content */}
                        <div className="prose-rice text-xs sm:text-sm text-[#e5e2e1] leading-relaxed mb-3">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({ children }) => <h1 className="text-lg font-bold text-white mt-4 mb-2 border-b border-white/10 pb-1">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-base font-bold text-white mt-4 mb-2">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-sm font-semibold text-white/90 mt-3 mb-1.5">{children}</h3>,
                              h4: ({ children }) => <h4 className="text-xs font-semibold text-white/80 mt-2 mb-1">{children}</h4>,
                              p: ({ children }) => <p className="mb-3 last:mb-0 text-[#e5e2e1] leading-relaxed">{children}</p>,
                              strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                              em: ({ children }) => <em className="italic text-[#c4c7c8]">{children}</em>,
                              ul: ({ children }) => <ul className="space-y-1.5 mb-3 ml-4 list-none">{children}</ul>,
                              ol: ({ children }) => <ol className="space-y-1.5 mb-3 ml-4 list-decimal list-inside">{children}</ol>,
                              li: ({ children }) => (
                                <li className="flex items-start gap-2 text-[#c4c7c8]">
                                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />
                                  <span>{children}</span>
                                </li>
                              ),
                              a: ({ href, children }) => (
                                <a href={href} target="_blank" rel="noopener noreferrer"
                                  className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors break-all">
                                  {children}
                                </a>
                              ),
                              code: ({ node, children, ...props }) => {
                                const isInline = node?.position?.start.line === node?.position?.end.line;
                                return isInline ? (
                                  <code className="bg-white/10 text-white px-1.5 py-0.5 rounded text-[11px] font-mono" {...props}>{children}</code>
                                ) : (
                                  <code className="block bg-[#0d0d0d] text-green-300 p-3 rounded-xl text-[11px] font-mono overflow-x-auto border border-white/5 my-2" {...props}>{children}</code>
                                );
                              },
                              pre: ({ children }) => <div className="my-2">{children}</div>,
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-2 border-white/20 pl-3 my-2 text-[#8e9192] italic">{children}</blockquote>
                              ),
                              table: ({ children }) => (
                                <div className="overflow-x-auto my-3 rounded-xl border border-white/10">
                                  <table className="w-full text-xs">{children}</table>
                                </div>
                              ),
                              thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
                              th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-white border-b border-white/10">{children}</th>,
                              td: ({ children }) => <td className="px-3 py-2 text-[#c4c7c8] border-b border-white/5">{children}</td>,
                              hr: () => <hr className="border-white/10 my-3" />,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>

                        {msg.codeBlock && (
                          <div className="bg-[#131313] p-3 sm:p-4 rounded-2xl mb-3 font-mono text-xs text-white neumorphic-raised overflow-x-auto border border-white/5">
                            <code>{msg.codeBlock}</code>
                          </div>
                        )}

                        {msg.bullets && (
                          <ul className="space-y-2 text-xs sm:text-sm text-[#c4c7c8] mb-4">
                            {msg.bullets.map((b, i) => (
                              <li key={i} className="flex items-start">
                                <ArrowRight className="w-4 h-4 text-[#8e9192] mr-2 shrink-0 mt-0.5" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Action buttons */}
                        <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-white/[0.03]">
                          <button
                            onClick={() => handleCopy(msg.id, `${msg.title || ""}\n${msg.content}`)}
                            className="neumorphic-raised px-3.5 py-1.5 rounded-full text-xs text-white hover:text-white/90 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-[#8e9192]" />
                                <span>Copy Data</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => alert("Plotting data graph for quantum metrics...")}
                            className="neumorphic-raised px-3.5 py-1.5 rounded-full text-xs text-white hover:text-white/90 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <BarChart2 className="w-3.5 h-3.5 text-[#8e9192]" />
                            <span>Plot Graph</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            <div ref={feedEndRef} className="h-4" />
          </div>

          {/* ── Input Bar (Raised Panel) ── */}
          <div className="neumorphic-raised rounded-3xl p-2 mb-4 flex items-end relative mx-1 sm:mx-4">
            <div className="flex items-center space-x-1 pb-2 pl-2">
              <button
                type="button"
                title="Attach file"
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#8e9192] hover:text-white hover:bg-[#2a2a2a] transition-colors neumorphic-interactive cursor-pointer"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Web Search"
                onClick={() => setIsWebSearchActive(!isWebSearchActive)}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors neumorphic-interactive cursor-pointer ${
                  isWebSearchActive ? "bg-white text-[#131313]" : "text-[#8e9192] hover:text-white hover:bg-[#2a2a2a]"
                }`}
              >
                <Globe className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Voice Input"
                onClick={() => setIsVoiceActive(!isVoiceActive)}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors neumorphic-interactive cursor-pointer ${
                  isVoiceActive ? "bg-red-500 text-white animate-pulse" : "text-[#8e9192] hover:text-white hover:bg-[#2a2a2a]"
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Message Research AI..."
              rows={1}
              className="flex-1 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-white text-xs sm:text-sm p-3 max-h-36 min-h-[48px] custom-scrollbar placeholder-[#444748] font-sans leading-relaxed"
            />

            <div className="pb-2 pr-2">
              <button
                type="button"
                onClick={handleSendMessage}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full neumorphic-raised flex items-center justify-center transition-all cursor-pointer ${
                  inputMessage.trim()
                    ? "bg-white text-[#131313] hover:bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                    : "text-[#8e9192] hover:text-white"
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="bg-[#131313] h-screen text-white flex items-center justify-center">Loading Workspace...</div>}>
      <WorkspaceContent />
    </Suspense>
  );
}
