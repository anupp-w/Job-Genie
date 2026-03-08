"use client";

import React from "react";
import {
  PlayCircle,
  Mic,
  MessageCircle,
  ClipboardList,
  Timer,
  CheckCircle2,
  Star,
  Repeat,
  BookOpen
} from "lucide-react";

const queueQuestions = [
  { id: 1, label: "Behavioral", text: "Tell me about a time you led a project under a tight deadline." },
  { id: 2, label: "Behavioral", text: "Describe a conflict with a teammate and how you resolved it." },
  { id: 3, label: "Behavioral", text: "When did you fail, and what did you learn?" },
  { id: 4, label: "Behavioral", text: "How do you prioritize tasks when everything is urgent?" },
  { id: 5, label: "Behavioral", text: "Give an example of delivering feedback that landed well." },
  { id: 6, label: "Behavioral", text: "Walk through a time you influenced without authority." },
  { id: 7, label: "Technical", text: "Explain how you would design a rate limiter for an API." },
  { id: 8, label: "Technical", text: "How do you optimize a slow React page?" },
  { id: 9, label: "Technical", text: "Describe your debugging process for intermittent prod bugs." },
  { id: 10, label: "Technical", text: "How would you structure state management for a dashboard?" }
];

const recentSessions = [
  {
    id: 1,
    title: "Frontend Engineer Mock",
    score: 86,
    date: "Feb 14",
    highlights: "Strong STAR structure; tighten technical depth on performance tuning"
  },
  {
    id: 2,
    title: "Behavioral Deep Dive",
    score: 90,
    date: "Feb 11",
    highlights: "Great storytelling; add metrics earlier in answers"
  }
];

export default function InterviewsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-[var(--foreground)]">Interview Coach</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Start a mock aligned to your target role, get 6 behavioral + 4 technical questions, then score + model answers.</p>
        </div>
        <button className="flex items-center gap-2 bg-[var(--accent-2)] hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all hover:scale-105 active:scale-95">
          <PlayCircle className="w-5 h-5" />
          Start New Session
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left: Start a new interview */}
        <div className="xl:col-span-2 space-y-6">
          <section className="surface-panel p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-[16px] font-semibold text-[var(--foreground)]">Create a mock interview</h2>
                <p className="text-sm text-[var(--muted)] mt-1">Enter the role you’re targeting and a short description. You’ll get 10 questions (6 behavioral, 4 technical), graded with best-fit answers.</p>
              </div>
              <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-600">
                <MessageCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] text-[var(--muted)]">Job Title</label>
                <input
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/30"
                  placeholder="e.g., Frontend Engineer"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12px] text-[var(--muted)]">Seniority</label>
                <select className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/30">
                  <option>Junior</option>
                  <option>Mid</option>
                  <option>Senior</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <label className="text-[12px] text-[var(--muted)]">Job Description / Focus</label>
              <textarea
                rows={4}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/30"
                placeholder="Paste a brief description or the key responsibilities you want to target"
              />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-5">
              <div className="flex items-center gap-3 text-[12px] text-[var(--muted)]">
                <ClipboardList className="w-4 h-4" />
                10 questions total • 6 behavioral • 4 technical • Scores + model answers
              </div>
              <button className="inline-flex items-center gap-2 bg-[var(--accent-2)] hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-[14px] font-medium transition-colors shadow-sm">
                <PlayCircle className="w-4 h-4" />
                Start interview
              </button>
            </div>
          </section>

          {/* Question queue preview */}
          <section className="surface-panel p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold text-[var(--foreground)]">This session’s 10-question queue</h2>
              <span className="text-[12px] text-[var(--muted)] flex items-center gap-2">
                <Timer className="w-4 h-4" />
                Adaptive ordering, no job scraping needed
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {queueQuestions.map((q) => (
                <div key={q.id} className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-100">{q.label}</span>
                    <span className="text-[10px] text-[var(--muted)]">Q{q.id}</span>
                  </div>
                  <p className="text-[14px] text-[var(--foreground)] leading-snug">{q.text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Progress + history */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl surface-panel shadow-sm">
            <h3 className="text-[14px] font-semibold text-[var(--foreground)] mb-4">Run summary</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-[var(--foreground)]">10/10 questions queued</p>
                <p className="text-[12px] text-[var(--muted)]">6 behavioral • 4 technical • RAG uses your inputs only</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[12px] text-[var(--muted)]">
                <span>Behavioral coverage</span>
                <span>6</span>
              </div>
              <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5">
                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: "60%" }}></div>
              </div>
              <div className="flex items-center justify-between text-[12px] text-[var(--muted)]">
                <span>Technical coverage</span>
                <span>4</span>
              </div>
              <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "40%" }}></div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl surface-panel shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-[var(--foreground)]">Recent sessions</h3>
              <button className="text-[12px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1">
                <Repeat className="w-4 h-4" />
                Try again
              </button>
            </div>
            <div className="space-y-4">
              {recentSessions.map((session) => (
                <div key={session.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[12px] text-[var(--muted)]">{session.date}</div>
                    <div className="flex items-center gap-1 text-[14px] font-semibold text-emerald-600">
                      <Star className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                      {session.score}
                    </div>
                  </div>
                  <p className="text-[14px] font-medium text-[var(--foreground)]">{session.title}</p>
                  <p className="text-[12px] text-[var(--muted)] mt-1 leading-snug">{session.highlights}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl surface-panel shadow-sm">
            <h3 className="text-[14px] font-semibold text-[var(--foreground)] mb-3">Tips for higher scores</h3>
            <ul className="space-y-3 text-[12px] text-[var(--muted)]">
              <li className="flex gap-2"><BookOpen className="w-4 h-4 text-indigo-500" /> Use STAR for all behavioral answers; lead with the metric.</li>
              <li className="flex gap-2"><Mic className="w-4 h-4 text-indigo-500" /> Keep answers under 2 minutes; outline first, then dive.</li>
              <li className="flex gap-2"><MessageCircle className="w-4 h-4 text-indigo-500" /> Mirror the job description keywords in your answers—no job scraping needed, just your input.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
