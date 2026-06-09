import React, { useState, useEffect } from "react";
import { BotConfig, FAQItem, ChatTone, ChatMessage } from "../types";
import { 
  Bot, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  RefreshCw, 
  MessageSquare, 
  Sparkles, 
  HelpCircle, 
  Settings2,
  Lock,
  User,
  Mail,
  Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BotDashboardProps {
  config: BotConfig;
  onUpdateConfig: (newConfig: Partial<BotConfig>) => Promise<void>;
  refreshDb: () => void;
}

export default function BotDashboard({ config, onUpdateConfig, refreshDb }: BotDashboardProps) {
  const [activeTab, setActiveTab] = useState<"onboarding" | "faqs" | "widget" | "playground">("onboarding");
  
  // Form fields
  const [businessName, setBusinessName] = useState(config.businessName || "");
  const [industry, setIndustry] = useState(config.industry || "");
  const [tone, setTone] = useState<ChatTone>(config.tone || ChatTone.PROFESSIONAL);
  const [leadCaptureActive, setLeadCaptureActive] = useState(config.leadCaptureActive || false);
  
  // FAQ fields
  const [faqs, setFaqs] = useState<FAQItem[]>(config.faqs || []);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  
  // Custom Widget Style states
  const [widgetColor, setWidgetColor] = useState<"sky" | "emerald" | "indigo" | "rose" | "amber">("sky");
  const [widgetPosition, setWidgetPosition] = useState<"right" | "left">("right");
  const [widgetGreeting, setWidgetGreeting] = useState("Hi! We're online.");

  // Chat playground fields
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: "1", sender: "bot", text: `Hi! I am authorized specifically to answer queries for ${config.businessName || 'EcoSprout Organics'}. How can I assist you today?`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // UI Helpers
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setBusinessName(config.businessName);
    setIndustry(config.industry);
    setTone(config.tone);
    setLeadCaptureActive(config.leadCaptureActive);
    setFaqs(config.faqs);
    // Restart conversation with updated company name
    setChatMessages([
      { id: "1", sender: "bot", text: `Hi! I am authorized specifically to answer queries for ${config.businessName || 'EcoSprout Organics'}. How can I assist you today?`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
  }, [config]);

  const handleSaveOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onUpdateConfig({
      businessName,
      industry,
      tone,
      leadCaptureActive
    });
    setIsSaving(false);
    setActiveTab("playground");
  };

  const handleAddFaq = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    
    const updatedFaqs = [
      ...faqs,
      {
        id: `faq-${Date.now()}`,
        question: newQuestion.trim(),
        answer: newAnswer.trim()
      }
    ];
    
    setFaqs(updatedFaqs);
    setNewQuestion("");
    setNewAnswer("");
    
    await onUpdateConfig({ faqs: updatedFaqs });
  };

  const handleDeleteFaq = async (id: string) => {
    const updatedFaqs = faqs.filter(f => f.id !== id);
    setFaqs(updatedFaqs);
    await onUpdateConfig({ faqs: updatedFaqs });
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText ? customText.trim() : userInput.trim();
    if (!textToSend) return;
    
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    if (!customText) {
      setUserInput("");
    }
    setIsTyping(true);
    
    // Map existing history for backend endpoint
    const history = chatMessages.map(m => ({ sender: m.sender, text: m.text }));
    
    try {
      const response = await fetch("/api/bot/chat", {
        method: "POST",
         headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text, chatHistory: history })
      });
      const data = await response.json();
      
      setIsTyping(false);
      
      const botMsg: ChatMessage = {
        id: `msg-bot-${Date.now()}`,
        sender: "bot",
        text: data.reply || "I encountered an issue processing that query.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setChatMessages(prev => [...prev, botMsg]);
      
      if (data.leadCaptured) {
        // Trigger a background DB refresh to update lead charts
        setTimeout(() => {
          refreshDb();
        }, 1000);
      }
    } catch (err) {
      setIsTyping(false);
      setChatMessages(prev => [
        ...prev,
        { id: `msg-err-${Date.now()}`, sender: "system", text: "Network sync error occurred. Please verify host logs.", timestamp: "" }
      ]);
    }
  };

  const scriptTagCode = `<script src="${window.location.origin}/widget.js" data-bot-id="aiforge-bot-default" defer></script>`;

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(scriptTagCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6" id="bot-dashboard-root">
      
      {/* Header and Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-sky-400" />
            AI Chatbot Builder
          </h2>
          <p className="text-sm text-slate-400">
            Train, configure, and script embed your business chat agent instantly.
          </p>
        </div>
        
        {/* Horizontal Tab Links */}
        <div className="flex flex-wrap bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab("onboarding")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === 'onboarding' ? 'bg-sky-550/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            1. Core Profile
          </button>
          <button 
            onClick={() => setActiveTab("faqs")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === 'faqs' ? 'bg-sky-550/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            2. FAQ Guide ({faqs.length})
          </button>
          <button 
            onClick={() => setActiveTab("playground")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === 'playground' ? 'bg-sky-550/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            3. Live Tester
          </button>
          <button 
            onClick={() => setActiveTab("widget")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === 'widget' ? 'bg-sky-550/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            4. Embed Widget
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main interactive Tab Content */}
        <div className="lg:col-span-12">
          <AnimatePresence mode="wait">
            
            {/* Step 1: Onboarding Settings */}
            {activeTab === "onboarding" && (
              <motion.div 
                key="onboarding"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sky-400">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">Business Settings & Tone</h3>
                    <p className="text-xs text-slate-450 text-slate-400">Establish the core profile Gemini uses to represent your company.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveOnboarding} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Company / Business Name</label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. EcoSprout Organics"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Industry / Category</label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. Retail, Healthcare, SaaS"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Speaking Tone Accent</label>
                      <select 
                        value={tone}
                        onChange={(e) => setTone(e.target.value as ChatTone)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors cursor-pointer"
                      >
                        {Object.values(ChatTone).map((t) => (
                          <option key={t} value={t} className="bg-slate-900">{t}</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-500">
                        Adjusts response sentiment, sentence lengths, and phrasing structures.
                      </p>
                    </div>

                    <div className="space-y-2 bg-slate-950/50 border border-slate-800/80 p-4 rounded-xl flex items-start gap-4">
                      <input 
                        type="checkbox"
                        id="leadCapture"
                        checked={leadCaptureActive}
                        onChange={(e) => setLeadCaptureActive(e.target.checked)}
                        className="w-5 h-5 mt-0.5 rounded border-slate-800 bg-slate-950 text-sky-500 focus:ring-sky-500 cursor-pointer"
                      />
                      <div className="space-y-1">
                        <label htmlFor="leadCapture" className="text-sm font-semibold text-white select-none cursor-pointer flex items-center gap-1.5 hover:text-sky-400 transition-colors">
                          Activate AI Lead Capture Mode
                        </label>
                        <p className="text-xs text-slate-450 text-slate-400">
                          Instructs Gemini to identify visitor buying intent and politely capture **Name** and **Email** addresses. Captured logs feed into your CRM database instantly.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-850 flex justify-end">
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-sky-650 hover:bg-sky-600 bg-sky-600 border border-sky-500/20 hover:border-sky-500/40 text-white font-medium text-sm rounded-xl transition-all shadow-lg flex items-center gap-2"
                    >
                      {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                      Save Config & Test Bot
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step 2: FAQ Guides */}
            {activeTab === "faqs" && (
              <motion.div 
                key="faqs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Onboarding FAQ add box */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Plus className="w-5 h-5 text-sky-400" />
                    <h3 className="text-lg font-medium text-white">Add FAQ training record</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-slate-500 uppercase">Question Visitors Might Ask</label>
                      <input 
                        type="text"
                        placeholder="e.g. What is your refund policy?"
                        value={newQuestion || ""}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-slate-500 uppercase">Specific / Precise Answer (Truth Source)</label>
                      <textarea 
                        rows={3}
                        placeholder="e.g. We offer full refund guarantees on standard subscriptions cancelled within the first 14 business days of activation..."
                        value={newAnswer || ""}
                        onChange={(e) => setNewAnswer(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors resize-none"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button 
                        type="button"
                        onClick={handleAddFaq}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-all border border-slate-700 hover:border-slate-600 flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Inject into Knowledgebase
                      </button>
                    </div>
                  </div>
                </div>

                {/* FAQ List Cards */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-1">Trained Knowledge Records ({faqs.length})</h4>
                  
                  {faqs.length === 0 ? (
                    <div className="bg-slate-900 border border-dashed border-slate-850 p-12 text-center rounded-xl text-slate-500">
                      No customized FAQs defined yet. Add some questions above to fine-tune visitor answering precision!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {faqs.map((f) => (
                        <div key={f.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative group hover:border-slate-720 transition-all">
                          <button 
                            type="button" 
                            onClick={() => handleDeleteFaq(f.id)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-red-400 p-1.5 hover:bg-slate-820 rounded-lg transition-all"
                            title="Delete FAQ training data"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          
                          <div className="space-y-2 pr-6">
                            <h5 className="font-semibold text-slate-200 text-sm">{f.question}</h5>
                            <p className="text-xs text-slate-400 line-clamp-4 leading-relaxed">{f.answer}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Playground Chat Tester */}
            {activeTab === "playground" && (
              <motion.div 
                key="playground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[550px]"
              >
                
                {/* Left controls summary info */}
                <div className="md:col-span-4 bg-slate-950/40 p-6 border-r border-slate-800/80 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <h4 className="text-sm font-semibold text-white">Live Sandbox Tester</h4>
                    </div>
                    
                    <p className="text-xs text-slate-400 leading-relaxed">
                      This playground tests exactly how Gemini performs queries based on your custom tone, context FAQs, and lead capture state.
                    </p>

                    <div className="border border-slate-850 p-4 rounded-xl space-y-3 bg-slate-900/60 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Corporate Identity</span>
                        <span className="text-white font-medium">{config.businessName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Assigned Industry</span>
                        <span className="text-white font-medium">{config.industry}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Tone Standard</span>
                        <span className="text-sky-400 font-medium">{config.tone}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Lead Capturing</span>
                        <span className={`font-semibold ${config.leadCaptureActive ? "text-emerald-400" : "text-slate-550 text-slate-400"}`}>
                          {config.leadCaptureActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-850/60">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Sandbox Hotkey Generators</p>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleSendMessage(`What services do you offer in ${config.industry || "your industry"}?`)}
                        className="text-left w-full text-[11px] bg-slate-900 border border-slate-800 hover:border-sky-500/40 p-2 rounded-lg text-slate-350 hover:text-white transition-all"
                      >
                        ⚡ <span className="font-semibold text-sky-400">Ask:</span> Who are you & what do you offer?
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendMessage(config.faqs.length > 0 ? config.faqs[0].question : "Do you offer customer refunds or guarantees?")}
                        className="text-left w-full text-[11px] bg-slate-900 border border-slate-800 hover:border-sky-500/40 p-2 rounded-lg text-slate-350 hover:text-white transition-all truncate"
                        title={config.faqs.length > 0 ? config.faqs[0].question : "Do you offer customer refunds or guarantees?"}
                      >
                        ⚡ <span className="font-semibold text-sky-400">Test FAQ:</span> {config.faqs.length > 0 ? config.faqs[0].question : "Refund queries"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendMessage("I am interested in ordering. My name is Chris Sterling and email is chris@sterling.com")}
                        className="text-left w-full text-[11px] bg-[#0c2229] border border-teal-500/25 hover:border-teal-500/60 p-2 rounded-lg text-slate-300 hover:text-white transition-all text-teal-350"
                      >
                        👤 <span className="font-semibold text-emerald-400">Capture:</span> Trigger sandbox user lead
                      </button>
                    </div>

                    <button 
                      type="button"
                      onClick={() => setChatMessages([
                        { id: "1", sender: "bot", text: `Hi! I am authorized specifically to answer queries for ${config.businessName || 'EcoSprout Organics'}. How can I assist you today?`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
                      ])}
                      className="text-xs text-sky-400 hover:underline flex items-center gap-1.5 mt-2"
                    >
                      <RefreshCw className="w-3 h-3" /> Clear stream & start fresh
                    </button>
                  </div>
                </div>

                {/* Right chat logs container */}
                <div className="md:col-span-8 flex flex-col h-full bg-[#0a0f1d] relative">
                  
                  {/* Messages Stream */}
                  <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {chatMessages.map((m) => (
                      <div 
                        key={m.id} 
                        className={`flex flex-col ${m.sender === 'user' ? 'items-end' : m.sender === 'bot' ? 'items-start' : 'items-center'}`}
                      >
                        {m.sender === 'system' ? (
                          <div className="bg-red-950/40 border border-red-900/40 text-[11px] text-red-400 px-3 py-1.5 rounded-lg text-center font-mono select-all">
                            {m.text}
                          </div>
                        ) : (
                          <div className="max-w-[85%] space-y-1">
                            <div className={`px-4 py-3 rounded-2xl text-xs leading-relaxed ${m.sender === 'user' ? 'bg-sky-600 text-white rounded-br-none' : 'bg-slate-900 text-slate-200 rounded-bl-none border border-slate-800'}`}>
                              {m.text}
                            </div>
                            <span className="text-[10px] text-slate-500 block px-1 text-right">{m.timestamp}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2.5 rounded-2xl rounded-bl-none text-xs w-28">
                        <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce delay-100"></span>
                        <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce delay-200"></span>
                        <span className="text-[11px] text-slate-400 pl-1.5 font-medium">Gemini...</span>
                      </div>
                    )}
                  </div>

                  {/* Send Inputs */}
                  <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
                    <input 
                      type="text"
                      placeholder="Type a query (e.g. What are your shipping rates?)..."
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSendMessage();
                      }}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors"
                    />
                    <button 
                      onClick={handleSendMessage}
                      className="px-4 py-2.5 bg-sky-600 hover:bg-sky-550 hover:bg-sky-500 hover:border-sky-400 text-white rounded-xl transition-all flex items-center justify-center p-2.5 hover:scale-103"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </motion.div>
            )}

            {/* Step 4: Embed Custom widget script code with Live Customizer & Simulation */}
            {activeTab === "widget" && (
              <motion.div 
                key="widget"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                
                {/* Left controls customization */}
                <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-yellow-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Embed Script Customizer</h3>
                      <p className="text-[11px] text-slate-400">Style the bubble widget to match your brand style instantly.</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2 border-t border-slate-800">
                    
                    {/* Color picker blobs */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Widget Color Accent</label>
                      <div className="flex gap-2.5">
                        {[
                          { id: "sky", bg: "bg-sky-500", name: "Sky" },
                          { id: "emerald", bg: "bg-emerald-500", name: "Emerald" },
                          { id: "indigo", bg: "bg-indigo-500", name: "Indigo" },
                          { id: "rose", bg: "bg-rose-500", name: "Rose" },
                          { id: "amber", bg: "bg-amber-500", name: "Amber" }
                        ].map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setWidgetColor(c.id as any)}
                            className={`w-7 h-7 rounded-full ${c.bg} hover:scale-110 active:scale-95 transition-transform relative`}
                            title={c.name}
                          >
                            {widgetColor === c.id && (
                              <span className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-white shadow-sm" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Position select */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Screen Corner Anchor</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setWidgetPosition("left")}
                          className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${widgetPosition === 'left' ? 'bg-sky-650/20 text-sky-400 border-sky-500/40' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                        >
                          Bottom-Left Corner
                        </button>
                        <button
                          type="button"
                          onClick={() => setWidgetPosition("right")}
                          className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${widgetPosition === 'right' ? 'bg-sky-650/20 text-sky-400 border-sky-500/40' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                        >
                          Bottom-Right Corner
                        </button>
                      </div>
                    </div>

                    {/* Live Greeting edit */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hover/Greeting Hint Bubble</label>
                      <input
                        type="text"
                        value={widgetGreeting}
                        onChange={(e) => setWidgetGreeting(e.target.value.slice(0, 32))}
                        placeholder="e.g. Ask Gemini anything!"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors"
                      />
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Renders as a welcoming message tag when customers hover over the floating messenger button.
                      </p>
                    </div>

                  </div>
                </div>

                {/* Right simulator mock view + embed generator output */}
                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
                  
                  {/* Webpage iframe simulator mockup frame */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">LIVE WEBPAGE FLOATING SIMULATOR</span>
                    <div className="h-44 bg-[#0a0f1d] border border-slate-800 rounded-xl relative overflow-hidden flex flex-col justify-between p-4 shadow-inner">
                      
                      {/* Web layout mockup lines */}
                      <div className="space-y-1.5 opacity-30 select-none">
                        <div className="h-3 w-1/3 bg-slate-700 rounded-sm"></div>
                        <div className="h-2 w-full bg-slate-800 rounded-sm"></div>
                        <div className="h-2 w-5/6 bg-slate-800 rounded-sm"></div>
                        <div className="h-2 w-4/6 bg-slate-800 rounded-sm"></div>
                      </div>

                      <div className="text-center py-4 select-none opacity-20">
                        <p className="text-[11px] text-slate-450">Simulated Target Web Client Container</p>
                      </div>

                      {/* Floating custom styled mock widget bubble based on states */}
                      <div className={`absolute bottom-4 ${widgetPosition === 'left' ? 'left-4' : 'right-4'} flex items-center gap-2 z-10`}>
                        {widgetGreeting && (
                          <div className="bg-slate-900 border border-slate-800 text-[10px] text-slate-200 px-2.5 py-1.5 rounded-lg shadow-xl font-medium animate-bounce max-w-[150px] truncate leading-none">
                            {widgetGreeting}
                          </div>
                        )}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg cursor-pointer transform hover:scale-110 active:scale-95 transition-all text-white relative ${
                          widgetColor === "sky" ? "bg-sky-500" :
                          widgetColor === "emerald" ? "bg-emerald-500" :
                          widgetColor === "indigo" ? "bg-indigo-500" :
                          widgetColor === "rose" ? "bg-rose-500" : "bg-amber-500"
                        }`}>
                          <Bot className="w-5 h-5 animate-pulse" />
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border border-[#0a0f1d] rounded-full"></span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Generated Script code payload copy */}
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Copy the generated target snippet block. Your widget color choice and positions are directly configured:
                    </p>

                    <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl font-mono text-[10px] text-slate-350 relative group select-all break-all overflow-x-auto leading-relaxed">
                      {`<script src="${window.location.origin}/widget.js" data-bot-id="aiforge-bot-default" data-color="${widgetColor}" data-position="${widgetPosition}" data-greeting="${encodeURIComponent(widgetGreeting)}" defer></script>`}
                      
                      <button 
                        type="button"
                        onClick={() => {
                          const customCode = `<script src="${window.location.origin}/widget.js" data-bot-id="aiforge-bot-default" data-color="${widgetColor}" data-position="${widgetPosition}" data-greeting="${encodeURIComponent(widgetGreeting)}" defer></script>`;
                          navigator.clipboard.writeText(customCode);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="absolute top-2 right-2 bg-slate-900 border border-slate-800 group-hover:border-slate-700 p-2 rounded-lg text-slate-400 hover:text-white transition-all flex items-center gap-1 shadow"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 text-emerald-400" />
                            <span className="text-[9px] text-emerald-400 font-sans font-medium">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3" />
                            <span className="text-[9px] font-sans font-medium">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
