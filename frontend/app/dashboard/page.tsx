"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Upload,
  FileText,
  Target,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Wand2,
  BookOpen,
  MessageCircle,
  ClipboardList,
} from "lucide-react";

const scoreHistory = [
  { name: "Mon", ats: 72, match: 64 },
  { name: "Tue", ats: 78, match: 71 },
  { name: "Wed", ats: 83, match: 77 },
  { name: "Thu", ats: 86, match: 79 },
  { name: "Fri", ats: 88, match: 82 },
];

const recentAnalyses = [
  { id: 1, resume: "Product Resume", jd: "PM, growth focus", ats: 88, match: 82, tailored: true, updated: "Today" },
  { id: 2, resume: "Frontend Resume", jd: "React/Next role", ats: 91, match: 85, tailored: true, updated: "Yesterday" },
  { id: 3, resume: "Data Resume", jd: "ML infra role", ats: 76, match: 69, tailored: false, updated: "Feb 22" },
];

const gaps = [
  { id: 1, skill: "System design", impact: "High", status: "Not started" },
  { id: 2, skill: "React performance", impact: "Medium", status: "In progress" },
  { id: 3, skill: "SQL window funcs", impact: "Medium", status: "Not started" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-[var(--foreground)]">Job Genie Workspace</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Upload or create resumes, tailor to a JD, analyze ATS + match, and spin up a mock interview.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] text-[14px] font-medium text-[var(--foreground)] px-4 py-2 rounded-lg hover:bg-[var(--surface)] transition-colors">
            <Upload className="w-4 h-4" />
            Upload resume
          </button>
          <button className="inline-flex items-center gap-2 bg-[var(--accent-2)] hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-[14px] font-medium transition-colors shadow-sm">
            <Sparkles className="w-4 h-4" />
            Use template
          </button>
        </div>
      </header>

      {/* Quick steps */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { title: "1. Add resume", desc: "Upload PDF or start with a template", icon: FileText },
          { title: "2. Add JD (optional)", desc: "Paste the description you’re targeting", icon: ClipboardList },
          { title: "3. Tailor + skill gap", desc: "See ATS, match, missing keywords, roadmap", icon: Target },
          { title: "4. Mock interview", desc: "10 Qs (6 behavioral, 4 technical) + score", icon: MessageCircle },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="p-4 rounded-xl surface-panel shadow-sm flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
                <Icon className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[14px] font-semibold text-[var(--foreground)]">{item.title}</h3>
                <p className="text-[12px] text-[var(--muted)] leading-snug">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats + readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl surface-panel shadow-sm">
              <p className="text-[12px] text-[var(--muted)]">Best ATS score</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-[32px] font-semibold text-[var(--foreground)]">91</span>
                <span className="text-[12px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">+4 vs last run</span>
              </div>
              <p className="text-[12px] text-[var(--muted)] mt-2">Based on your latest tailored resume</p>
            </div>
            <div className="p-4 rounded-xl surface-panel shadow-sm">
              <p className="text-[12px] text-[var(--muted)]">Job match (with JD)</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-[32px] font-semibold text-[var(--foreground)]">85</span>
                <span className="text-[12px] text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full">+7 after tailoring</span>
              </div>
              <p className="text-[12px] text-[var(--muted)] mt-2">Improve by adding missing keywords</p>
            </div>
            <div className="p-4 rounded-xl surface-panel shadow-sm">
              <p className="text-[12px] text-[var(--muted)]">Skill gap tasks</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-[32px] font-semibold text-[var(--foreground)]">3</span>
                <span className="text-[12px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">priority</span>
              </div>
              <p className="text-[12px] text-[var(--muted)] mt-2">Roadmap from your JD analysis</p>
            </div>
          </div>

          <div className="p-6 rounded-xl surface-panel shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold text-[var(--foreground)]">ATS + match trend</h2>
              <span className="text-[12px] text-[var(--muted)]">Last 5 runs</span>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreHistory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    labelStyle={{ color: '#0f172a' }}
                  />
                  <Bar dataKey="ats" name="ATS" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={22} />
                  <Bar dataKey="match" name="Match" fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-6 rounded-xl surface-panel shadow-sm">
            <h2 className="text-[16px] font-semibold text-[var(--foreground)] mb-3">Skill gap & roadmap</h2>
            <div className="space-y-3">
              {gaps.map((gap) => (
                <div key={gap.id} className="flex items-start justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-[var(--foreground)]">{gap.skill}</p>
                    <p className="text-[12px] text-[var(--muted)]">Impact: {gap.impact}</p>
                  </div>
                  <span className="text-[12px] px-2 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)]">{gap.status}</span>
                </div>
              ))}
            </div>
            <button className="mt-4 inline-flex items-center gap-2 text-[14px] font-medium text-[var(--accent-2)] hover:text-indigo-500">
              <Wand2 className="w-4 h-4" />
              Generate roadmap from latest JD
            </button>
          </div>

          <div className="p-6 rounded-xl surface-panel shadow-sm">
            <h2 className="text-[16px] font-semibold text-[var(--foreground)] mb-3">Ready for mock?</h2>
            <p className="text-[12px] text-[var(--muted)] mb-3">Uses your tailored resume context. 10 questions (6 behavioral / 4 technical) + score + best-fit answers.</p>
            <button className="inline-flex items-center gap-2 bg-[var(--accent-2)] hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-[14px] font-medium transition-colors shadow-sm">
              <MessageCircle className="w-4 h-4" />
              Start interview
            </button>
          </div>
        </div>
      </div>

      {/* Recent analyses table */}
      <div className="rounded-xl surface-panel shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-[var(--foreground)]">Recent ATS + JD analyses</h2>
          <button className="text-[12px] text-[var(--muted)] hover:text-[var(--foreground)] inline-flex items-center gap-1">
            <ArrowRight className="w-4 h-4" />
            View history
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-2)] text-[var(--muted)]">
              <tr>
                <th className="px-6 py-3 font-medium">Resume</th>
                <th className="px-6 py-3 font-medium">Job description</th>
                <th className="px-6 py-3 font-medium">ATS</th>
                <th className="px-6 py-3 font-medium">Match</th>
                <th className="px-6 py-3 font-medium">Tailored</th>
                <th className="px-6 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {recentAnalyses.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="px-6 py-4 text-[var(--foreground)] font-medium">{item.resume}</td>
                  <td className="px-6 py-4 text-[var(--muted)]">{item.jd}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${item.ats}%` }} />
                      </div>
                      <span className="text-[12px] font-medium text-[var(--foreground)]/80">{item.ats}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${item.match}%` }} />
                      </div>
                      <span className="text-[12px] font-medium text-[var(--foreground)]/80">{item.match}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ${item.tailored ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                      {item.tailored ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {item.tailored ? "Tailored" : "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[var(--muted)]">{item.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
