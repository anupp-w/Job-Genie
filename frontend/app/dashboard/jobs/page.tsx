"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Target, Sparkles, Loader2, ArrowRight, TrendingUp, Save, Search, RotateCcw,
  CheckCircle2, AlertCircle, BarChart3, Info
} from "lucide-react";
import api from "@/services/api";
import ResumePreview, { ResumeData } from "@/components/ResumePreview";
import { useToast } from "@/components/ui/toast-provider";
import { getApiErrorMessage } from "@/lib/api-error";

type ResumeResponse = {
  id: number;
  title: string;
  ats_score: number;
  parsed_content?: string | null;
  sections: any[];
  updated?: string;
};

interface SectionScores {
  skills: number;
  experience: number;
  summary: number;
  education: number;
}

interface ComparisonResult {
  score_improvement: number;
  section_improvements: Record<string, number>;
  added_keywords: string[];
  still_missing_keywords: string[];
  section_diffs: Record<string, string[]>;
}

interface TailorResponse {
  tailored_data: ResumeData;
  match_score: number;
  original_match_score: number;
  explanation: string;
  changes: string[];
  missing_skills: string[];
  matched_skills: string[];
  iterations_run: number;
  stop_reason: string;
  comparison: ComparisonResult;
  section_scores: SectionScores;
}

