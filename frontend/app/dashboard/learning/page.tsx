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
  AlertCircle
} from "lucide-react";
import api from "@/services/api";

interface SkillItem {
    id: number;
    name: str;
    importance: number;
}

interface CourseItem {
    id: number;
    title: string;
    platform: string;
    url: string;
    level: string;
    rating: float;
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

export default function RoadmapPage() {
  const [skillGap, setSkillGap] = useState<SkillGapData | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time analysis inputs
  const [jdInput, setJdInput] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Active IDs
  const [activeIds, setActiveIds] = useState<{resumeId: number, jobId: number} | null>(null);

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
      setError("Could not load analysis. Please try again or re-analyze.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!jdInput) {
      alert("Please enter a job description.");
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      formData.append("job_description", jdInput);
      
      const res = await api.post("/analysis/analyze-new", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      await fetchAnalysis(res.data.resume_id, res.data.job_id);
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError("Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading || analyzing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-slate-500 font-medium">{analyzing ? "AI is processing your career path..." : "Loading results..."}</p>
      </div>
    );
  }

  if (!activeIds && !error) {
    return (
      <div className="max-w-4xl mx-auto space-y-12 py-10">
         <div className="text-center space-y-4">
            <h1 className="text-5xl font-black text-slate-900 tracking-tight">Generate Your Learning Roadmap</h1>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">Upload your resume and tell us your target job. Our AI will find the gaps and build your path to success.</p>
         </div>

         <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-indigo-100 space-y-8">
            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2">1. Upload your Resume (Optional)</label>
                  <div className="relative group p-8 bg-slate-50 border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-[2rem] transition-all text-center">
                     <input 
                       type="file" 
                       accept=".pdf"
                       onChange={(e) => setFile(e.target.files?.[0] || null)}
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                     />
                     <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                           <BookOpen className="w-6 h-6 text-indigo-500" />
                        </div>
                        <p className="text-slate-600 font-bold">{file ? file.name : "Select PDF Document"}</p>
                        <p className="text-xs text-slate-400">If you skip, we'll use your most recent saved profile.</p>
                     </div>
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2">2. Target Job Description</label>
                  <textarea 
                    value={jdInput}
                    onChange={(e) => setJdInput(e.target.value)}
                    placeholder="Paste the job description or enter a role (e.g., Senior Frontend Engineer)"
                    className="w-full min-h-[150px] p-6 rounded-[2rem] bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all text-slate-700 outline-none shadow-inner"
                  />
               </div>
            </div>

            <button 
              onClick={handleAnalyze}
              className="w-full py-5 rounded-[2rem] bg-indigo-600 text-white font-black text-lg flex items-center justify-center gap-3 hover:bg-slate-900 transition-all shadow-xl shadow-indigo-200 active:scale-95"
            >
               <Zap className="w-6 h-6 fill-current" /> Build My Personalized Roadmap
            </button>
         </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-slate-500 font-medium">Generating your custom learning path...</p>
      </div>
    );
  }

  if (error || !skillGap) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Analysis Needed</h2>
        <p className="text-slate-500 max-w-md mb-8">{error || "Please select a resume and target job in the 'Jobs' section to generate your skill gap analysis."}</p>
        <button 
          onClick={() => window.location.href = '/dashboard/jobs'}
          className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
        >
          Go to Job Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      
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
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold text-slate-700">
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
         <button className="px-8 py-4 bg-white text-indigo-600 font-black rounded-2xl flex items-center gap-2 mx-auto hover:scale-105 active:scale-95 transition-all">
            <BookOpen className="w-5 h-5" /> Browse Full Library <ChevronRight className="w-5 h-5" />
         </button>
      </section>

    </div>
  );
}
