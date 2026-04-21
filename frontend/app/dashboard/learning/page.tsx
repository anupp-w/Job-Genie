"use client";

import React, { useEffect, useState } from "react";
import { 
  BookOpen, 
  Play, 
  Award, 
  CheckCircle2, 
  Target, 
  TrendingUp, 
  Clock, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  Loader2,
  AlertCircle,
  Calendar,
  ArrowRight,
  ArrowLeft,
  FileText,
  Star
} from "lucide-react";
import api from "@/services/api";
import { useToast } from "@/components/ui/toast-provider";
import { getApiErrorMessage } from "@/lib/api-error";

interface SkillItem {
    id: number;
    name: string;
    importance: number;
}

interface CourseItem {
    id: number;
    title: string;
    platform: string;
    url: string;
    level: string;
    rating: number;
    duration: string;
    institution: string;
}

interface RoadmapItem {
    skill_id: number;
    skill_name: string;
    courses: CourseItem[];
}

interface SkillGapData {
    resume_id: number;
    job_id: number;
    match_percentage: number;
    matches: SkillItem[];
    gaps: SkillItem[];
}

interface RoadmapData {
    resume_id: number;
    job_id: number;
    roadmap: RoadmapItem[];
}

interface AnalysisHistoryItem {
    id: number;
    resume_id: number;
    job_id: number;
    resume_title: string;
    job_title: string;
    job_description_preview: string;
    match_percentage: number;
    skills_matched: number;
    skills_gap: number;
    created_at: string;
}

