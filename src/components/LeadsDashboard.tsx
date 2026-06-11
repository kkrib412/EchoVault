import { CapturedLead, ConsultationLead } from "../types";
import { 
  Users, 
  MessageSquare, 
  PhoneCall, 
  Trash2, 
  Mail, 
  Link, 
  Clock, 
  CheckCircle, 
  User, 
  Layout, 
  ShieldAlert, 
  RefreshCw,
  TrendingUp,
  Briefcase,
  Download,
  Search,
  Sparkles
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Tooltip from "./Tooltip";

interface LeadsDashboardProps {
  chatLeads: CapturedLead[];
  consultationLeads: ConsultationLead[];
  onDeleteLead: (id: string) => Promise<void>;
  refreshDb: () => void;
  botName: string;
}

export default function LeadsDashboard({ chatLeads, consultationLeads, onDeleteLead, refreshDb, botName }: LeadsDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "chat" | "consult">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // B2B AI Proposal Pitch Engine States
  const [pitchLeadId, setPitchLeadId] = useState<string | null>(null);
  const [pitchText, setPitchText] = useState<string | null>(null);
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [pitchError, setPitchError] = useState<string | null>(null);

  const handleGeneratePitch = async (lead: { id: string; name: string; email: string; detail: string }) => {
    setPitchLeadId(lead.id);
    setPitchText(null);
    setPitchError(null);
    setIsGeneratingPitch(true);
    setShowPitchModal(true);

    try {
      const res = await fetch("/api/leads/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lead.name,
          email: lead.email,
          detail: lead.detail,
          industry: botName || "Technology",
          businessName: "AI Forge Growth Suite"
        })
      });

      if (!res.ok) {
        throw new Error("Outreach API returned an error status.");
      }

      const data = await res.json();
      if (data.success && data.pitch) {
        setPitchText(data.pitch);
      } else {
        throw new Error(data.error || "Failed to generate optimized pitch.");
      }
    } catch (err: any) {
      setPitchError("Could not retrieve B2B Enterprise Pitch. Confirm your Gemini API Key is set and server-side routes are fully active.");
    } finally {
      setIsGeneratingPitch(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeletingId(id);
    await onDeleteLead(id);
    setIsDeletingId(null);
  };

  // Dynamic filter and search logic
  const filteredChatLeads = chatLeads.filter(lead => {
    const term = searchQuery.toLowerCase();
    return lead.name.toLowerCase().includes(term) || 
           lead.email.toLowerCase().includes(term) || 
           (lead.initialMessage && lead.initialMessage.toLowerCase().includes(term));
  });

  const filteredConsultationLeads = consultationLeads.filter(consult => {
    const term = searchQuery.toLowerCase();
    return consult.name.toLowerCase().includes(term) || 
           consult.email.toLowerCase().includes(term) || 
           consult.website.toLowerCase().includes(term) || 
           (consult.notes && consult.notes.toLowerCase().includes(term));
  });

  const totalLeadsCount = chatLeads.length + consultationLeads.length;
  const currentFilteredCount = 
    (activeFilter === "all" || activeFilter === "chat" ? filteredChatLeads.length : 0) +
    (activeFilter === "all" || activeFilter === "consult" ? filteredConsultationLeads.length : 0);

  // Dynamic CSV Export construct
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Type,Name,Email,Source/Website,Message/Notes,Captured At\n";

    if (activeFilter === "all" || activeFilter === "chat") {
      filteredChatLeads.forEach(lead => {
        const row = [
          lead.id,
          "Chatbot Capture",
          `"${lead.name.replace(/"/g, '""')}"`,
          `"${lead.email.replace(/"/g, '""')}"`,
          `"${lead.sourceBot.replace(/"/g, '""')}"`,
          `"${(lead.initialMessage || "").replace(/"/g, '""')}"`,
          lead.capturedAt
        ].join(",");
        csvContent += row + "\n";
      });
    }

    if (activeFilter === "all" || activeFilter === "consult") {
      filteredConsultationLeads.forEach(consult => {
        const row = [
          consult.id,
          "Consultation Request",
          `"${consult.name.replace(/"/g, '""')}"`,
          `"${consult.email.replace(/"/g, '""')}"`,
          `"${consult.website.replace(/"/g, '""')}"`,
          `"${(consult.notes || "").replace(/"/g, '""')}"`,
          consult.requestedAt
        ].join(",");
        csvContent += row + "\n";
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aiforge_crm_leads_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="leads-dashboard-root">
      
      {/* Header and Filter Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-400" />
            Unified Inbox CRM
          </h2>
          <p className="text-sm text-slate-400">
            Monitor real-time buyer intent channels from chatbot conversations and site audit consultations.
          </p>
        </div>

        {/* Lead filters tab switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button 
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeFilter === 'all' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              All ({totalLeadsCount})
            </button>
            <button 
              type="button"
              onClick={() => setActiveFilter("chat")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${activeFilter === 'chat' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Chat ({chatLeads.length})
            </button>
            <button 
              type="button"
              onClick={() => setActiveFilter("consult")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${activeFilter === 'consult' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <PhoneCall className="w-3.5 h-3.5" /> Consults ({consultationLeads.length})
            </button>
          </div>

          <Tooltip content="Download filtered lead records as a standard CSV spreadsheet file" position="bottom">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={currentFilteredCount === 0}
              className="px-3.5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Search and Action subbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input 
            type="text"
            placeholder="Search leads by name, email, query, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>
        
        {searchQuery && (
          <p className="text-xs text-slate-400">
            Found <span className="font-semibold text-sky-400">{currentFilteredCount}</span> matching records
          </p>
        )}
      </div>

      {/* CRM Platform stats scorecard cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total leads card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden flex items-center gap-4">
          <div className="p-3 bg-sky-500/10 border border-sky-500/10 rounded-xl text-sky-400">
            <Users className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Captured Audience</p>
            <p className="text-2xl font-black text-white">{totalLeadsCount}</p>
          </div>
        </div>

        {/* Conversions rating card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/10 rounded-xl text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Estimated Engagement</p>
            <p className="text-2xl font-black text-white">88.4%</p>
          </div>
        </div>

        {/* Active chatbot client name */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 border border-purple-500/10 rounded-xl text-purple-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Custom Agent Identity</p>
            <p className="text-sm font-semibold text-white truncate max-w-[150px]">{botName || "EcoSprout Organics"}</p>
          </div>
        </div>

      </div>

      {/* CRM Inbox Lists */}
      <div className="space-y-4">
        
        {/* Chat Captures list section */}
        {(activeFilter === "all" || activeFilter === "chat") && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 pl-1">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Conversational Chatbot Leads ({filteredChatLeads.length})</h3>
            </div>

            {filteredChatLeads.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-850 p-8 text-center rounded-xl text-slate-500 text-xs">
                No chatbot leads match your filter conditions. Engage in simulation or adjust your search to test!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredChatLeads.map((lead) => (
                    <motion.div 
                      key={lead.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-720 p-5 rounded-xl space-y-4 relative group transition-all"
                    >
                      <div className="absolute top-4 right-4 z-10">
                        <Tooltip content="Permanently delete lead identity record" position="left">
                          <button 
                            type="button"
                            onClick={() => handleDelete(lead.id)}
                            disabled={isDeletingId === lead.id}
                            className="text-slate-550 text-slate-500 hover:text-red-400 p-1.5 hover:bg-slate-850 rounded-lg transition-all cursor-pointer"
                            title="Delete record"
                          >
                            {isDeletingId === lead.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </Tooltip>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-950 border border-sky-900/40 flex items-center justify-center text-sky-400 font-bold text-xs">
                          {lead.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-white">{lead.name}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {lead.email || <span className="text-slate-650 italic">no email provided</span>}
                          </p>
                        </div>
                      </div>

                      {lead.initialMessage && (
                        <div className="bg-[#0a0e1a] border border-slate-850/80 p-3 rounded-lg text-xs italic text-slate-350 leading-relaxed">
                          "{lead.initialMessage}"
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleGeneratePitch({
                            id: lead.id,
                            name: lead.name,
                            email: lead.email || "No email",
                            detail: `Prospect joined our interactive bubble website conversation from source chatbot: ${lead.sourceBot}. Initial engagement message: "${lead.initialMessage || ""}".`
                          })}
                          className="px-3 py-1.5 text-[10px] font-bold text-sky-400 bg-sky-950/40 hover:bg-sky-900 border border-sky-900/30 hover:border-sky-500/40 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                          Personalize AI Pitch
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-850 pt-3">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          Source Bot: {lead.sourceBot}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {new Date(lead.capturedAt).toLocaleDateString()} {new Date(lead.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* Audit consultations block section */}
        {(activeFilter === "all" || activeFilter === "consult") && (
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2 pl-1">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Site Audit Consultations ({filteredConsultationLeads.length})</h3>
            </div>

            {filteredConsultationLeads.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-850 p-8 text-center rounded-xl text-slate-500 text-xs">
                No consultation requests match your filter conditions. Adjust your keywords to search!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredConsultationLeads.map((consult) => (
                    <motion.div 
                      key={consult.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-720 p-5 rounded-xl space-y-4 relative group transition-all"
                    >
                      <div className="absolute top-4 right-4 z-10">
                        <Tooltip content="Permanently delete audit consultation request" position="left">
                          <button 
                            type="button"
                            onClick={() => handleDelete(consult.id)}
                            disabled={isDeletingId === consult.id}
                            className="text-slate-550 text-slate-500 hover:text-red-400 p-1.5 hover:bg-slate-850 rounded-lg transition-all cursor-pointer"
                            title="Delete record"
                          >
                            {isDeletingId === consult.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </Tooltip>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-900/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
                          {consult.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-white">{consult.name}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {consult.email}
                          </p>
                        </div>
                      </div>

                      <div className="bg-[#0a0e1a] border border-slate-850/80 p-3 rounded-lg space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Link className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span className="truncate text-teal-400 leading-none">{consult.website}</span>
                        </div>
                        {consult.notes && (
                          <p className="text-slate-350 italic border-l-2 border-slate-850 pl-2 leading-relaxed">
                            "{consult.notes}"
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleGeneratePitch({
                            id: consult.id,
                            name: consult.name,
                            email: consult.email,
                            detail: `Prospect requested an organic website audit and consultative optimization proposal on domain: ${consult.website}. Additional special instructions given by user: "${consult.notes || "None specified"}"`
                          })}
                          className="px-3 py-1.5 text-[10px] font-bold text-sky-400 bg-sky-950/40 hover:bg-sky-900 border border-sky-900/30 hover:border-sky-500/40 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                          Personalize AI Pitch
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-850 pt-3">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          Lead status: <span className="font-semibold text-emerald-400 uppercase tracking-wider bg-emerald-950/55 px-1.5 py-0.5 rounded border border-emerald-900/40">New Prospect</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {new Date(consult.requestedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modern B2B AI Proposal Pitch Dialog Layer Modal */}
      <AnimatePresence>
        {showPitchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-555"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b101c] border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl relative flex flex-col"
            >
              
              {/* Modal Core Headers */}
              <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-sky-500/10 border border-sky-500/10 rounded-lg text-sky-400">
                    <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">AI B2B Personalized Outreach Proposal</h3>
                    <p className="text-[10px] text-slate-400">Gemini-optimized B2B trigger pitch crafted specifically for high conversion prospect follow-ups.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowPitchModal(false);
                    setPitchText(null);
                    setPitchError(null);
                  }}
                  className="px-2.5 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* Dynamic Scroll Content Box */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {isGeneratingPitch ? (
                  <div className="py-16 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
                    <p className="text-xs text-slate-400">Consulting Gemini models to synthesize company benchmarks and compose consultative pitch...</p>
                  </div>
                ) : pitchError ? (
                  <div className="p-4 bg-red-955 border border-red-900 rounded-xl text-xs text-red-400 text-center font-medium">
                    {pitchError}
                  </div>
                ) : pitchText ? (
                  <div className="space-y-4">
                    <div className="bg-[#070b12] border border-slate-850 p-5 rounded-xl font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-all">
                      {pitchText}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(pitchText);
                          setCopiedPitch(true);
                          setTimeout(() => setCopiedPitch(false), 2000);
                        }}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 border border-sky-500/20 text-white font-semibold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedPitch ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            Copied Outreach!
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            Copy Draft Pitch
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-xs text-slate-500 py-10">Waiting for trigger context...</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
