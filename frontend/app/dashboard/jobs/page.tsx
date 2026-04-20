"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Target, Sparkles, Loader2, ArrowRight, TrendingUp, Save, Search, RotateCcw
} from "lucide-react";
import api from "@/services/api";
import ResumePreview, { ResumeData } from "@/components/ResumePreview";

type ResumeResponse = {
  id: number;
  title: string;
  ats_score: number;
  parsed_content?: string | null;
  sections: any[];
  updated?: string;
};

interface TailorResponse {
  tailored_data: ResumeData;
  match_score: number;
  original_match_score?: number | null;
  explanation: string;
  changes: string[];
  missing_skills: string[];
  matched_skills: string[];
}

export default function TailorPage() {
  const router = useRouter();

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

  useEffect(() => {
    fetchResumes();
  }, []);

  // When selected resume changes, sync original data for preview
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
    } finally {
      setIsLoadingResumes(false);
    }
  };

  const getSelectedResumeData = (): ResumeData | null => {
    if (!selectedResumeId) return null;
    const res = resumes.find(r => r.id.toString() === selectedResumeId);
    if (!res) return null;
    
    // Extract JSON payload from structured_data section as preferred source
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
      alert("Please select a resume to tailor.");
      return;
    }
    if (!jobDescription.trim()) {
      alert("Please paste a job description.");
      return;
    }

    const resumeData = getSelectedResumeData();
    if (!resumeData) {
      alert("The selected resume does not contain valid structured data.");
      return;
    }

    setIsTailoring(true);
    setResult(null);
    setTailorProgress("Analyst: Extracting Job DNA...");

    const progressInterval = setInterval(() => {
      setTailorProgress(prev => {
        if (prev.includes("Analyst")) return "Archaeologist: Finding hidden potential...";
        if (prev.includes("Archaeologist")) return "Tactical Writer: Tailoring experience bullets...";
        if (prev.includes("Tactical")) return "Optimizer: Finishing ATS polish...";
        if (prev.includes("Optimizer")) return "Auditor: Evaluating match & quality...";
        return prev;
      });
    }, 4500);

    try {
      const res = await api.post("/tailor", {
        resume_data: resumeData,
        job_description: jobDescription
      });

      clearInterval(progressInterval);
      setResult(res.data);
    } catch (err: any) {
      clearInterval(progressInterval);
      alert(err.response?.data?.detail || err.message || "Failed to tailor resume.");
    } finally {
      setIsTailoring(false);
      setTailorProgress("");
    }
  };

  const handleSaveTailored = async () => {
    if (!result) return;
    const newTitle = prompt("Enter a name for this tailored resume:", "Tailored Resume - Job Genie");
    if (!newTitle) return;

    try {
      const payload = {
        title: newTitle,
        sections: [
          { section_type: "structured_data", content: JSON.stringify(result.tailored_data), order: 0 }
        ]
      };
      await api.post("/resumes", payload);
      router.push(`/dashboard/resumes`);
      alert("Saved! You can now edit/download your tailored resume.");
    } catch (err) {
      console.error(err);
      alert("Failed to save tailored resume.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)] flex items-center gap-2">
            <Target className="w-6 h-6 text-indigo-500" />
            AI Resume Tailoring Squad
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Our multi-agent LangGraph squad rewrites your resume using a cyclic feedback loop.
          </p>
        </div>
        {result && (
          <div className="flex gap-3">
            <button 
              onClick={() => { setResult(null); setJobDescription(""); }}
              className="px-4 py-2 text-sm font-bold text-[var(--muted)] hover:text-red-500 flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button 
              onClick={handleSaveTailored}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" /> Save Tailored Resume
            </button>
          </div>
        )}
      </div>

      {!result ? (
        /* Configuration View */
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="surface-panel p-8 rounded-[2rem] shadow-xl border border-[var(--border)] space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Select Base Resume
                </label>
                <select 
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  disabled={isLoadingResumes || isTailoring}
                  className="w-full h-14 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50"
                >
                  {isLoadingResumes && <option value="">Loading resumes...</option>}
                  {!isLoadingResumes && resumes.length === 0 && <option value="">No resumes found</option>}
                  {resumes.map(r => (
                    <option key={r.id} value={r.id.toString()}>{r.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Search className="w-4 h-4" /> Job Description
                </label>
                <textarea
                  rows={12}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  disabled={isTailoring}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-5 py-4 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none leading-relaxed"
                  placeholder="Paste the target JD here. My squad will extract requirements and optimize your bullets..."
                />
              </div>

              <button 
                onClick={handleTailor}
                disabled={isTailoring || resumes.length === 0 || !jobDescription.trim()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
              >
                {isTailoring ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {isTailoring ? "Squad Working..." : "Start Tailoring"}
              </button>
            </div>

            {/* Agent Status (Only visible during tailoring) */}
            {isTailoring && (
              <div className="surface-panel p-6 rounded-2xl border-2 border-indigo-500/20 bg-indigo-50/30 flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-bold text-indigo-900">{tailorProgress}</p>
                  <p className="text-xs text-indigo-600">Cyclic feedback loop active...</p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
             <div className="bg-slate-50 rounded-[2.5rem] p-12 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4 min-h-[500px]">
                <div className="w-20 h-20 rounded-3xl bg-white shadow-lg flex items-center justify-center text-indigo-500">
                  <Target className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Ready for Transformation</h3>
                <p className="text-slate-500 max-w-sm">
                  Select a resume and paste a job description to initiate the 5-agent tailoring squad. You'll see a side-by-side comparison of the results.
                </p>
             </div>
          </div>
        </div>
      ) : (
        /* Result Comparison View */
        <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
          {/* Comparison Header */}
          <div className="grid grid-cols-2 gap-8 sticky top-0 z-20 bg-[var(--background)]/80 backdrop-blur-md py-4 border-b border-[var(--border)]">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-[10px]">Original Resume</p>
                  <p className="text-lg font-black text-slate-900">{result.original_match_score || 0}% Match</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest text-[10px]">Tailored Result</p>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-black text-indigo-900">{result.match_score}% Match</p>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> +{(result.match_score - (result.original_match_score || 0))}%
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={handleSaveTailored}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all"
              >
                Save
              </button>
            </div>
          </div>

          {/* Side by Side Previews */}
          <div className="grid grid-cols-2 gap-12 pt-4">
             <div className="space-y-4">
                <div className="overflow-hidden rounded-[2rem] border border-slate-200 shadow-sm bg-slate-50 p-8 h-[900px] overflow-y-auto custom-scrollbar">
                   {originalResumeData && (
                     <ResumePreview data={originalResumeData} scale={0.75} />
                   )}
                </div>
             </div>
             
             <div className="space-y-4">
                <div className="overflow-hidden rounded-[2rem] border-2 border-indigo-500 shadow-2xl shadow-indigo-100 bg-white p-8 h-[900px] overflow-y-auto custom-scrollbar relative">
                   <div className="absolute top-4 right-4 z-10 px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                      Tailored by Squad
                   </div>
                   <ResumePreview data={result.tailored_data} scale={0.75} />
                </div>
             </div>
          </div>

          {/* Skill Gap Summary (Cleaned up) */}
          <div className="surface-panel p-10 rounded-[3rem] border border-slate-100 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-12">
             <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" /> Matched Focus
                </h3>
                <div className="flex flex-wrap gap-2">
                   {result.matched_skills.map((skill, i) => (
                     <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100 shadow-sm">
                       {skill}
                     </span>
                   ))}
                </div>
             </div>
             <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-amber-500" /> Improvement Areas
                </h3>
                <div className="flex flex-wrap gap-2">
                   {result.missing_skills.map((skill, i) => (
                     <span key={i} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-100 shadow-sm">
                       {skill}
                     </span>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
