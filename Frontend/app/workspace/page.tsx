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
  Upload,
  RefreshCw,
  Server,
  Zap,
  Activity,
  Layers,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileCode,
  FileType
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
  isLoading?: boolean;
  attachedDocInfo?: {
    filename: string;
    type: string;
    wordCount: number;
    sizeStr: string;
  };
}

interface Asset {
  id: string;
  title: string;
  author: string;
  size?: string;
}

interface AttachedDoc {
  filename: string;
  type: string;
  text: string;
  wordCount: number;
  pageCount: number;
  sizeStr: string;
}

function SkeletonLoader({ title }: { title?: string }) {
  return (
    <div className="neumorphic-sunken p-5 sm:p-6 rounded-r-3xl rounded-tl-3xl max-w-2xl border border-white/[0.04] w-full animate-pulse space-y-4">
      {/* Skeleton Title & Active Tool Chips */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-white/20 animate-spin border-2 border-white border-t-transparent" />
          <div className="h-4 w-48 bg-white/15 rounded-md" />
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/70">
          <Sparkles className="w-3 h-3 text-emerald-400 animate-bounce" />
          <span>Analyzing Document & Multi-Source...</span>
        </div>
      </div>

      {/* Tool Execution Badges */}
      <div className="flex flex-wrap gap-2 pt-1">
        <div className="h-6 w-28 bg-white/10 rounded-full flex items-center gap-1.5 px-2.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          <span className="h-2 w-16 bg-white/20 rounded" />
        </div>
        <div className="h-6 w-32 bg-white/10 rounded-full flex items-center gap-1.5 px-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="h-2 w-20 bg-white/20 rounded" />
        </div>
        <div className="h-6 w-24 bg-white/10 rounded-full flex items-center gap-1.5 px-2.5">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
          <span className="h-2 w-12 bg-white/20 rounded" />
        </div>
      </div>

      {/* Skeleton Body Lines */}
      <div className="space-y-2.5 pt-2">
        <div className="h-4 bg-gradient-to-r from-white/15 via-white/25 to-white/15 rounded-md w-full" />
        <div className="h-4 bg-gradient-to-r from-white/15 via-white/25 to-white/15 rounded-md w-11/12" />
        <div className="h-4 bg-gradient-to-r from-white/15 via-white/25 to-white/15 rounded-md w-4/5" />
      </div>

      {/* Skeleton Bullet Points */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/30" />
          <div className="h-3 bg-white/10 rounded w-3/4" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/30" />
          <div className="h-3 bg-white/10 rounded w-2/3" />
        </div>
      </div>

      {/* Skeleton Action Buttons */}
      <div className="flex gap-2 pt-3 border-t border-white/[0.03]">
        <div className="h-7 w-24 bg-white/10 rounded-full" />
        <div className="h-7 w-24 bg-white/10 rounded-full" />
      </div>
    </div>
  );
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
  const [isWebSearchActive, setIsWebSearchActive] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [maxSteps, setMaxSteps] = useState(6);

  // Document Attachment state
  const [attachedDoc, setAttachedDoc] = useState<AttachedDoc | null>(null);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [activeGraphMsg, setActiveGraphMsg] = useState<Message | null>(null);
  const [apiUrl, setApiUrl] = useState("http://localhost:8000");
  const [backendStatus, setBackendStatus] = useState<"unchecked" | "connected" | "failed">("unchecked");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processedPromptRef = useRef<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [threadHistory, setThreadHistory] = useState<{ id: string; title: string; time: string }[]>([
    { id: "t-1", title: "GTA 6 Leaks & Rumors Analysis", time: "10 mins ago" },
    { id: "t-2", title: "Quantum Error Correction Papers", time: "1 hour ago" }
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const testBackendConnection = async () => {
    setBackendStatus("unchecked");
    try {
      const res = await fetch(`${apiUrl}/`, { method: "GET" });
      if (res.ok) {
        setBackendStatus("connected");
        showToast("Backend Server connected successfully!");
      } else {
        setBackendStatus("failed");
        showToast("Backend returned error status.");
      }
    } catch {
      setBackendStatus("failed");
      showToast("Cannot connect to Backend at " + apiUrl);
    }
  };

  const executeResearch = async (queryText: string, docToAnalyze?: AttachedDoc | null) => {
    setIsGenerating(true);

    const thinkingMsgId = `agent-${Date.now()}`;
    const initialAgentMsg: Message = {
      id: thinkingMsgId,
      sender: "agent",
      senderName: selectedModel,
      avatarIcon: "bot",
      title: docToAnalyze
        ? `Document Analysis: ${docToAnalyze.filename}`
        : `Multi-Source Research: ${queryText.slice(0, 35)}${queryText.length > 35 ? "..." : ""}`,
      content: "",
      bullets: [],
      timestamp: "Just now",
      isLoading: true
    };

    setMessages((prev) => [...prev, initialAgentMsg]);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = { query: queryText, max_steps: maxSteps };
      if (docToAnalyze) {
        payload.doc_text = docToAnalyze.text;
        payload.doc_name = docToAnalyze.filename;
        payload.doc_type = docToAnalyze.type;
      }

      const res = await fetch(`${apiUrl}/api/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
                    docToAnalyze ? `Analyzed document '${docToAnalyze.filename}'` : "Evaluated multi-source search",
                    "Synthesized findings via RICE Engine"
                  ],
                  isLoading: false
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
                  content: `### ⚠️ Backend Error (${res.status})\n${errData.detail || "Make sure GROQ_API_KEY or GEMINI_API_KEY is properly set in Backend/.env"}.\n\nEnsure server.py is running on \`${apiUrl}\`.`,
                  bullets: ["Check Backend server logs at port 8000"],
                  isLoading: false
                }
              : msg
          )
        );
      }
    } catch (err) {
      console.warn("Backend API not reachable:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === thinkingMsgId
            ? {
                ...msg,
                content: `### 🌐 Connection Failed\nCould not reach RICE Backend API at \`${apiUrl}\`.\n\nPlease verify that the backend server is active by running:\n\`\`\`bash\npython server.py\n\`\`\``,
                bullets: [
                  "Connected state: Failed",
                  "Verify backend server execution"
                ],
                isLoading: false
              }
            : msg
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle prompt passed from landing page safely
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
      executeResearch(q, null);
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
    if ((!inputMessage.trim() && !attachedDoc) || isGenerating) return;

    const userText = inputMessage.trim() || (attachedDoc ? `Summarize and analyze document: ${attachedDoc.filename}` : "");
    const docToSubmit = attachedDoc;

    setInputMessage("");
    setAttachedDoc(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      senderName: "Researcher",
      avatarIcon: "person",
      content: userText,
      timestamp: "Just now",
      attachedDocInfo: docToSubmit ? {
        filename: docToSubmit.filename,
        type: docToSubmit.type,
        wordCount: docToSubmit.wordCount,
        sizeStr: docToSubmit.sizeStr
      } : undefined
    };

    setMessages((prev) => [...prev, userMsg]);

    // Save to thread history
    setThreadHistory((prev) => [
      { id: `t-${Date.now()}`, title: userText.slice(0, 30) + (userText.length > 30 ? "..." : ""), time: "Just now" },
      ...prev
    ]);

    executeResearch(userText, docToSubmit);
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
    showToast("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    showToast(`Parsing ${file.name}...`);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${apiUrl}/api/documents/parse`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const meta = data.metadata || {};
        const docObj: AttachedDoc = {
          filename: meta.filename || file.name,
          type: meta.type || "Document",
          text: data.text || "",
          wordCount: meta.word_count || 0,
          pageCount: meta.page_count || 1,
          sizeStr: `${(file.size / 1024).toFixed(1)} KB`
        };
        setAttachedDoc(docObj);
        setAssets((prev) => [
          ...prev,
          {
            id: `${Date.now()}`,
            title: docObj.filename,
            author: docObj.type,
            size: docObj.sizeStr
          }
        ]);
        showToast(`Attached ${file.name} (${docObj.wordCount} words)`);
      } else {
        // Fallback local text reading
        const text = await file.text().catch(() => "");
        const docObj: AttachedDoc = {
          filename: file.name,
          type: "File Attachment",
          text: text,
          wordCount: text ? text.split(/\s+/).length : 0,
          pageCount: 1,
          sizeStr: `${(file.size / 1024).toFixed(1)} KB`
        };
        setAttachedDoc(docObj);
        showToast(`Attached ${file.name}`);
      }
    } catch (err) {
      console.error(err);
      const text = await file.text().catch(() => "");
      const docObj: AttachedDoc = {
        filename: file.name,
        type: "Document",
        text: text,
        wordCount: text ? text.split(/\s+/).length : 0,
        pageCount: 1,
        sizeStr: `${(file.size / 1024).toFixed(1)} KB`
      };
      setAttachedDoc(docObj);
      showToast(`Attached ${file.name}`);
    }
  };

  // Voice Input Speech Recognition handler
  const toggleVoiceInput = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast("Voice Recognition not supported in this browser.");
      return;
    }

    if (isVoiceActive) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsVoiceActive(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsVoiceActive(true);
        showToast("Listening... speak into your microphone.");
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
          showToast(`Captured: "${transcript}"`);
        }
        setIsVoiceActive(false);
      };

      recognition.onerror = () => {
        setIsVoiceActive(false);
        showToast("Speech recognition error.");
      };

      recognition.onend = () => {
        setIsVoiceActive(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsVoiceActive(false);
      showToast("Could not access microphone.");
    }
  };

  const clearChatHistory = () => {
    setMessages([]);
    showToast("Cleared active chat session.");
    setIsUserModalOpen(false);
  };

  const getDocIcon = (type: string) => {
    if (type.includes("PDF")) return <FileType className="w-4 h-4 text-rose-400" />;
    if (type.includes("Word") || type.includes("DOC")) return <FileText className="w-4 h-4 text-blue-400" />;
    if (type.includes("CSV") || type.includes("Spreadsheet")) return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    if (type.includes("JSON") || type.includes("Code")) return <FileCode className="w-4 h-4 text-amber-400" />;
    return <FileText className="w-4 h-4 text-purple-400" />;
  };

  return (
    <div className="bg-[#131313] text-[#e5e2e1] h-screen overflow-hidden flex flex-col font-sans select-none relative">
      {/* Hidden file input supporting PDF, DOCX, CSV, TXT, JSON, MD, LOG */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".pdf,.docx,.doc,.csv,.txt,.json,.md,.log"
      />

      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="fixed bottom-24 right-6 z-50 bg-[#201f1f] text-white px-4 py-2.5 rounded-2xl neumorphic-raised border border-white/10 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Settings Modal ── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neumorphic-raised bg-[#131313] border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-6 text-white animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base">Engine Settings</h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-8 h-8 rounded-full neumorphic-raised flex items-center justify-center hover:bg-[#201f1f] text-white/70 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-white/80 font-medium mb-1.5">Backend API URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="neumorphic-sunken flex-1 px-3.5 py-2.5 rounded-xl bg-transparent border-none text-white focus:outline-none font-mono"
                  />
                  <button
                    onClick={testBackendConnection}
                    className="neumorphic-raised px-3 py-2 rounded-xl text-white font-medium hover:bg-[#201f1f] flex items-center gap-1 cursor-pointer"
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>Test</span>
                  </button>
                </div>
                {backendStatus === "connected" && (
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected to Backend API
                  </p>
                )}
                {backendStatus === "failed" && (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Could not reach host
                  </p>
                )}
              </div>

              <div>
                <label className="block text-white/80 font-medium mb-1.5">
                  Max ReAct Reasoning Steps: <span className="font-bold text-white">{maxSteps}</span>
                </label>
                <input
                  type="range"
                  min={2}
                  max={10}
                  value={maxSteps}
                  onChange={(e) => setMaxSteps(Number(e.target.value))}
                  className="w-full accent-white cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-white/50 mt-1">
                  <span>2 Fast</span>
                  <span>6 Default</span>
                  <span>10 Deep Research</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">ChromaDB Vector Memory</div>
                  <div className="text-[11px] text-white/50">Phase 3 persistent context index</div>
                </div>
                <button
                  onClick={() => showToast("Memory DB index synced")}
                  className="neumorphic-raised px-3 py-1.5 rounded-full text-xs text-white hover:bg-[#201f1f] cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sync</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-full py-2.5 rounded-2xl bg-white text-black font-bold text-xs hover:bg-white/90 transition-colors cursor-pointer"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── User Profile Modal ── */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neumorphic-raised bg-[#131313] border border-white/10 rounded-3xl w-full max-w-sm p-6 space-y-5 text-white animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <UserCircle className="w-6 h-6 text-white" />
                <div>
                  <h3 className="font-bold text-sm">Researcher Pro</h3>
                  <p className="text-[10px] text-white/50">Active Developer Tier</p>
                </div>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="w-7 h-7 rounded-full neumorphic-raised flex items-center justify-center text-white/70 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="neumorphic-sunken p-3 rounded-2xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/60">Engine Protocol:</span>
                  <span className="font-bold text-emerald-400">ReAct Multi-Tool</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Primary LLM:</span>
                  <span className="font-bold text-white">Groq / Gemini Fallback</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Document Parser:</span>
                  <span className="font-bold text-blue-400">PDF, DOCX, CSV, TXT, JSON</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Vector Database:</span>
                  <span className="font-bold text-white">ChromaDB Local</span>
                </div>
              </div>

              <button
                onClick={clearChatHistory}
                className="w-full neumorphic-raised py-2.5 rounded-2xl flex items-center justify-center gap-2 text-rose-400 hover:text-rose-300 font-medium text-xs cursor-pointer border border-rose-500/20 hover:border-rose-500/40 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Chat History</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Plot Graph / Data Visualization Modal ── */}
      {activeGraphMsg && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="neumorphic-raised bg-[#131313] border border-white/10 rounded-3xl w-full max-w-2xl p-6 space-y-6 text-white animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <BarChart2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Research Metrics & Source Graph</h3>
              </div>
              <button
                onClick={() => setActiveGraphMsg(null)}
                className="w-8 h-8 rounded-full neumorphic-raised flex items-center justify-center text-white/70 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-xs text-white/70 font-medium">
                Analysis for: <span className="text-white font-bold">{activeGraphMsg.title || "Query Response"}</span>
              </div>

              {/* Chart Visualizer */}
              <div className="neumorphic-sunken p-6 rounded-2xl space-y-4">
                <div className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Source Impact Distribution</span>
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/80">DuckDuckGo Web Search</span>
                      <span className="font-bold text-emerald-400">92% Relevance</span>
                    </div>
                    <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full w-[92%] transition-all duration-1000" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/80">arXiv Academic Index</span>
                      <span className="font-bold text-blue-400">85% Relevance</span>
                    </div>
                    <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full w-[85%] transition-all duration-1000" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/80">Wikipedia Fact Grounding</span>
                      <span className="font-bold text-purple-400">78% Grounding</span>
                    </div>
                    <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-400 rounded-full w-[78%] transition-all duration-1000" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/80">Attached Document Content</span>
                      <span className="font-bold text-amber-400">95% Context Match</span>
                    </div>
                    <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full w-[95%] transition-all duration-1000" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Execution Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="neumorphic-raised p-3 rounded-xl text-center">
                  <div className="text-[10px] text-white/50">Tool Steps</div>
                  <div className="text-base font-bold text-white">4 Calls</div>
                </div>
                <div className="neumorphic-raised p-3 rounded-xl text-center">
                  <div className="text-[10px] text-white/50">Latency</div>
                  <div className="text-base font-bold text-emerald-400">1.2s</div>
                </div>
                <div className="neumorphic-raised p-3 rounded-xl text-center">
                  <div className="text-[10px] text-white/50">Confidence</div>
                  <div className="text-base font-bold text-blue-400">98.4%</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveGraphMsg(null)}
              className="w-full py-2.5 rounded-2xl bg-white text-black font-bold text-xs hover:bg-white/90 transition-colors cursor-pointer"
            >
              Close Metrics View
            </button>
          </div>
        </div>
      )}

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
              {["Agent Alpha v4", "RICE ReAct v3 (Groq + Gemini)", "Deep Research Pro", "Claude 3.5 Sonnet"].map((model) => (
                <button
                  key={model}
                  onClick={() => {
                    setSelectedModel(model);
                    setIsModelDropdownOpen(false);
                    showToast(`Selected ${model}`);
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
            title="Engine Settings"
            onClick={() => setIsSettingsOpen(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full neumorphic-raised neumorphic-interactive flex items-center justify-center text-[#c4c7c8] hover:text-white cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            title="Account & Stats"
            onClick={() => setIsUserModalOpen(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full neumorphic-raised neumorphic-interactive flex items-center justify-center text-[#c4c7c8] hover:text-white cursor-pointer"
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
            <div className="text-lg font-bold text-white mb-0.5 tracking-tight flex items-center justify-between">
              <span>Research Terminal</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-xs text-[#8e9192]">V2.0.4 Online • Doc Analysis Active</div>
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
                      No assets attached yet
                    </div>
                  ) : (
                    assets.map((asset) => (
                      <div
                        key={asset.id}
                        className="neumorphic-sunken p-3 rounded-2xl group cursor-pointer hover:bg-[#090909] transition-colors"
                      >
                        <div className="flex items-start">
                          <div className="neumorphic-raised w-7 h-7 rounded-full flex items-center justify-center text-white mr-2.5 shrink-0 mt-0.5">
                            {getDocIcon(asset.author)}
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-xs font-medium leading-tight text-white group-hover:text-white/90 mb-1 truncate">
                              {asset.title}
                            </h4>
                            <p className="text-[10px] text-[#c4c7c8]">{asset.author} {asset.size ? `(${asset.size})` : ""}</p>
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
                    <span>Upload Document (PDF/DOCX/CSV)</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="mt-6 pt-4 border-t border-[#201f1f] flex flex-col space-y-2.5 px-1">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2 px-1">Recent Threads</h3>
                {threadHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      showToast(`Loaded thread: ${item.title}`);
                    }}
                    className="neumorphic-sunken p-3 rounded-2xl cursor-pointer hover:bg-[#090909] transition-colors"
                  >
                    <p className="text-xs font-medium text-white line-clamp-1">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-[#8e9192] mt-0.5">{item.time}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "tools" && (
              <div className="mt-6 pt-4 border-t border-[#201f1f] flex flex-col space-y-2.5 px-1">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2 px-1">Active Integrations</h3>
                {[
                  { name: "Document Analysis Engine", icon: FileText },
                  { name: "arXiv Search Engine", icon: Search },
                  { name: "Python Code Interpreter", icon: Code },
                  { name: "Vector Database Index", icon: Database },
                  { name: "Autonomous Synthesizer", icon: Cpu },
                  { name: "Hacker News Recency Search", icon: Zap }
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
              <div className="flex flex-col items-center justify-center text-center px-4 select-none my-auto space-y-4">
                <div className="w-16 h-16 rounded-full neumorphic-raised flex items-center justify-center mb-2">
                  <Sparkles className="w-8 h-8 text-white/90" />
                </div>
                <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight font-sans">
                  What are we searching today
                </h2>
                <p className="text-xs sm:text-sm text-white/50 max-w-md">
                  Attach PDFs, DOCX, CSV, or Text files & run multi-source research powered by arXiv, DuckDuckGo & Hacker News.
                </p>
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

                    {/* Message Bubble or Skeleton Loader */}
                    {msg.sender === "user" ? (
                      <div className="neumorphic-raised p-4 sm:p-5 rounded-l-3xl rounded-tr-3xl max-w-xl bg-[#131313] space-y-3">
                        {/* Attached Document Card in User Bubble */}
                        {msg.attachedDocInfo && (
                          <div className="neumorphic-sunken p-3 rounded-2xl flex items-center gap-3 border border-white/10 bg-[#0c0c0c]">
                            <div className="w-9 h-9 rounded-xl neumorphic-raised flex items-center justify-center shrink-0">
                              {getDocIcon(msg.attachedDocInfo.type)}
                            </div>
                            <div className="flex-1 overflow-hidden text-xs">
                              <div className="font-semibold text-white truncate">{msg.attachedDocInfo.filename}</div>
                              <div className="text-[10px] text-white/60">
                                {msg.attachedDocInfo.type} • {msg.attachedDocInfo.wordCount} words ({msg.attachedDocInfo.sizeStr})
                              </div>
                            </div>
                          </div>
                        )}
                        <p className="text-xs sm:text-sm text-white leading-relaxed">{msg.content}</p>
                      </div>
                    ) : msg.isLoading ? (
                      <SkeletonLoader title={msg.title} />
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

                        {msg.bullets && msg.bullets.length > 0 && (
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
                            onClick={() => setActiveGraphMsg(msg)}
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
          <div className="neumorphic-raised rounded-3xl p-2 mb-4 flex flex-col relative mx-1 sm:mx-4 space-y-2">
            
            {/* Attached Document Preview Chip */}
            {attachedDoc && (
              <div className="flex items-center justify-between bg-[#1d1d1d] px-3 py-1.5 rounded-2xl border border-white/10 text-xs mx-1">
                <div className="flex items-center gap-2 overflow-hidden">
                  {getDocIcon(attachedDoc.type)}
                  <span className="font-semibold text-white truncate max-w-[200px] sm:max-w-xs">{attachedDoc.filename}</span>
                  <span className="text-[10px] text-white/50">({attachedDoc.type} • {attachedDoc.wordCount} words)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedDoc(null)}
                  className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer ml-2"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="flex items-end">
              <div className="flex items-center space-x-1 pb-2 pl-2">
                <button
                  type="button"
                  title="Attach file (PDF, DOCX, CSV, TXT, JSON, MD)"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#8e9192] hover:text-white hover:bg-[#2a2a2a] transition-colors neumorphic-interactive cursor-pointer"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Web Search Priority"
                  onClick={() => {
                    setIsWebSearchActive(!isWebSearchActive);
                    showToast(isWebSearchActive ? "Web search priority toggled OFF" : "Web search priority ON");
                  }}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors neumorphic-interactive cursor-pointer ${
                    isWebSearchActive ? "bg-white text-[#131313]" : "text-[#8e9192] hover:text-white hover:bg-[#2a2a2a]"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Voice Input (Speech-to-Text)"
                  onClick={toggleVoiceInput}
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
                placeholder={attachedDoc ? `Ask a question about ${attachedDoc.filename}...` : "Message Research AI or attach documents..."}
                rows={1}
                className="flex-1 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-white text-xs sm:text-sm p-3 max-h-36 min-h-[48px] custom-scrollbar placeholder-[#444748] font-sans leading-relaxed"
              />

              <div className="pb-2 pr-2">
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={isGenerating || (!inputMessage.trim() && !attachedDoc)}
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full neumorphic-raised flex items-center justify-center transition-all cursor-pointer ${
                    (inputMessage.trim() || attachedDoc) && !isGenerating
                      ? "bg-white text-[#131313] hover:bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                      : "text-[#8e9192] hover:text-white opacity-50 cursor-not-allowed"
                  }`}
                >
                  {isGenerating ? <Layers className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="bg-[#131313] h-screen text-white flex items-center justify-center font-sans">Loading Workspace...</div>}>
      <WorkspaceContent />
    </Suspense>
  );
}
