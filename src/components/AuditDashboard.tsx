import React, { useState, useEffect } from "react";
import { AuditReport, ConsultationLead } from "../types";
import { 
  Search, 
  Activity, 
  FileText, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Globe, 
  User, 
  Mail, 
  Link, 
  PhoneCall, 
  ChevronRight,
  Download,
  ExternalLink,
  RefreshCw,
  Zap,
  Smartphone,
  ShieldAlert,
  MapPin,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AuditDashboardProps {
  reports: AuditReport[];
  refreshDb: () => void;
  onRequestConsultation: (lead: Omit<ConsultationLead, "id" | "requestedAt" | "status">) => Promise<boolean>;
}

export default function AuditDashboard({ reports, refreshDb, onRequestConsultation }: AuditDashboardProps) {
  const [urlInput, setUrlInput] = useState("");
  const [isAuditing, setIsAuditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [activeBenchmark, setActiveBenchmark] = useState<"speed" | "mobile" | "seo" | "compliance">("speed");
  const [pdfTheme, setPdfTheme] = useState<"minimalist" | "midnight" | "royal">("minimalist");
  
  // Consultation request state
  const [consultName, setConsultName] = useState("");
  const [consultEmail, setConsultEmail] = useState("");
  const [consultWebsite, setConsultWebsite] = useState("");
  const [consultNotes, setConsultNotes] = useState("");
  const [isSubmittingConsult, setIsSubmittingConsult] = useState(false);
  const [consultSuccess, setConsultSuccess] = useState(false);

  // PDF report view modal
  const [showPdfModal, setShowPdfModal] = useState(false);

  const activeReport = reports.find(r => r.id === selectedReportId) || reports[0];

  useEffect(() => {
    if (reports.length > 0 && !selectedReportId) {
      setSelectedReportId(reports[0].id);
    }
  }, [reports, selectedReportId]);

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    let formattedUrl = urlInput.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = "https://" + formattedUrl;
    }

    setIsAuditing(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: formattedUrl })
      });

      if (!res.ok) {
        throw new Error("Audit endpoint returned an error status.");
      }

      const data: AuditReport = await res.json();
      refreshDb();
      setSelectedReportId(data.id);
      setUrlInput("");
    } catch (err) {
      setErrorMsg("Failed to complete website audit. Please verify your internet connection and make sure your Gemini API Key is set.");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleConsultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultName.trim() || !consultEmail.trim()) return;

    setIsSubmittingConsult(true);
    const success = await onRequestConsultation({
      name: consultName.trim(),
      email: consultEmail.trim(),
      website: consultWebsite.trim() || (activeReport ? activeReport.url : ""),
      notes: consultNotes.trim()
    });

    setIsSubmittingConsult(false);
    if (success) {
      setConsultSuccess(true);
      setConsultName("");
      setConsultEmail("");
      setConsultWebsite("");
      setConsultNotes("");
      setTimeout(() => setConsultSuccess(false), 5000);
    }
  };

  const triggerPrintPdf = () => {
    window.print();
  };

  // Score Badge helpers
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
    if (score >= 70) return "text-yellow-400 border-yellow-500/20 bg-yellow-500/10";
    return "text-red-400 border-red-500/20 bg-red-500/10";
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-emerald-500";
    if (score >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6" id="audit-dashboard-root">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            AI Website Auditor
          </h2>
          <p className="text-sm text-slate-400">
            Instantly benchmark metrics and receive Gemini-powered optimization guides.
          </p>
        </div>

        {/* Audit Search Bar */}
        <form onSubmit={handleRunAudit} className="w-full md:w-auto flex gap-2">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              required
              placeholder="Enter URL (e.g. stripe.com)..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button 
            type="submit"
            disabled={isAuditing}
            className="px-4 py-2.5 bg-emerald-650 hover:bg-emerald-600 bg-emerald-600 border border-emerald-500/20 hover:border-emerald-500/40 text-white font-semibold text-xs rounded-xl transition-all shadow-lg flex items-center gap-1.5"
          >
            {isAuditing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            {isAuditing ? "Scanning..." : "Audit Site"}
          </button>
        </form>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-950/40 border border-red-900/40 rounded-xl text-xs text-red-400 flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Main Audit Grid */}
      {reports.length === 0 ? (
        <div className="bg-slate-900 border border-dashed border-slate-850 p-16 text-center rounded-2xl max-w-2xl mx-auto space-y-4">
          <Globe className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-semibold text-white text-base">Begin Your First Digital Audit</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Enter a domain above. Our automated platform scans page loading indexes, checks schema configurations, tags mobile elements, and drafts custom recommended steps with Gemini insights.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Reports List & Selector */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">Prior Scan Reports</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {reports.map((report) => {
                const isSelected = report.id === selectedReportId;
                const domainStr = report.url.replace(/^(https?:\/\/)?(www\.)?/, "");
                const avgScore = Math.round((report.scores.pageSpeed + report.scores.mobileResponsiveness + report.scores.seoRank + report.scores.complianceScore) / 4);

                return (
                  <button 
                    key={report.id}
                    onClick={() => setSelectedReportId(report.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${isSelected ? 'bg-emerald-500/10 border-emerald-550/30 text-white shadow-md' : 'bg-slate-900 border-slate-850 hover:bg-slate-850 text-slate-400 hover:text-white'}`}
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-white truncate max-w-[180px]">{domainStr}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(report.scannedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className={`p-1 px-2 rounded-lg font-bold border text-xs capitalize ${getScoreColor(avgScore)}`}>
                      {avgScore}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Report Analytics */}
          <div className="lg:col-span-8 space-y-6">
            {activeReport && (
              <div className="space-y-6">
                
                {/* Score Indicators Cards */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                  
                  {/* Title Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-5">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-900/40 rounded px-2.5 py-1 uppercase tracking-widest">
                        Core Vital Scorecard
                      </span>
                      <h3 className="text-base font-semibold text-white mt-2 flex items-center gap-1.5 min-w-0">
                        <Globe className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className="truncate">{activeReport.url}</span>
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button 
                        onClick={() => setShowPdfModal(true)}
                        className="px-3.5 py-2 hover:bg-slate-800 hover:text-white text-slate-350 border border-slate-800 hover:border-slate-700 bg-slate-950 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-orange-400" />
                        Branded Report PDF
                      </button>
                    </div>
                  </div>

                  {/* Core Scores Display Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    {/* Core 1 Speed */}
                    <button
                      type="button"
                      onClick={() => setActiveBenchmark("speed")}
                      className={`w-full bg-slate-950 p-4 rounded-xl text-center space-y-2 cursor-pointer transition-all border ${
                        activeBenchmark === "speed" ? "border-emerald-500/80 ring-1 ring-emerald-550/20 bg-emerald-950/5" : "border-slate-850 hover:border-slate-720"
                      }`}
                    >
                      <Zap className="w-5 h-5 mx-auto text-yellow-400 animate-pulse" />
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Page Speed</p>
                        <p className="text-2xl font-bold text-white">{activeReport.scores.pageSpeed}%</p>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1">
                        <div className={`h-1 rounded-full ${getScoreBg(activeReport.scores.pageSpeed)}`} style={{ width: `${activeReport.scores.pageSpeed}%` }}></div>
                      </div>
                    </button>

                    {/* Core 2 Mobile Response */}
                    <button
                      type="button"
                      onClick={() => setActiveBenchmark("mobile")}
                      className={`w-full bg-slate-950 p-4 rounded-xl text-center space-y-2 cursor-pointer transition-all border ${
                        activeBenchmark === "mobile" ? "border-emerald-500/80 ring-1 ring-emerald-550/20 bg-emerald-950/5" : "border-slate-850 hover:border-slate-720"
                      }`}
                    >
                      <Smartphone className="w-5 h-5 mx-auto text-sky-400" />
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Mobile UX</p>
                        <p className="text-2xl font-bold text-white">{activeReport.scores.mobileResponsiveness}%</p>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1">
                        <div className={`h-1 rounded-full ${getScoreBg(activeReport.scores.mobileResponsiveness)}`} style={{ width: `${activeReport.scores.mobileResponsiveness}%` }}></div>
                      </div>
                    </button>

                    {/* Core 3 SEO */}
                    <button
                      type="button"
                      onClick={() => setActiveBenchmark("seo")}
                      className={`w-full bg-slate-950 p-4 rounded-xl text-center space-y-2 cursor-pointer transition-all border ${
                        activeBenchmark === "seo" ? "border-emerald-500/80 ring-1 ring-emerald-550/20 bg-emerald-950/5" : "border-slate-850 hover:border-slate-720"
                      }`}
                    >
                      <TrendingUp className="w-5 h-5 mx-auto text-emerald-400" />
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">SEO Rank</p>
                        <p className="text-2xl font-bold text-white">{activeReport.scores.seoRank}%</p>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1">
                        <div className={`h-1 rounded-full ${getScoreBg(activeReport.scores.seoRank)}`} style={{ width: `${activeReport.scores.seoRank}%` }}></div>
                      </div>
                    </button>

                    {/* Core 4 Security compliance */}
                    <button
                      type="button"
                      onClick={() => setActiveBenchmark("compliance")}
                      className={`w-full bg-slate-950 p-4 rounded-xl text-center space-y-2 cursor-pointer transition-all border ${
                        activeBenchmark === "compliance" ? "border-emerald-500/80 ring-1 ring-emerald-550/20 bg-emerald-950/5" : "border-slate-850 hover:border-slate-720"
                      }`}
                    >
                      <ShieldAlert className="w-5 h-5 mx-auto text-purple-400" />
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Compliance</p>
                        <p className="text-2xl font-bold text-white">{activeReport.scores.complianceScore}%</p>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1">
                        <div className={`h-1 rounded-full ${getScoreBg(activeReport.scores.complianceScore)}`} style={{ width: `${activeReport.scores.complianceScore}%` }}></div>
                      </div>
                    </button>

                  </div>

                  {/* Dynamic Category Benchmark Deep-Dive Instruction panel */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850/80 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                      <span className="text-[11px] font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                        {activeBenchmark === "speed" && <><Zap className="w-3.5 h-3.5 text-yellow-500" /> Page Speed Deep Dive Guidance</>}
                        {activeBenchmark === "mobile" && <><Smartphone className="w-3.5 h-3.5 text-sky-400" /> Mobile Layout Custom Audit</>}
                        {activeBenchmark === "seo" && <><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Advanced Google SEO Checklist</>}
                        {activeBenchmark === "compliance" && <><ShieldAlert className="w-3.5 h-3.5 text-purple-400" /> Privacy & Security Compliance</>}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Active Recommendation Filter</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
                      
                      <div className="md:col-span-4 space-y-1 bg-slate-900/40 p-3 rounded-lg border border-slate-850">
                        <p className="text-[10px] uppercase font-bold text-slate-550 text-slate-400">Current Status</p>
                        <p className="text-sm font-semibold text-white">
                          {activeBenchmark === "speed" && <span className="text-yellow-400">Needs Optimizations ({activeReport.checks.pageSpeedSeconds}s load)</span>}
                          {activeBenchmark === "mobile" && <span className="text-sky-400">Adaptive Web layout</span>}
                          {activeBenchmark === "seo" && <span className={`${activeReport.checks.metaTagsPresent ? "text-emerald-400" : "text-yellow-400"}`}>{activeReport.checks.metaTagsPresent ? "Metadata Compliant" : "Missing meta descriptions"}</span>}
                          {activeBenchmark === "compliance" && <span className="text-purple-400">HTTPS Valid Secure Session</span>}
                        </p>
                        <p className="text-[10px] text-slate-500 leading-normal pt-1">Checked on automated scan channels.</p>
                      </div>

                      <div className="md:col-span-8 space-y-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400">AI-Prescribed Corrective Guidelines</p>
                        <ul className="space-y-1.5 text-[11px] text-slate-300 leading-relaxed list-disc list-inside">
                          {activeBenchmark === "speed" && (
                            <>
                              <li>Configure Next-Gen web compression headers (Brotli/Gzip) on the origin proxy context server.</li>
                              <li>Compress images and serve in next-gen formats (.webp files, avif index).</li>
                              <li>Implement lazy-loading scripts on secondary fold dynamic assets.</li>
                            </>
                          )}
                          {activeBenchmark === "mobile" && (
                            <>
                              <li>Ensure responsive viewport tag is correctly declared in document HTML header.</li>
                              <li>Ensure tap/touch selector element bounds cover the standard min-44px threshold.</li>
                              <li>Remove static pixel bounds (`width: 1200px`) and scale to percentage flex layouts.</li>
                            </>
                          )}
                          {activeBenchmark === "seo" && (
                            <>
                              <li>Confirm sitemap.xml exists and is indexed inside the Google Search Console suite.</li>
                              <li>Enforce standardized headings tag rules (exactly one hierarchy H1 element per landing target).</li>
                              <li>Add descriptive alternative attributes (`alt`) to image elements.</li>
                            </>
                          )}
                          {activeBenchmark === "compliance" && (
                            <>
                              <li>Ensure strict HTTP redirection headers to map all incoming routes to SSL HTTPS.</li>
                              <li>Generate custom fallback GDPR cookie banners to allow consent storage configuration.</li>
                              <li>Enable proper Cross-Origin Resource Sharing security headers.</li>
                            </>
                          )}
                        </ul>
                      </div>

                    </div>
                  </div>

                </div>

                {/* Checklist parameters */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Technical Diagnostics Check</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                    
                    <div className="flex items-center justify-between border-b border-slate-850 py-2.5">
                      <span className="text-slate-400">Server Index Interactive Speed</span>
                      <span className="font-semibold text-white font-mono">{activeReport.checks.pageSpeedSeconds}s</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-850 py-2.5">
                      <span className="text-slate-400">Broken Outbound Navigation anchors</span>
                      <span className={`font-semibold font-mono ${activeReport.checks.brokenLinksCount > 0 ? "text-yellow-400" : "text-emerald-400"}`}>
                        {activeReport.checks.brokenLinksCount} found
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-850 py-2.5">
                      <span className="text-slate-400">Meta Title / Description Tags</span>
                      {activeReport.checks.metaTagsPresent ? (
                        <span className="text-emerald-450 font-semibold text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Present</span>
                      ) : (
                        <span className="text-red-450 font-semibold text-red-500 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Missing</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-850 py-2.5">
                      <span className="text-slate-400">Google Business Local Schema JSON</span>
                      {activeReport.checks.googleBusinessSchema ? (
                        <span className="text-emerald-450 font-semibold text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Present</span>
                      ) : (
                        <span className="text-yellow-450 font-semibold text-yellow-500 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Omitted</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-850 py-2.5 md:border-none">
                      <span className="text-slate-400">Integrated Inquiry / Contact form</span>
                      {activeReport.checks.contactFormPresent ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Detected</span>
                      ) : (
                        <span className="text-red-400 font-semibold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Missing</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-slate-400">XML Search Engine Sitemap index</span>
                      {activeReport.checks.hasProperSitemap ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Standard-valid</span>
                      ) : (
                        <span className="text-yellow-400 font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Missing XML</span>
                      )}
                    </div>

                  </div>
                </div>

                {/* Gemini advice narrative box */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-slate-950 border-b border-slate-850 p-5">
                    <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Gemini Intelligent Growth Insights
                    </h4>
                    <p className="text-xs text-slate-350 italic mt-2 leading-relaxed">
                      "{activeReport.aiRecommendation}"
                    </p>
                  </div>
                  
                  <div className="p-6 prose prose-invert max-w-none text-slate-300 text-xs leading-relaxed space-y-4">
                    {activeReport.aiDetailedAdvice ? (
                      <div className="whitespace-pre-wrap font-sans space-y-4">
                        {/* Render simple markdown conversion manually for clean styling */}
                        {activeReport.aiDetailedAdvice.split(/\n(?=### |[0-9]+\. )/).map((block, idx) => {
                          if (block.startsWith("### ")) {
                            return (
                              <h5 key={idx} className="text-white font-semibold text-sm mt-4 border-b border-slate-800 pb-2">
                                {block.replace("### ", "")}
                              </h5>
                            );
                          }
                          return (
                            <p key={idx} className="text-slate-350 leading-relaxed pl-1">
                              {block}
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-6">Advice logs empty.</p>
                    )}
                  </div>
                </div>

                {/* Consultation Form Lead Capture */}
                <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="max-w-xl">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                      Conversion Boost CTA (AI Forge Funnel)
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">Want to skyrocket this score to 100%?</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-2">
                      Our elite development team will construct custom page compression headers, establish correct JSON schema structures, and repair your outbound link index. Schedule a discovery consultation instantly below.
                    </p>
                  </div>

                  <form onSubmit={handleConsultSubmit} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-400 uppercase">Your Professional Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Marc Sterling"
                          value={consultName}
                          onChange={(e) => setConsultName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800/80 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-400 uppercase">Contact Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                        <input 
                          type="email" 
                          required
                          placeholder="e.g. marc@sterlingdesigns.co"
                          value={consultEmail}
                          onChange={(e) => setConsultEmail(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800/80 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-medium text-slate-400 uppercase">Brief Optimization Goals / Special Notes (Optional)</label>
                      <textarea 
                        rows={2}
                        placeholder="e.g. Please audit our checkout checkout speed funnel as well."
                        value={consultNotes}
                        onChange={(e) => setConsultNotes(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800/80 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                      />
                    </div>

                    <div className="md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4 pt-3">
                      {consultSuccess ? (
                        <p className="text-emerald-400 font-semibold text-xs flex items-center gap-1.5 animate-pulse">
                          <CheckCircle className="w-4 h-4" /> Thank you! Discovery lead captured in AI Forge Workspace.
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-500 leading-relaxed max-w-sm">
                          Submitting this request adds a client profile to the CRM lead pipeline for automated conversion management.
                        </p>
                      )}

                      <button 
                        type="submit"
                        disabled={isSubmittingConsult}
                        className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-550 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                      >
                        {isSubmittingConsult ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PhoneCall className="w-3.5 h-3.5" />}
                        Submit Lead Proposal
                      </button>
                    </div>
                  </form>
                </div>

              </div>
            )}
          </div>

        </div>
      )}

      {/* PDF branded print modal block mockup overlay */}
      <AnimatePresence>
        {showPdfModal && activeReport && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-555"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-[#0b0f19] border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative flex flex-col"
            >
              
              {/* Modal Top Control Bar */}
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-semibold text-white">Dynamic PDF Report Generator</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={triggerPrintPdf}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-[11px] font-semibold text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download / Print PDF
                  </button>
                  <button 
                    onClick={() => setShowPdfModal(false)}
                    className="px-2.5 py-1.5 text-slate-450 text-slate-400 hover:text-white hover:bg-slate-800 rounded text-xs transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* PDF Custom Branded Theme control toolbar */}
              <div className="p-3 bg-slate-950 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 px-6">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-spin" /> Choose Branded Theme Preset:
                </span>
                <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs">
                  <button 
                    type="button"
                    onClick={() => setPdfTheme("minimalist")}
                    className={`px-3 py-1 font-semibold rounded-md transition-all ${pdfTheme === 'minimalist' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Minimalist Light
                  </button>
                  <button 
                    type="button"
                    onClick={() => setPdfTheme("midnight")}
                    className={`px-3 py-1 font-semibold rounded-md transition-all ${pdfTheme === 'midnight' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Midnight Cosmic
                  </button>
                  <button 
                    type="button"
                    onClick={() => setPdfTheme("royal")}
                    className={`px-3 py-1 font-semibold rounded-md transition-all ${pdfTheme === 'royal' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Classic Royal
                  </button>
                </div>
              </div>

              {/* Printable Branded Document Content */}
              <div className={`p-8 sm:p-12 space-y-8 print:p-0 print:m-0 transition-colors ${
                pdfTheme === "minimalist" ? "bg-white text-slate-900" :
                pdfTheme === "midnight" ? "bg-[#090b11] text-slate-200 border-slate-800" :
                "bg-[#faf6eb] text-slate-950 border-[#dfd6bc] font-serif"
              }`} id="printable-pdf-document">
                
                {/* PDF Header Block */}
                <div className={`flex flex-col sm:flex-row justify-between items-start gap-4 border-b pb-6 ${
                  pdfTheme === "minimalist" ? "border-slate-200" :
                  pdfTheme === "midnight" ? "border-slate-800" :
                  "border-[#d9c491]"
                }`}>
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[#10b981] font-bold">Generated by AI Forge</span>
                    <h1 className={`text-2xl font-black tracking-tight ${
                      pdfTheme === "minimalist" ? "text-slate-950" :
                      pdfTheme === "midnight" ? "text-white" :
                      "text-[#1e3a8a] font-serif"
                    }`}>OPTIMIZATION AUDIT & SEO ANALYSIS</h1>
                    <p className={`text-xs font-mono flex items-center gap-1 border p-1 rounded max-w-max ${
                      pdfTheme === "minimalist" ? "text-slate-500 border-slate-100 bg-slate-50" :
                      pdfTheme === "midnight" ? "text-slate-400 border-slate-805 bg-slate-900" :
                      "text-[#5c5443] border-[#e5d6ad] bg-[#f3edd9]"
                    }`}>
                      <Link className="w-3.5 h-3.5 text-slate-400" /> {activeReport.url}
                    </p>
                  </div>
                  
                  <div className="text-right sm:text-right space-y-1 self-stretch flex flex-col justify-between items-end">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${
                      pdfTheme === "minimalist" ? "text-slate-500" :
                      pdfTheme === "midnight" ? "text-slate-400" :
                      "text-[#5c5443]"
                    }`}>Report ID: {activeReport.id.toUpperCase()}</p>
                    <p className="text-xs font-mono">Date: {new Date(activeReport.scannedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Score indicators */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Page Speed Index", value: activeReport.scores.pageSpeed },
                    { label: "Mobile Layout Score", value: activeReport.scores.mobileResponsiveness },
                    { label: "SEO Standard Rank", value: activeReport.scores.seoRank },
                    { label: "Sec. Compliance", value: activeReport.scores.complianceScore }
                  ].map((item, idx) => (
                    <div key={idx} className={`p-4 rounded-xl text-center space-y-1 border ${
                      pdfTheme === "minimalist" ? "bg-slate-50 border-slate-100 text-slate-950" :
                      pdfTheme === "midnight" ? "bg-slate-900/60 border-slate-800/80 text-white" :
                      "bg-[#f3edd9] border-[#e5d6ad] text-[#1e3a8a]"
                    }`}>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${
                        pdfTheme === "minimalist" ? "text-slate-500" :
                        pdfTheme === "midnight" ? "text-slate-400" :
                        "text-[#5c5443]"
                      }`}>{item.label}</p>
                      <p className="text-2xl font-black">{item.value}%</p>
                    </div>
                  ))}
                </div>

                {/* Diagnostics table list */}
                <div className="space-y-4">
                  <h3 className={`text-xs font-bold uppercase tracking-wider border-b pb-2 ${
                    pdfTheme === "minimalist" ? "text-slate-900 border-slate-200" :
                    pdfTheme === "midnight" ? "text-[#10b981] border-slate-800" :
                    "text-[#1e3a8a] border-[#d9c491]"
                  }`}>TECHNICAL DIAGNOSTICS LOG</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs">
                    <div className={`flex justify-between border-b py-2 text-slate-755 ${
                      pdfTheme === "minimalist" ? "border-slate-100" :
                      pdfTheme === "midnight" ? "border-slate-800/60" : "border-[#e5d6ad]"
                    }`}>
                      <span>Interactive page load latency:</span>
                      <span className="font-mono font-bold text-slate-900">{activeReport.checks.pageSpeedSeconds}s</span>
                    </div>
                    <div className={`flex justify-between border-b py-2 text-slate-755 ${
                      pdfTheme === "minimalist" ? "border-slate-100" :
                      pdfTheme === "midnight" ? "border-slate-800/60" : "border-[#e5d6ad]"
                    }`}>
                      <span>Broken index elements:</span>
                      <span className="font-mono font-bold text-slate-900">{activeReport.checks.brokenLinksCount} found</span>
                    </div>
                    <div className={`flex justify-between border-b py-2 text-slate-755 ${
                      pdfTheme === "minimalist" ? "border-slate-100" :
                      pdfTheme === "midnight" ? "border-slate-800/60" : "border-[#e5d6ad]"
                    }`}>
                      <span>Meta Description compliance is standard:</span>
                      <span className="font-bold text-slate-900">{activeReport.checks.metaTagsPresent ? "DETECTED" : "MISSING"}</span>
                    </div>
                    <div className={`flex justify-between border-b py-2 text-slate-755 ${
                      pdfTheme === "minimalist" ? "border-slate-100" :
                      pdfTheme === "midnight" ? "border-slate-800/60" : "border-[#e5d6ad]"
                    }`}>
                      <span>JSON structured local business tags is valid:</span>
                      <span className="font-bold text-slate-900">{activeReport.checks.googleBusinessSchema ? "DETECTED" : "OMITTED"}</span>
                    </div>
                    <div className={`flex justify-between border-b py-2 text-slate-755 ${
                      pdfTheme === "minimalist" ? "border-slate-100" :
                      pdfTheme === "midnight" ? "border-slate-800/60" : "border-[#e5d6ad]"
                    }`}>
                      <span>Dynamic Lead Form checkout container:</span>
                      <span className="font-bold text-slate-900">{activeReport.checks.contactFormPresent ? "ACTIVE" : "MISSING"}</span>
                    </div>
                    <div className={`flex justify-between border-b py-2 text-slate-755 ${
                      pdfTheme === "minimalist" ? "border-slate-100" :
                      pdfTheme === "midnight" ? "border-slate-800/60" : "border-[#e5d6ad]"
                    }`}>
                      <span>XML Search sitemap directory configuration:</span>
                      <span className="font-bold text-slate-900">{activeReport.checks.hasProperSitemap ? "STANDARD-VALID" : "NOT FOUND"}</span>
                    </div>
                  </div>
                </div>

                {/* Executive summary details markdown */}
                <div className={`space-y-4 pt-4 border-t ${
                  pdfTheme === "minimalist" ? "border-slate-105" :
                  pdfTheme === "midnight" ? "border-slate-800" :
                  "border-[#e5d6ad]"
                }`}>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${
                    pdfTheme === "minimalist" ? "text-[#10b981]" :
                    pdfTheme === "midnight" ? "text-[#10b981]" :
                    "text-[#a21caf] font-serif"
                  }`}>AI RECOMMENDATIONS Summary</h3>
                  <p className={`text-xs italic border-l-4 pl-4 py-1 leading-relaxed ${
                    pdfTheme === "minimalist" ? "text-slate-700 border-slate-300" :
                    pdfTheme === "midnight" ? "text-slate-300 border-emerald-500/40" :
                    "text-[#473f32] border-[#dfd6bc] font-serif"
                  }`}>
                    "{activeReport.aiRecommendation}"
                  </p>
                  
                  <div className="text-xs leading-relaxed whitespace-pre-wrap space-y-4">
                    {activeReport.aiDetailedAdvice}
                  </div>
                </div>

                {/* Bottom Signature Section */}
                <div className={`text-center pt-10 border-t space-y-3 font-sans ${
                  pdfTheme === "minimalist" ? "border-slate-100" :
                  pdfTheme === "midnight" ? "border-slate-900" :
                  "border-[#e5d6ad]"
                }`}>
                  <p className="text-xs font-bold uppercase tracking-widest">PLATFORM AUDIT SPONSORED BY AI FORGE</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed max-w-md mx-auto">
                    To automate metadata repairs, configure Cloud Core caching headers, or deploy responsive chatbots, register as a discoverable client lead today. Core models provided securely by Google Gemini API.
                  </p>
                </div>

              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