export default function TailorPage() {
  const router = useRouter();
  const toast = useToast();

  // Data state
  const [resumes, setResumes] = useState<ResumeResponse[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [jobDescription, setJobDescription] = useState("");
  
  // UI state
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorProgress, setTailorProgress] = useState("");
  const [result, setResult] = useState<TailorResponse | null>(null);
  const [originalResumeData, setOriginalResumeData] = useState<ResumeData | null>(null);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");

  useEffect(() => {
    fetchResumes();
  }, []);

  useEffect(() => {
    if (selectedResumeId) {
      setOriginalResumeData(getSelectedResumeData());
    }
  }, [selectedResumeId, resumes]);

  const fetchResumes = async () => {
    setIsLoadingResumes(true);
    try {
      const res = await api.get<ResumeResponse[]>("/resumes");
      const filtered = res.data
        .filter((r) => !r.title?.startsWith("Analysis -"))
        .sort((a, b) => {
          const da = a.updated ? new Date(a.updated).getTime() : 0;
          const db = b.updated ? new Date(b.updated).getTime() : 0;
          return db - da;
        });
      setResumes(filtered);
      if (filtered.length > 0) {
        setSelectedResumeId(filtered[0].id.toString());
      }
    } catch (err) {
      console.error("Failed to fetch resumes", err);
      toast.error("Could not load resumes", getApiErrorMessage(err, "Please refresh and try again."));
    } finally {
      setIsLoadingResumes(false);
    }
  };

  const getSelectedResumeData = (): ResumeData | null => {
    if (!selectedResumeId) return null;
    const res = resumes.find(r => r.id.toString() === selectedResumeId);
    if (!res) return null;
    
    const structSection = res.sections?.find((s: any) => s.section_type === "structured_data");
    try {
      if (structSection && structSection.content) {
        return JSON.parse(structSection.content);
      } else if (res.parsed_content) {
        return JSON.parse(res.parsed_content);
      }
    } catch (e) {
      console.error("Failed to parse resume JSON data.");
    }
    return null;
  };

  const handleTailor = async () => {
    if (!selectedResumeId) {
      toast.warning("Select a resume", "Choose a source resume before tailoring.");
      return;
    }

    if (!jobDescription.trim()) {
      toast.warning("Job description required", "Paste the target job description to continue.");
      return;
    }

    const resumeData = getSelectedResumeData();
    if (!resumeData) {
      toast.error("Resume data unavailable", "This resume has no valid structured data.");
      return;
    }

    setIsTailoring(true);
    setResult(null);
    setTailorProgress("JD Analysis...");

    const progressInterval = setInterval(() => {
      setTailorProgress(prev => {
        if (prev.includes("JD Analysis")) return "Rewriting Resume...";
        if (prev.includes("Rewriting")) return "Scoring & Optimizing...";
        if (prev.includes("Scoring")) return "Validating Skills...";
        if (prev.includes("Validating")) return "Finalizing Results...";
        return prev;
      });
    }, 4000);

    try {
      const res = await api.post("/tailor", {
        resume_data: resumeData,
        job_description: jobDescription
      });

      clearInterval(progressInterval);
      setResult(res.data);
    } catch (err: any) {
      clearInterval(progressInterval);
      toast.error("Tailoring failed", getApiErrorMessage(err, "Please try again in a moment."));
    } finally {
      setIsTailoring(false);
      setTailorProgress("");
    }
  };

  const handleOpenSaveModal = () => {
    const originalTitle = resumes.find(r => r.id.toString() === selectedResumeId)?.title || "Resume";
    setSaveTitle(`${originalTitle} - Tailored`);
    setIsSaveModalOpen(true);
  };

  const executeSave = async () => {
    if (!result) return;
    if (!saveTitle.trim()) {
      toast.warning("Title required", "Give your tailored resume a title before saving.");
      return;
    }

    try {
      const payload = {
        title: saveTitle,
        sections: [
          { section_type: "structured_data", content: JSON.stringify(result.tailored_data), order: 0 }
        ]
      };
      await api.post("/resumes", payload);
      setIsSaveModalOpen(false);
      toast.success("Resume saved", "Your tailored resume was saved successfully.");
      router.push(`/dashboard/resumes`);
    } catch (err: any) {
      toast.error("Save failed", getApiErrorMessage(err, "Failed to save tailored resume."));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12 max-w-[1700px] mx-auto px-6">
      {/* Header - Compact */}
      <div className="flex items-center justify-between gap-6 border-b border-slate-100 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
              Tailor Resume to JD
            </h1>
            <p className="text-slate-400 text-xs mt-1.5 font-medium">
              Multi-agent LangGraph orchestration with ML semantic scoring.
            </p>
          </div>
        </div>
        {result && (
          <div className="flex gap-2">
             <button 
                onClick={() => { setResult(null); setJobDescription(""); }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-red-500 rounded-lg transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-3 h-3" /> Start Over
            </button>
            <button 
              onClick={handleOpenSaveModal}
              className="px-5 py-2 bg-indigo-600 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-2 transition-all"
            >
              <Save className="w-3 h-3" /> Save Tailored Resume
            </button>
          </div>
        )}
      </div>

      {/* Save Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
              <div className="space-y-2 text-center">
                 <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Save className="w-8 h-8" />
                 </div>
                 <h2 className="text-2xl font-black text-slate-900">Name Your Masterpiece</h2>
                 <p className="text-slate-500 text-sm font-medium">Give your tailored resume a title for your collection.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Resume Title</label>
                <input 
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  className="w-full h-14 rounded-2xl border border-slate-100 bg-slate-50/50 px-6 font-bold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
                  placeholder="e.g. Senior Dev - Google Tailored"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                 <button 
                   onClick={() => setIsSaveModalOpen(false)}
                   className="flex-1 h-14 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={executeSave}
                   className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-100 transition-all"
                 >
                   Save Resume
                 </button>
              </div>
           </div>
        </div>
      )}

      {!result ? (
        /* Setup View - Compact & Focused */
        <div className="max-w-2xl mx-auto py-8">
           <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-50 space-y-6">
              <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                    <FileText className="w-3 h-3" /> Source Resume
                  </label>
                  <select 
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    disabled={isLoadingResumes || isTailoring}
                    className="w-full h-12 rounded-xl border border-slate-100 bg-slate-50/50 px-4 font-bold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none transition-all appearance-none text-sm"
                  >
                    {isLoadingResumes && <option>Loading...</option>}
                    {resumes.map(r => <option key={r.id} value={r.id.toString()}>{r.title}</option>)}
                  </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                  <Target className="w-3 h-3" /> Target Job Description
                </label>
                <textarea
                  rows={10}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  disabled={isTailoring}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/30 px-6 py-5 font-medium text-slate-600 focus:border-indigo-500 focus:ring-0 outline-none transition-all resize-none leading-relaxed text-sm shadow-inner"
                  placeholder="Paste the job description here..."
                />
              </div>

              <button 
                onClick={handleTailor}
                disabled={isTailoring || !jobDescription.trim()}
                className="w-full h-14 bg-indigo-600 hover:bg-slate-900 text-white font-black rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 group"
              >
                {isTailoring ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {isTailoring ? "Tailoring..." : "Tailor Resume"}
              </button>
           </div>
        </div>
      ) : (
        /* Side-by-Side Focused View */
        <div className="space-y-12 animate-in slide-in-from-bottom-6 duration-1000">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Original Baseline</span>
                  <span className="text-[10px] font-bold text-slate-400">{result.original_match_score}% Match</span>
              </div>
              <div className="bg-slate-50 rounded-[2rem] border border-slate-100 h-[750px] overflow-y-auto overflow-x-hidden custom-scrollbar opacity-60 flex justify-center">
                <div className="pt-8">
                  {originalResumeData && <ResumePreview data={originalResumeData} scale={0.6} />}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Tailored optimization</span>
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{result.match_score}% Match</span>
              </div>
              <div className="h-[750px] overflow-y-auto overflow-x-hidden custom-scrollbar flex justify-center">
                <div className="pt-8">
                  <ResumePreview data={result.tailored_data} scale={0.6} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-lg space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Optimization Delta</h4>
                <div className="flex items-center justify-around">
                   <div className="text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Baseline</div>
                      <div className={`text-3xl font-black mt-1 ${result.original_match_score > 70 ? "text-emerald-500" : result.original_match_score > 40 ? "text-amber-500" : "text-slate-400"}`}>
                        {result.original_match_score}%
                      </div>
                   </div>
                   <div className="flex flex-col items-center gap-1">
                      <ArrowRight className="text-slate-200 w-5 h-5" />
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        (result.comparison?.score_improvement || 0) > 0 ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                      }`}>
                        +{(result.comparison?.score_improvement || 0)}%
                      </span>
                   </div>
                   <div className="text-center">
                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">Tailored</div>
                      <div className={`text-3xl font-black mt-1 ${result.match_score > 70 ? "text-emerald-500" : result.match_score > 40 ? "text-amber-500" : "text-indigo-600"}`}>
                        {result.match_score}%
                      </div>
                   </div>
                </div>
                <div className="pt-4 border-t border-slate-50">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${result.match_score > 70 ? "bg-emerald-500" : result.match_score > 40 ? "bg-amber-500" : "bg-red-500"}`} />
                         <span className="text-[10px] font-bold text-slate-500 uppercase">System Status</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                         {result.stop_reason?.replace('_', ' ') || "Optimized"}
                      </span>
                   </div>
                </div>
             </div>

             <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-50 shadow-lg">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-2">JD Alignment breakthroughs</h4>
                <div className="grid grid-cols-2 gap-x-12 gap-y-6 px-2">
                   {result.section_scores && Object.entries(result.section_scores).map(([name, score]) => (
                     <div key={name} className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-tight">
                           <span className="text-slate-400">{name}</span>
                           <span className={score > 70 ? "text-emerald-500" : score > 40 ? "text-amber-500" : "text-slate-400"}>
                             {score}%
                           </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                           <div className={`h-full rounded-full transition-all duration-1000 ${
                             score > 70 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : score > 40 ? "bg-amber-500" : "bg-slate-200"
                           }`} style={{ width: `${score}%` }} />
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}
