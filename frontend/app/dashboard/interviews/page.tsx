"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PlayCircle, MessageCircle, ClipboardList, CheckCircle2, Star, Loader2, Calendar, FileText, ArrowRight
} from "lucide-react";
import api from "@/services/api";

export default function InterviewsPage() {
  const router = useRouter();
  
  // State for form
  const [showForm, setShowForm] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [seniority, setSeniority] = useState("Junior");
  const [jobDescription, setJobDescription] = useState("");
  
  // State for application
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Fetch true history from the backend
  useEffect(() => {
    async function fetchHistory() {
      try {
        setHistoryLoading(true);
        const res = await api.get("/interviews/");
        setHistory(res.data);
      } catch (err) {
        console.error("Failed to load interview history", err);
      } finally {
        setHistoryLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const handleStartInterview = async () => {
    if (!jobTitle.trim() || !jobDescription.trim()) {
      setError("Please provide both a Job Title and Description.");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      
      const res = await api.post("/interviews/new", {
        job_title: `${seniority} ${jobTitle}`.trim(),
        job_description: jobDescription
      });
      
      router.push(`/dashboard/interviews/${res.data.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to start interview session.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[var(--foreground)]">Interview Engine</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Practice dynamically generated mock interviews tailored accurately to your target role.</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 bg-[var(--accent-2)] hover:bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <PlayCircle className="w-5 h-5" />
            Start New Session
          </button>
        )}
      </div>

      {showForm ? (
        <section className="surface-panel p-6 shadow-sm border border-[var(--border)] rounded-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-[18px] font-semibold text-[var(--foreground)]">Create Mock Interview</h2>
              <p className="text-sm text-[var(--muted)] mt-1">Paste your target job description. We'll instantly calibrate a 10-question technical & behavioral loop.</p>
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
              <label className="text-[12px] font-semibold tracking-wide uppercase text-[var(--muted)]">Job Title</label>
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[14px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/30 transition-shadow"
                placeholder="e.g., Frontend Engineer"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-semibold tracking-wide uppercase text-[var(--muted)]">Seniority</label>
              <select 
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[14px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/30 cursor-pointer"
              >
                <option>Intern / Entry-Level</option>
                <option>Junior</option>
                <option>Mid-Level</option>
                <option>Senior</option>
                <option>Lead / Principal</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <label className="text-[12px] font-semibold tracking-wide uppercase text-[var(--muted)]">Job Description / Focus</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={5}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[14px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/30 transition-shadow resize-none"
              placeholder="Paste the key responsibilities, requirements, or focus areas from the job posting..."
            />
          </div>

          {error && <p className="text-rose-500 text-sm mt-3 font-medium bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">{error}</p>}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-6 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-2 text-[12px] text-[var(--muted)] font-medium">
              <ClipboardList className="w-4 h-4 text-emerald-500" />
              This will generate exactly 10 questions (Behavioral + Technical) based precisely on the role.
            </div>
            <button 
              onClick={handleStartInterview}
              disabled={loading}
              className="inline-flex flex-shrink-0 items-center justify-center gap-2 bg-[var(--accent-2)] hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl text-[14px] font-semibold transition-all shadow-sm hover:scale-105 active:scale-95"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
              {loading ? "Initializing Environment..." : "Start Interview Loop"}
            </button>
          </div>
        </section>
      ) : null}

      {/* History Grid */}
      {!showForm && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <h2 className="text-[18px] font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--muted)]" />
            Your Live Interview History
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {historyLoading ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center border border-[var(--border)] border-dashed rounded-2xl bg-[var(--surface-1)]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--muted)] mb-3" />
                <p className="text-[var(--muted)] font-medium">Loading your past sessions...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center border border-[var(--border)] border-dashed rounded-2xl bg-[var(--surface-1)]">
                <FileText className="w-8 h-8 text-[var(--muted)] mb-3 opacity-50" />
                <p className="text-[var(--muted)] font-medium">No past interview sessions found.</p>
                <button 
                  onClick={() => setShowForm(true)}
                  className="mt-3 text-indigo-500 font-semibold hover:underline text-sm"
                >
                  Start your first mock interview
                </button>
              </div>
            ) : (
              history.map((session: any) => (
                <div 
                  key={session.id} 
                  onClick={() => router.push(session.status === "completed" ? `/dashboard/interviews/${session.id}/results` : `/dashboard/interviews/${session.id}`)}
                  className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span 
                      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md ${
                        session.status === "completed" 
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                      }`}
                    >
                      {session.status === "completed" ? "Completed" : "In Progress"}
                    </span>
                    <span className="text-xs text-[var(--muted)] font-medium">
                      {new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  
                  <h3 className="text-[16px] font-semibold text-[var(--foreground)] mb-1 group-hover:text-indigo-500 transition-colors line-clamp-1">
                    {session.job_title}
                  </h3>
                  
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    {session.status === "completed" ? (
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--foreground)]">
                        <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                        View Scorecard
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors">
                        Continue Session
                      </div>
                    )}
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
