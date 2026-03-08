"use client";

import React from "react";
import {
  Upload,
  FileText,
  Target,
  Wand2,
  CheckCircle2,
  AlertTriangle,
  Key,
  Lightbulb,
  Sparkles,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";

const missingKeywords = [
  "Distributed systems",
  "Performance tuning",
  "A/B testing",
  "Mentorship",
];

const smartSentences = [
  {
    weak: "Improved page load",
    strong: "Cut LCP from 4.2s to 2.1s via code-splitting and image optimization",
  },
  {
    weak: "Worked on features",
    strong: "Shipped experiment platform enabling 12% lift in signups (p<0.05)",
  },
];

const gapTasks = [
  { title: "System design: API rate limiting", status: "To do" },
  { title: "React: profiling & memoization", status: "In progress" },
  { title: "Data: SQL window functions", status: "To do" },
];

export default function TailorPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-[var(--foreground)]">Tailor resume to job description</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Upload or pick a resume, paste the JD, then get ATS, match, missing keywords, smart sentences, and skill gap tasks.</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-[var(--accent-2)] hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-[14px] font-medium transition-colors shadow-sm">
          <Sparkles className="w-4 h-4" />
          Auto-tailor
        </button>
      </div>

      {/* Input area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 surface-panel p-6 rounded-xl shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[12px] text-[var(--muted)]">Resume</label>
              <div className="flex gap-2">
                <select className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/30">
                  <option>Frontend Resume.pdf</option>
                  <option>Product Resume.pdf</option>
                  <option>Data Resume.pdf</option>
                </select>
                <button className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[14px] text-[var(--foreground)] hover:bg-[var(--surface)] inline-flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[12px] text-[var(--muted)]">Target role</label>
              <input
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/30"
                placeholder="e.g., Senior Frontend Engineer"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] text-[var(--muted)]">Job description</label>
            <textarea
              rows={6}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/30"
              placeholder="Paste the JD or key responsibilities you want to target"
            />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="text-[12px] text-[var(--muted)] flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Outputs: ATS, Match, missing keywords, smart sentences, skill gap tasks
            </div>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] text-[14px] font-medium text-[var(--foreground)] px-4 py-2 rounded-lg hover:bg-[var(--surface)]">
                <FileText className="w-4 h-4" />
                Analyze ATS
              </button>
              <button className="inline-flex items-center gap-2 bg-[var(--accent-2)] hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-[14px] font-medium transition-colors shadow-sm">
                <Target className="w-4 h-4" />
                Tailor now
              </button>
            </div>
          </div>
        </div>

        <div className="surface-panel p-6 rounded-xl shadow-sm space-y-3">
          <h2 className="text-[16px] font-semibold text-[var(--foreground)]">Result snapshot</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
              <p className="text-[12px] text-[var(--muted)]">ATS score</p>
              <p className="text-[28px] font-semibold text-[var(--foreground)] mt-1">91</p>
              <p className="text-[12px] text-emerald-600 mt-1">+4 vs last resume</p>
            </div>
            <div className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
              <p className="text-[12px] text-[var(--muted)]">Job match</p>
              <p className="text-[28px] font-semibold text-[var(--foreground)] mt-1">85</p>
              <p className="text-[12px] text-indigo-600 mt-1">After tailoring</p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
            <p className="text-[12px] text-[var(--muted)] mb-2">Missing keywords</p>
            <div className="flex flex-wrap gap-2">
              {missingKeywords.map((kw) => (
                <span key={kw} className="text-[12px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-100">{kw}</span>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
            <p className="text-[12px] text-[var(--muted)]">Skill gap tasks</p>
            {gapTasks.map((task) => (
              <div key={task.title} className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--foreground)]">{task.title}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]">{task.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Smart sentences + guidance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 surface-panel p-6 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[var(--foreground)]">Smart sentences (turn weak lines into strong ones)</h2>
            <span className="text-[12px] text-[var(--muted)] flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              ATS friendly
            </span>
          </div>
          <div className="space-y-3">
            {smartSentences.map((item, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
                <p className="text-[12px] text-[var(--muted)]">Weak</p>
                <p className="text-[14px] text-[var(--foreground)]">{item.weak}</p>
                <div className="h-px bg-[var(--border)] my-3" />
                <p className="text-[12px] text-[var(--muted)]">Stronger</p>
                <p className="text-[14px] text-[var(--foreground)] font-medium">{item.strong}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-panel p-6 rounded-xl shadow-sm space-y-3">
          <h3 className="text-[14px] font-semibold text-[var(--foreground)]">Tailoring checklist</h3>
          <ul className="space-y-2 text-[12px] text-[var(--muted)]">
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Mirror JD keywords in summary + top 3 bullets.</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Add metrics to first two experience bullets.</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Keep length to 1 page unless &gt;8 yrs experience.</li>
            <li className="flex gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" /> Remove generic soft skills; replace with outcomes.</li>
          </ul>
          <button className="inline-flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] text-[14px] font-medium text-[var(--foreground)] px-4 py-2 rounded-lg hover:bg-[var(--surface)]">
            <Lightbulb className="w-4 h-4" />
            Generate tailored bullet points
          </button>
        </div>
      </div>
    </div>
  );
}