export default function RoadmapPage() {
  const toast = useToast();
  const [skillGap, setSkillGap] = useState<SkillGapData | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time analysis inputs
  const [showForm, setShowForm] = useState(false);
  const [jdInput, setJdInput] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Active IDs
  const [activeIds, setActiveIds] = useState<{resumeId: number, jobId: number} | null>(null);

  // History
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        setHistoryLoading(true);
        const res = await api.get("/analysis/history");
        setHistory(res.data);
      } catch (err) {
        console.error("Failed to load analysis history", err);
        toast.error("History unavailable", getApiErrorMessage(err, "Could not load analysis history."));
      } finally {
        setHistoryLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const fetchAnalysis = async (resumeId: number, jobId: number) => {
    setLoading(true);
    setError(null);
    try {
      const [gapRes, roadmapRes] = await Promise.all([
        api.get<SkillGapData>(`/analysis/skill-gap/${resumeId}/${jobId}`),
        api.get<RoadmapData>(`/analysis/roadmap/${resumeId}/${jobId}`)
      ]);
      setSkillGap(gapRes.data);
      setRoadmap(roadmapRes.data);
      setActiveIds({ resumeId, jobId });
    } catch (err: any) {
      console.error("Fetch error:", err);
      const message = getApiErrorMessage(err, "Could not load analysis. Please try again or re-analyze.");
      setError(message);
      toast.error("Failed to load analysis", message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!jdInput) {
      toast.warning("Job description required", "Please enter a job description.");
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      formData.append("job_description", jdInput);
      
      const res = await api.post("/analysis/analyze-new", formData);
      
      await fetchAnalysis(res.data.resume_id, res.data.job_id);
      setShowForm(false);
      // Refresh history
      const histRes = await api.get("/analysis/history");
      setHistory(histRes.data);
    } catch (err: any) {
      console.error("Analysis error:", err);
      const message = getApiErrorMessage(err, "Analysis failed. Please try again.");
      setError(message);
      toast.error("Analysis failed", message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleViewHistory = (item: AnalysisHistoryItem) => {
    fetchAnalysis(item.resume_id, item.job_id);
  };

  const handleBackToLanding = () => {
    setActiveIds(null);
    setSkillGap(null);
    setRoadmap(null);
    setError(null);
    setShowForm(false);
  };

  // ─── LOADING STATE ───
  if (loading || analyzing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-slate-500 font-medium">{analyzing ? "AI is processing your career path..." : "Loading results..."}</p>
      </div>
    );
  }

  // ─── RESULTS VIEW ───
  if (activeIds && skillGap) {
    return (
      <div className="space-y-12 pb-20 animate-in fade-in duration-700">
        
        {/* Back Button */}
        <button 
          onClick={handleBackToLanding}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to History
        </button>

        {/* HEADER & OVERVIEW */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                <Zap className="w-3 h-3" /> Personalized Learning Path
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Your Career Roadmap</h1>
              <p className="text-slate-500 max-w-2xl">We've analyzed your resume against your target job. Here is exactly what's missing and how you can bridge the gap.</p>
            </div>
            
            <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
               <div className="relative w-16 h-16">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="32" cy="32" r="28" fill="transparent" stroke="rgba(79, 70, 229, 0.1)" strokeWidth="6" />
                    <circle cx="32" cy="32" r="28" fill="transparent" stroke="#4f46e5" strokeWidth="6" strokeDasharray={176} strokeDashoffset={176 - (176 * skillGap.match_percentage) / 100} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-xs font-black text-slate-900 leading-none">{skillGap.match_percentage}%</span>
                  </div>
               </div>
               <div>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Match Score</p>
                  <p className="text-lg font-bold text-slate-900 leading-none">Ready to Shine</p>
               </div>
            </div>
          </div>
        </section>

        {/* SKILL GAP ANALYSIS */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Mastered Skills */}
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900">Mastered Skills</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                 {skillGap.matches.map(skill => (
                    <span key={skill.id} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                       <CheckCircle2 className="w-3 h-3" /> {skill.name}
                    </span>
                 ))}
                 {skillGap.matches.length === 0 && <p className="text-slate-400 italic text-sm">No exact matches found yet.</p>}
              </div>
           </div>

           {/* Skill Gaps */}
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Target className="w-5 h-5 text-amber-600" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900">Skill Gaps (Next Goals)</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                 {skillGap.gaps.map(skill => (
                    <span key={skill.id} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                       <AlertCircle className="w-3 h-3" /> {skill.name}
                    </span>
                 ))}
                 {skillGap.gaps.length === 0 && <p className="text-emerald-500 font-bold text-sm">You have all the required skills for this role! 🎉</p>}
              </div>
           </div>
        </section>

        {/* LEARNING ROADMAP */}
        <section className="space-y-8">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center">
                 <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Step-by-Step Learning Path</h2>
           </div>

           <div className="space-y-16 pl-6 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-gradient-to-b before:from-indigo-500 before:via-purple-500 before:to-indigo-500 before:rounded-full">
              {roadmap?.roadmap.map((item, idx) => (
                 <div key={item.skill_id} className="relative space-y-6">
                    {/* Skill Indicator */}
                    <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-4 border-indigo-600" />
                    
                    <div className="space-y-2">
                       <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                          {idx + 1}. Master <span className="text-indigo-600">{item.skill_name}</span>
                       </h3>
                       <p className="text-sm text-slate-500">Suggested courses to gain this competency from our database.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                       {item.courses.map(course => (
                          <div key={course.id} className="group bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-indigo-500/30 transition-all hover:shadow-2xl hover:shadow-indigo-500/5 flex flex-col">
                             <div className="flex items-start justify-between mb-6">
                                <div className="px-3 py-1 rounded-lg bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-100">
                                   {course.platform}
                                </div>
                                <div className="flex items-center gap-1 text-amber-500">
                                   <Award className="w-4 h-4" />
                                   <span className="text-xs font-bold">{course.rating || "N/A"}</span>
                                </div>
                             </div>
                             
                             <h4 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-4 flex-1">
                                {course.title}
                             </h4>

                             <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                                   <Target className="w-3.5 h-3.5 text-indigo-400" /> {course.level || "Beginner"} Level
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                                   <Clock className="w-3.5 h-3.5 text-purple-400" /> {course.duration || "Self-paced"}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                                   <Target className="w-3.5 h-3.5 text-slate-400" /> {course.institution}
                                </div>
                             </div>

                             <a 
                               href={course.url} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="w-full py-3 rounded-2xl bg-slate-50 text-indigo-600 font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                             >
                                <Play className="w-3 h-3 fill-current" /> View Course <ExternalLink className="w-3 h-3" />
                             </a>
                          </div>
                       ))}
                    </div>
                 </div>
              ))}

              {(!roadmap || roadmap.roadmap.length === 0) && (
                 <div className="py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
                       <CheckCircle2 className="w-10 h-10 text-indigo-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">You're All Set!</h3>
                    <p className="text-slate-500">No major skill gaps identified for this role based on your current resume.</p>
                 </div>
              )}
           </div>
        </section>

        {/* CTA SECTION */}
        <section className="bg-indigo-600 p-8 rounded-[3rem] text-center text-white space-y-6 shadow-2xl shadow-indigo-200">
           <h2 className="text-3xl font-black tracking-tight">Ready to start your journey?</h2>
           <p className="max-w-xl mx-auto text-indigo-100 font-medium">These courses are curated specifically for your gap. Completing them will increase your match score significantly.</p>
           <button 
            onClick={handleBackToLanding}
            className="px-8 py-4 bg-white text-indigo-600 font-black rounded-2xl flex items-center gap-2 mx-auto hover:scale-105 active:scale-95 transition-all"
           >
              <Zap className="w-5 h-5" /> Analyze Another Role <ChevronRight className="w-5 h-5" />
           </button>
        </section>
      </div>
    );
  }

  // ─── LANDING: HISTORY + NEW ANALYSIS ───
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[var(--foreground)]">Skill Gap & Roadmap</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Upload your resume and a job description. AI identifies your skill gaps and builds a course-by-course learning path.</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 bg-[var(--accent-2)] hover:bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <Zap className="w-5 h-5" />
            New Analysis
          </button>
        )}
      </div>

      {/* New Analysis Form */}
      {showForm && (
        <section className="surface-panel p-6 shadow-sm border border-[var(--border)] rounded-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-[18px] font-semibold text-[var(--foreground)]">Analyze Career Gap</h2>
              <p className="text-sm text-[var(--muted)] mt-1">Upload your resume and paste the target job description. We'll identify your skill gaps and recommend courses.</p>
            </div>
            <button 
              onClick={() => setShowForm(false)}
              className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-semibold tracking-wide uppercase text-[var(--muted)]">Resume (PDF, Optional)</label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[14px] text-[var(--foreground)] flex items-center gap-3 group-hover:border-indigo-500/50 transition-colors">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  <span className={file ? "text-[var(--foreground)] font-medium" : "text-[var(--muted)]"}>
                    {file ? file.name : "Click to select your PDF resume"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <label className="text-[12px] font-semibold tracking-wide uppercase text-[var(--muted)]">Job Description / Target Role</label>
            <textarea
              value={jdInput}
              onChange={(e) => setJdInput(e.target.value)}
              rows={5}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[14px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/30 transition-shadow resize-none"
              placeholder="Paste the job description, responsibilities, required skills, or even just a role title like 'Senior React Developer'..."
            />
          </div>

          {error && <p className="text-rose-500 text-sm mt-3 font-medium bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">{error}</p>}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-6 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-2 text-[12px] text-[var(--muted)] font-medium">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              AI will extract skills from both documents, compare them, and recommend courses.
            </div>
            <button 
              onClick={handleAnalyze}
              disabled={analyzing}
              className="inline-flex flex-shrink-0 items-center justify-center gap-2 bg-[var(--accent-2)] hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl text-[14px] font-semibold transition-all shadow-sm hover:scale-105 active:scale-95"
            >
              {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              {analyzing ? "Analyzing..." : "Build Roadmap"}
            </button>
          </div>
        </section>
      )}

      {/* History Grid */}
      {!showForm && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <h2 className="text-[18px] font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--muted)]" />
            Your Analysis History
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {historyLoading ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center border border-[var(--border)] border-dashed rounded-2xl bg-[var(--surface-1)]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--muted)] mb-3" />
                <p className="text-[var(--muted)] font-medium">Loading your past analyses...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center border border-[var(--border)] border-dashed rounded-2xl bg-[var(--surface-1)]">
                <FileText className="w-8 h-8 text-[var(--muted)] mb-3 opacity-50" />
                <p className="text-[var(--muted)] font-medium">No past analyses found.</p>
                <button 
                  onClick={() => setShowForm(true)}
                  className="mt-3 text-indigo-500 font-semibold hover:underline text-sm"
                >
                  Run your first skill gap analysis
                </button>
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => handleViewHistory(item)}
                  className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                      {item.match_percentage}% Match
                    </span>
                    <span className="text-xs text-[var(--muted)] font-medium">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ""}
                    </span>
                  </div>
                  
                  <h3 className="text-[16px] font-semibold text-[var(--foreground)] mb-1 group-hover:text-indigo-500 transition-colors line-clamp-1">
                    {item.resume_title}
                  </h3>
                  <p className="text-xs text-[var(--muted)] line-clamp-2 mb-3">
                    {item.job_description_preview}
                  </p>
                  
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {item.skills_matched}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                        <Target className="w-3.5 h-3.5" /> {item.skills_gap}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[var(--muted)] group-hover:text-indigo-500 group-hover:-rotate-45 transition-all" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
