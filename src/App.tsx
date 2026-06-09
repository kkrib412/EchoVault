import { useState, useEffect, useRef } from "react";
import { BotConfig, FAQItem, CapturedLead, AuditReport, ConsultationLead } from "./types";
import BotDashboard from "./components/BotDashboard";
import AuditDashboard from "./components/AuditDashboard";
import LeadsDashboard from "./components/LeadsDashboard";
import Tooltip from "./components/Tooltip";
import GrowthDashboard from "./components/GrowthDashboard";
import { ToastContainer, ToastMessage } from "./components/Toast";
import { 
  Flame, 
  Bot, 
  Activity, 
  Users, 
  ArrowRight, 
  LayoutDashboard, 
  Sparkles, 
  MessageSquare, 
  FileCheck, 
  RefreshCw,
  Clock,
  Shield,
  ExternalLink,
  ChevronRight,
  Gauge
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"workspace" | "chatbot" | "audit" | "crm">("workspace");
  const [dbState, setDbState] = useState<{
    botConfig: BotConfig;
    capturedLeads: CapturedLead[];
    auditReports: AuditReport[];
    consultationLeads: ConsultationLead[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const seenLeadIds = useRef<Set<string>>(new Set());
  const seenConsultIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef<boolean>(true);

  const addToast = (title: string, message: string, type: "success" | "info" | "warning" = "success") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, title, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const fetchDb = async (isBackground = false) => {
    try {
      const res = await fetch("/api/db");
      const data = await res.json();
      
      if (data) {
        if (isInitialLoad.current) {
          if (data.capturedLeads) {
            data.capturedLeads.forEach((lead: any) => seenLeadIds.current.add(lead.id));
          }
          if (data.consultationLeads) {
            data.consultationLeads.forEach((consult: any) => seenConsultIds.current.add(consult.id));
          }
          isInitialLoad.current = false;
        } else {
          // Check for new captured chatbot leads
          if (data.capturedLeads) {
            data.capturedLeads.forEach((lead: any) => {
              if (!seenLeadIds.current.has(lead.id)) {
                seenLeadIds.current.add(lead.id);
                addToast(
                  "New Chat Lead Captured! 💬",
                  `${lead.name} (${lead.email || "No email"}) has been added to the CRM inbox.`,
                  "success"
                );
              }
            });
          }
          
          // Check for new consultation requests
          if (data.consultationLeads) {
            data.consultationLeads.forEach((consult: any) => {
              if (!seenConsultIds.current.has(consult.id)) {
                seenConsultIds.current.add(consult.id);
                addToast(
                  "New Consultation Request! 📅",
                  `${consult.name} requested an audit for ${consult.website}`,
                  "info"
                );
              }
            });
          }
        }
      }

      setDbState(prev => {
        if (!prev) return data;
        if (isBackground) {
          // Only update dynamic leads and reports to preserve the stable references of botConfig during inputs
          return {
            ...prev,
            capturedLeads: data.capturedLeads,
            auditReports: data.auditReports,
            consultationLeads: data.consultationLeads
          };
        }
        return data;
      });
    } catch (err) {
      console.error("Error fetching suite database:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDb();

    // Set up polling to check for live incoming leads in background
    const interval = setInterval(() => {
      fetchDb(true);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdateBotConfig = async (newConfig: Partial<BotConfig>) => {
    try {
      const response = await fetch("/api/bot/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig)
      });
      const resData = await response.json();
      if (resData.success) {
        setDbState(prev => prev ? {
          ...prev,
          botConfig: resData.botConfig
        } : null);
        addToast(
          "Agent Restructured 🔩",
          `Trained settings successfully for ${newConfig.businessName || "your business"}.`,
          "success"
        );
      }
    } catch (err) {
      console.error("Failed to update bot settings:", err);
      addToast("Failed to Train Bot", "Check workspace log for anomalies.", "warning");
    }
  };

  const handleRequestConsultation = async (leadData: Omit<ConsultationLead, "id" | "requestedAt" | "status">) => {
    try {
      const response = await fetch("/api/leads/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadData)
      });
      const data = await response.json();
      if (data.success) {
        await fetchDb(); // Refresh entire list
        addToast(
          "Proposal Sent! 🚀",
          `Consultation successfully filed for ${leadData.website}. Track pipeline status in CRM.`,
          "success"
        );
        return true;
      }
    } catch (err) {
      console.error("Failed to post consultation request:", err);
      addToast("Request Failed", "Connection pipeline failed, retry short-lived submission.", "warning");
    }
    return false;
  };

  const handleDeleteLead = async (id: string) => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (data.success) {
        // Ensure its ID is removed from sets so it won't trigger standard toast alert if reestablished under same ID
        seenLeadIds.current.delete(id);
        seenConsultIds.current.delete(id);
        await fetchDb();
        addToast("Contact Deleted", "Secured identity record removed from CRM inbox.", "info");
      }
    } catch (err) {
      console.error("Failed to delete lead from workspace:", err);
      addToast("Failed to Delete", "Lead could not be deleted from database.", "warning");
    }
  };

  const totalCRMLeadsCount = dbState 
    ? dbState.capturedLeads.length + dbState.consultationLeads.length 
    : 0;

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col font-sans" id="suite-container">
      
      {/* Dynamic Top App Banner */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-50 px-4 py-3.5 flex items-center justify-between" id="suite-header">
        <Tooltip content="Navigate to main Workspace Hub" position="bottom">
          <div className="flex items-center gap-2.5 select-none cursor-pointer" onClick={() => setActiveTab("workspace")}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-black shadow-lg shadow-orange-500/10">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                AI FORGE SUITE
                <span className="text-[10px] bg-sky-950 text-sky-400 font-mono py-0.5 px-2 rounded-full border border-sky-900/40 font-bold uppercase tracking-wider">
                  MVP v1.0
                </span>
              </h1>
              <p className="text-[10px] text-slate-400">Enterprise AI Growth Engine</p>
            </div>
          </div>
        </Tooltip>

        {/* Sync loading flag */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-450 text-xs">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400" />
            Loading Suite Database...
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Tooltip content="Open raw embed script CDN file in web browser" position="bottom">
              <a 
                href="/widget.js" 
                target="_blank"  
                className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                title="Widget embed javascript file link"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                widget.js CDN
              </a>
            </Tooltip>
            
            {/* Lead pill info */}
            <Tooltip content="Manage captured chatbot and audit booking leads" position="bottom">
              <div 
                onClick={() => setActiveTab("crm")}
                className="bg-sky-950/40 border border-sky-800/40 hover:border-sky-500/40 cursor-pointer rounded-full p-1 pl-2.5 pr-3.5 flex items-center gap-1.5 transition-all"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-sky-300 font-semibold tracking-wider font-mono">
                  {totalCRMLeadsCount} ACTIVE LEADS
                </span>
              </div>
            </Tooltip>
          </div>
        )}
      </header>

      {/* Main Suite Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full" id="suite-body-grid">
        
        {/* Workspace Sidebar Navigation */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 p-5 space-y-6 flex-shrink-0" id="suite-sidebar">
          
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-2">Client Workspace</p>
            <nav className="space-y-1">
              <Tooltip content="View dynamic analytics, logs and pipeline stats" position="right">
                <button 
                  id="sidebar-tab-overview"
                  onClick={() => setActiveTab("workspace")}
                  className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${activeTab === 'workspace' ? 'bg-orange-500/10 border border-orange-500/25 text-white shadow' : 'text-slate-400 border border-transparent hover:text-white hover:bg-slate-900'}`}
                >
                  <LayoutDashboard className="w-4 h-4 text-orange-400" />
                  Workspace Overview
                </button>
              </Tooltip>
            </nav>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-2">Product Forge Engines</p>
            <nav className="space-y-1">
              <Tooltip content="Configure Gemini bot persona, train dynamic FAQs & style chat bubble" position="right">
                <button 
                  id="sidebar-tab-chatbot"
                  onClick={() => setActiveTab("chatbot")}
                  className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${activeTab === 'chatbot' ? 'bg-sky-500/10 border border-sky-500/25 text-white shadow' : 'text-slate-400 border border-transparent hover:text-white hover:bg-slate-900'}`}
                >
                  <Bot className="w-4 h-4 text-sky-400" />
                  AI Chatbot Builder
                </button>
              </Tooltip>
              
              <Tooltip content="Check pages for speed latency, responsiveness, SEO metadata & compliance" position="right">
                <button 
                  id="sidebar-tab-audit"
                  onClick={() => setActiveTab("audit")}
                  className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${activeTab === 'audit' ? 'bg-emerald-500/10 border border-emerald-500/25 text-white shadow' : 'text-slate-400 border border-transparent hover:text-white hover:bg-slate-900'}`}
                >
                  <Activity className="w-4 h-4 text-emerald-400" />
                  AI Site Audit Tool
                </button>
              </Tooltip>
            </nav>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-2">CRM Optimization</p>
            <nav className="space-y-1">
              <Tooltip content="Search, filter, and export captured digital leads to CSV" position="right">
                <button 
                  id="sidebar-tab-crm"
                  onClick={() => setActiveTab("crm")}
                  className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-all ${activeTab === 'crm' ? 'bg-purple-500/10 border border-purple-500/25 text-white shadow' : 'text-slate-400 border border-transparent hover:text-white hover:bg-slate-900'}`}
                >
                  <span className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-purple-400" />
                    Unified Inbox CRM
                  </span>
                  {totalCRMLeadsCount > 0 && (
                    <span className="text-[10px] font-bold bg-[#1e152e] border border-purple-900/60 text-purple-400 px-2 py-0.5 rounded-full font-mono">
                      {totalCRMLeadsCount}
                    </span>
                  )}
                </button>
              </Tooltip>
            </nav>
          </div>

          {/* Prompt banner footer */}
          <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-2 text-center text-xs">
            <h5 className="font-semibold text-white">Gemini Trained Node</h5>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Express backend server leverages <code className="text-orange-400">gemini-3.5-flash</code> for high speed indexing.
            </p>
          </div>

        </aside>

        {/* Dynamic Screen Stage Area */}
        <main className="flex-1 p-6 md:p-10 overflow-x-hidden min-h-0" id="suite-main-stage">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-80 space-y-4">
              <RefreshCw className="w-10 h-10 text-orange-400 animate-spin" />
              <p className="text-slate-400 text-xs font-medium">Downloading latest workspace parameters...</p>
            </div>
          ) : dbState ? (
            <AnimatePresence mode="wait">
              
              {/* SCREEN 1: Suite Workspace / Agency Hub */}
              {activeTab === "workspace" && (
                <motion.div 
                  key="workspace"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  {/* Hero Intro Banner */}
                  <div className="bg-gradient-to-r from-orange-950/20 to-amber-950/10 border border-orange-500/20 p-8 rounded-2xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="max-w-2xl space-y-3">
                      <span className="text-[10px] font-bold text-orange-400 bg-orange-950 border border-orange-900/40 rounded px-2.5 py-1 uppercase tracking-widest">
                        CLIENT WORKSPACE HUB
                      </span>
                      
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        Powering high-velocity conversions with intelligent AI tools.
                      </h2>
                      
                      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                        Customize your brand personality, embed a responsive dialogue widget on your landing pages, and benchmark domains to generate instant, tailored consulting proposals that capture high-quality discoverable leads.
                      </p>

                      <div className="flex flex-wrap gap-3 pt-3">
                        <button 
                          onClick={() => setActiveTab("chatbot")}
                          className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-550 hover:to-amber-550 border border-orange-500/20 text-white font-semibold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 hover:scale-102"
                        >
                          Launch Builder <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        
                        <button 
                          onClick={() => setActiveTab("audit")}
                          className="px-4 py-2.5 hover:bg-slate-800 hover:text-white text-slate-350 border border-slate-800 bg-slate-900 rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
                        >
                          Benchmark Domain
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Growth Intel Analytics Recharts Dashboard */}
                  <GrowthDashboard 
                    chatLeads={dbState.capturedLeads}
                    auditReports={dbState.auditReports}
                    consultationLeads={dbState.consultationLeads}
                  />

                  {/* Dual platform capability modules boxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Tool 1 description card */}
                    <div className="bg-slate-900 border border-slate-800 hover:border-slate-720 p-6 rounded-2xl space-y-4 transition-all">
                      <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-450 text-sky-400 max-w-max">
                        <Bot className="w-5 h-5" />
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                          AI Chatbot Builder
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Define unique corporate personalities, set industries, list context FAQs, and copy embed tags to host custom CRM capture chat overlays globally.
                        </p>
                      </div>

                      <ul className="text-xs text-slate-350 space-y-2 pt-2">
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-sky-400"></div> Real-time Gemini-engineered prompts</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-sky-400"></div> Automatic user contact logic</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-sky-400"></div> Client embed widget.js cdn</li>
                      </ul>

                      <button 
                        onClick={() => setActiveTab("chatbot")}
                        className="text-xs text-sky-450 hover:text-sky-400 hover:underline flex items-center gap-1 font-semibold pt-2"
                      >
                        Launch Builder Studio <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Tool 2 description card */}
                    <div className="bg-slate-900 border border-slate-800 hover:border-slate-720 p-6 rounded-2xl space-y-4 transition-all">
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-450 text-emerald-400 max-w-max">
                        <Activity className="w-5 h-5" />
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                          AI Site Audit Tool
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Analyze landing pages for loading speed checklists, broker layouts, missing tags, and sitemap issues. Generates customized advisory reports dynamically.
                        </p>
                      </div>

                      <ul className="text-xs text-slate-350 space-y-2 pt-2">
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-405 bg-emerald-400"></div> Key core metric checklists</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-405 bg-emerald-400"></div> Plain-English advice</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-405 bg-emerald-400"></div> Interactive printable proposal</li>
                      </ul>

                      <button 
                        onClick={() => setActiveTab("audit")}
                        className="text-xs text-emerald-450 hover:text-emerald-400 hover:underline flex items-center gap-1 font-semibold pt-2"
                      >
                        Inquire Audit Engine <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>

                  {/* Recent Activity / Captured stats overview */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Latest Workspace Events</h4>
                    
                    <div className="space-y-3">
                      {totalCRMLeadsCount === 0 && dbState.auditReports.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-6">Workspace event log is quiet.</p>
                      ) : (
                        <div className="divide-y divide-slate-850 text-xs">
                          
                          {/* Bot Configured event */}
                          <div className="py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="p-1.5 bg-sky-950 text-sky-400 rounded-lg">
                                <Bot className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <p className="font-semibold text-white">Corporate agent configured</p>
                                <p className="text-[10px] text-slate-550 text-slate-500">Trained for {dbState.botConfig.businessName}</p>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">Completed</span>
                          </div>

                          {/* Audits run event */}
                          {dbState.auditReports.slice(0, 2).map((item) => (
                            <div key={item.id} className="py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="p-1.5 bg-emerald-950 text-emerald-450 text-emerald-400 rounded-lg">
                                  <Activity className="w-3.5 h-3.5" />
                                </span>
                                <div>
                                  <p className="font-semibold text-white">Website audit generated</p>
                                  <p className="text-[10px] text-slate-550 text-slate-500 truncate max-w-[150px] sm:max-w-[280px]">URL: {item.url}</p>
                                </div>
                              </div>
                              <span className="text-[10px] text-slate-550 text-slate-500 font-mono">Benchmark logged</span>
                            </div>
                          ))}

                          {/* Leads captured event */}
                          {dbState.capturedLeads.slice(0, 2).map((lead) => (
                            <div key={lead.id} className="py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="p-1.5 bg-sky-950 text-sky-400 rounded-lg">
                                  <Users className="w-3.5 h-3.5" />
                                </span>
                                <div>
                                  <p className="font-semibold text-white">Chat lead captured</p>
                                  <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{lead.name} ({lead.email})</p>
                                </div>
                              </div>
                              <span className="text-[10px] text-sky-400 font-mono">Sync in CRM</span>
                            </div>
                          ))}

                        </div>
                      )}
                    </div>
                  </div>

                </motion.div>
              )}

              {/* SCREEN 2: Chatbot Builder */}
              {activeTab === "chatbot" && (
                <motion.div 
                  key="chatbot"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <BotDashboard 
                    config={dbState.botConfig}
                    onUpdateConfig={handleUpdateBotConfig}
                    refreshDb={fetchDb}
                  />
                </motion.div>
              )}

              {/* SCREEN 3: Website Audit */}
              {activeTab === "audit" && (
                <motion.div 
                  key="audit"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <AuditDashboard 
                    reports={dbState.auditReports}
                    refreshDb={fetchDb}
                    onRequestConsultation={handleRequestConsultation}
                  />
                </motion.div>
              )}

              {/* SCREEN 4: Leads CRM list inbox */}
              {activeTab === "crm" && (
                <motion.div 
                  key="crm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <LeadsDashboard 
                    chatLeads={dbState.capturedLeads}
                    consultationLeads={dbState.consultationLeads}
                    onDeleteLead={handleDeleteLead}
                    refreshDb={fetchDb}
                    botName={dbState.botConfig.businessName}
                  />
                </motion.div>
              )}

            </AnimatePresence>
          ) : (
            <div className="text-center py-16 text-slate-500 text-xs font-semibold">
              Suite is out of sync. Please check container server logs.
            </div>
          )}
        </main>
      </div>

      {/* Footer Branding credits */}
      <footer className="bg-slate-950 border-t border-slate-900 px-6 py-4 mt-auto text-center text-xs text-slate-500" id="suite-footer">
        <p>© 2506 AI Forge Suite Workspace. All privileges reserved securely. Powered by Google Gemini API.</p>
      </footer>

      {/* Modern floating toast notification workspace overlays */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

    </div>
  );
}
