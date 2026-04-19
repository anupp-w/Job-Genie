"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

import {
  FileText,
  Target,
  Sparkles,
  ArrowRight,
  Wand2,
  MessageCircle,
  GraduationCap,
  TrendingUp,
  Clock,
  Zap,

  BookOpen,
  Loader2,
  Plus,
  AlertCircle,
} from "lucide-react";
import api from "@/services/api";

/* ─── Types ─── */
interface ResumeData {
  id: number;
  title: string;
  ats_score: number;
  updated: string | null;
  sections: any[];
}

interface AnalysisData {
  id: number;
  resume_id: number;
  job_id: number;
  resume_title: string;
  job_title: string;
  job_description_preview: string;
  match_percentage: number;
  skills_matched: number;
  skills_gap: number;
  created_at: string | null;
}

interface InterviewData {
  id: number;
  job_title: string;
  status: string;
  created_at: string | null;
}

interface ActivityItem {
  id: string;
  type: "resume" | "analysis" | "interview";
  title: string;
  subtitle: string;
  timestamp: string | null;
  score?: number;
  icon: typeof FileText;
  color: string;
  bgColor: string;
  href: string;
}

/* ─── Animated Counter Hook ─── */
function useAnimatedNumber(target: number, duration = 1200) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);
  return current;
}

/* ─── SVG Progress Ring ─── */
function ProgressRing({
  value,
  max = 100,
  size = 80,
  strokeWidth = 6,
  color = "#6366f1",
  bgColor = "rgba(99, 102, 241, 0.1)",
  label,
  sublabel,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  label?: string;
  sublabel?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(value / max, 1);
  const [animatedOffset, setAnimatedOffset] = useState(circumference);
  const displayValue = useAnimatedNumber(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedOffset(circumference * (1 - percentage));
    }, 100);
    return () => clearTimeout(timer);
  }, [circumference, percentage]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={bgColor}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={animatedOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[18px] font-bold text-[var(--foreground)]">{displayValue}</span>
        </div>
      </div>
      {label && <p className="text-[12px] font-semibold text-[var(--foreground)]">{label}</p>}
      {sublabel && <p className="text-[11px] text-[var(--muted)]">{sublabel}</p>}
    </div>
  );
}

/* ─── Time helpers ─── */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ─── Main Dashboard ─── */
export default function DashboardPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("there");
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisData[]>([]);
  const [interviews, setInterviews] = useState<InterviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load user name from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const firstName = (parsed.full_name || "").split(" ")[0];
        if (firstName) setUserName(firstName);
      } catch {}
    }
  }, []);

  // Fetch all dashboard data in parallel
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [resumeRes, analysisRes, interviewRes] = await Promise.allSettled([
        api.get("/resumes"),
        api.get("/analysis/history"),
        api.get("/interviews/"),
      ]);

      if (resumeRes.status === "fulfilled") setResumes(resumeRes.value.data || []);
      if (analysisRes.status === "fulfilled") setAnalyses(analysisRes.value.data || []);
      if (interviewRes.status === "fulfilled") setInterviews(interviewRes.value.data || []);
    } catch (err) {
      setError("Could not load dashboard data. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  /* ─── Derived stats ─── */
  const resumeCount = resumes.length;
  const bestAtsScore = resumes.reduce((max, r) => Math.max(max, r.ats_score || 0), 0);
  const latestMatchPct = analyses.length > 0 ? analyses[0].match_percentage : 0;
  const totalGaps = analyses.length > 0 ? analyses[0].skills_gap : 0;
  const completedInterviews = interviews.filter((i) => i.status === "completed").length;



  /* ─── Unified activity feed ─── */
  const activityFeed: ActivityItem[] = [
    ...resumes.slice(0, 5).map((r) => ({
      id: `resume-${r.id}`,
      type: "resume" as const,
      title: r.title || "Untitled Resume",
      subtitle: `ATS Score: ${r.ats_score || 0}`,
      timestamp: r.updated,
      score: r.ats_score,
      icon: FileText,
      color: "#6366f1",
      bgColor: "rgba(99, 102, 241, 0.1)",
      href: "/dashboard/resumes",
    })),
    ...analyses.slice(0, 5).map((a) => ({
      id: `analysis-${a.id}`,
      type: "analysis" as const,
      title: `Skill Gap Analysis`,
      subtitle: `${a.match_percentage}% match · ${a.skills_gap} gaps`,
      timestamp: a.created_at,
      score: a.match_percentage,
      icon: Target,
      color: "#10b981",
      bgColor: "rgba(16, 185, 129, 0.1)",
      href: "/dashboard/learning",
    })),
    ...interviews.slice(0, 5).map((i) => ({
      id: `interview-${i.id}`,
      type: "interview" as const,
      title: i.job_title || "Mock Interview",
      subtitle: i.status === "completed" ? "Completed" : "In progress",
      timestamp: i.created_at,
      icon: MessageCircle,
      color: "#f59e0b",
      bgColor: "rgba(245, 158, 11, 0.1)",
      href:
        i.status === "completed"
          ? `/dashboard/interviews/${i.id}/results`
          : `/dashboard/interviews/${i.id}`,
    })),
  ]
    .sort((a, b) => {
      if (!a.timestamp && !b.timestamp) return 0;
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    })
    .slice(0, 8);

  /* ─── Quick actions ─── */
  const quickActions = [
    {
      title: "Build Resume",
      desc: "Start from scratch or upload a PDF",
      icon: FileText,
      href: "/dashboard/resumes",
      gradient: "from-indigo-500 to-violet-500",
    },
    {
      title: "Tailor to JD",
      desc: "Match your resume to a job posting",
      icon: Target,
      href: "/dashboard/jobs",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      title: "Skill Gap Analysis",
      desc: "Find & fix skill gaps with a roadmap",
      icon: GraduationCap,
      href: "/dashboard/learning",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      title: "Mock Interview",
      desc: "10 AI-generated questions scored live",
      icon: MessageCircle,
      href: "/dashboard/interviews",
      gradient: "from-rose-500 to-pink-500",
    },
  ];

  /* ─── Dynamic subtitle ─── */
  const getSubtitle = () => {
    const parts: string[] = [];
    if (resumeCount > 0) parts.push(`${resumeCount} resume${resumeCount > 1 ? "s" : ""}`);
    if (analyses.length > 0) parts.push(`${analyses.length} analys${analyses.length > 1 ? "es" : "is"}`);
    if (completedInterviews > 0) parts.push(`${completedInterviews} interview${completedInterviews > 1 ? "s" : ""}`);
    if (parts.length === 0) return "Start by building your first resume or uploading a PDF.";
    return `You have ${parts.join(", ")}. Keep the momentum going!`;
  };

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-2)]" />
          <p className="text-[var(--muted)] text-sm font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  const hasData = resumeCount > 0 || analyses.length > 0 || interviews.length > 0;

  return (
    <div className="space-y-8">
      {/* ─── Gradient accent bar ─── */}
      <div className="h-1 w-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 opacity-60" />

      {/* ─── Personalized Header ─── */}
      <header
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{ animation: "fadeInUp 0.5s ease-out" }}
      >
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[var(--foreground)]">
            {getGreeting()}, {userName} 👋
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1.5 max-w-xl">{getSubtitle()}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/resumes")}
            className="inline-flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] text-[14px] font-medium text-[var(--foreground)] px-4 py-2.5 rounded-xl hover:bg-[var(--surface)] hover:border-[var(--accent-2)]/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            New resume
          </button>
          <button
            onClick={() => router.push("/dashboard/learning")}
            className="inline-flex items-center gap-2 bg-[var(--accent-2)] hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            Run analysis
          </button>
        </div>
      </header>

      {/* ─── Quick Actions ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              onClick={() => router.push(item.href)}
              className="group p-5 rounded-2xl surface-panel shadow-sm text-left hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              style={{ animation: `fadeInUp 0.4s ease-out ${idx * 80}ms both` }}
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-[14px] font-semibold text-[var(--foreground)] mb-1">{item.title}</h3>
              <p className="text-[12px] text-[var(--muted)] leading-relaxed">{item.desc}</p>
              <div className="mt-3 flex items-center gap-1 text-[12px] font-medium text-[var(--accent-2)] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Go <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── Stats + Chart Row ─── */}
      {hasData ? (
        <div
          className="grid grid-cols-1 gap-6"
          style={{ animation: "fadeInUp 0.5s ease-out 0.3s both" }}
        >
          {/* Score rings */}
          <div className="surface-panel rounded-2xl shadow-sm p-6">
            <h2 className="text-[14px] font-semibold text-[var(--foreground)] mb-1">Your Scores</h2>
            <p className="text-[12px] text-[var(--muted)] mb-6">Based on your latest data</p>

            <div className="grid grid-cols-3 gap-2">
              <ProgressRing
                value={bestAtsScore}
                color="#6366f1"
                bgColor="rgba(99, 102, 241, 0.1)"
                label="ATS"
                sublabel="Best score"
              />
              <ProgressRing
                value={latestMatchPct}
                color="#10b981"
                bgColor="rgba(16, 185, 129, 0.1)"
                label="Match"
                sublabel="Latest"
              />
              <ProgressRing
                value={totalGaps}
                max={Math.max(totalGaps + (analyses[0]?.skills_matched || 0), 1)}
                color="#f59e0b"
                bgColor="rgba(245, 158, 11, 0.1)"
                label="Gaps"
                sublabel="To close"
                size={80}
                strokeWidth={6}
              />
            </div>

            {/* Quick stat pills */}
            <div className="mt-6 pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-[12px]">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[var(--muted)]">Resumes:</span>
                <span className="font-semibold text-[var(--foreground)]">{resumeCount}</span>
              </div>
              <div className="flex items-center gap-2 text-[12px]">
                <MessageCircle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[var(--muted)]">Interviews:</span>
                <span className="font-semibold text-[var(--foreground)]">{completedInterviews}</span>
              </div>
              <div className="flex items-center gap-2 text-[12px]">
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[var(--muted)]">Analyses:</span>
                <span className="font-semibold text-[var(--foreground)]">{analyses.length}</span>
              </div>
              <div className="flex items-center gap-2 text-[12px]">
                <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-[var(--muted)]">Best ATS:</span>
                <span className="font-semibold text-[var(--foreground)]">{bestAtsScore}</span>
              </div>
            </div>
          </div>


        </div>
      ) : (
        /* ─── Empty state hero ─── */
        <div
          className="surface-panel rounded-2xl shadow-sm p-12 flex flex-col items-center text-center"
          style={{ animation: "fadeInUp 0.5s ease-out 0.2s both" }}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-5">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-[20px] font-bold text-[var(--foreground)] mb-2">
            Welcome to Job Genie!
          </h2>
          <p className="text-[14px] text-[var(--muted)] mb-6 max-w-md">
            Build ATS-optimized resumes, analyze skill gaps, tailor to job descriptions, and practice
            with AI mock interviews. Start with any of the actions above.
          </p>
          <button
            onClick={() => router.push("/dashboard/resumes")}
            className="inline-flex items-center gap-2 bg-[var(--accent-2)] hover:bg-indigo-500 text-white px-6 py-3 rounded-xl text-[14px] font-semibold transition-all shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          >
            <FileText className="w-4 h-4" />
            Create your first resume
          </button>
        </div>
      )}

      {/* ─── Activity Feed ─── */}
      <div style={{ animation: "fadeInUp 0.5s ease-out 0.4s both" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--foreground)]">Recent Activity</h2>
            <p className="text-[12px] text-[var(--muted)] mt-0.5">Your latest actions across all features</p>
          </div>
        </div>

        {activityFeed.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activityFeed.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.href)}
                  className="group flex items-center gap-4 p-4 rounded-xl surface-panel shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left w-full cursor-pointer"
                  style={{ animation: `fadeInUp 0.3s ease-out ${idx * 60}ms both` }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: item.bgColor }}
                  >
                    <Icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--foreground)] truncate group-hover:text-[var(--accent-2)] transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[12px] text-[var(--muted)] truncate">{item.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.timestamp && (
                      <span className="text-[11px] text-[var(--muted)] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(item.timestamp)}
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-[var(--muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="surface-panel rounded-2xl shadow-sm p-8 flex flex-col items-center">
            <Clock className="w-6 h-6 text-[var(--muted)] mb-2 opacity-40" />
            <p className="text-[13px] text-[var(--muted)]">
              No activity yet. Create a resume or run an analysis to get started.
            </p>
          </div>
        )}
      </div>

      {/* ─── Bottom quick links ─── */}
      {hasData && (
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          style={{ animation: "fadeInUp 0.5s ease-out 0.5s both" }}
        >
          <button
            onClick={() => router.push("/dashboard/jobs")}
            className="group surface-panel rounded-2xl shadow-sm p-5 flex items-start gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Wand2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--foreground)] mb-1 group-hover:text-emerald-600 transition-colors">
                Tailor to a JD
              </h3>
              <p className="text-[12px] text-[var(--muted)] leading-relaxed">
                Paste a job description and get keyword suggestions, rewrites, and ATS improvements.
              </p>
            </div>
          </button>

          <button
            onClick={() => router.push("/dashboard/learning")}
            className="group surface-panel rounded-2xl shadow-sm p-5 flex items-start gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--foreground)] mb-1 group-hover:text-amber-600 transition-colors">
                Skill Roadmap
              </h3>
              <p className="text-[12px] text-[var(--muted)] leading-relaxed">
                Upload a resume + JD to get a personalized learning roadmap for missing skills.
              </p>
            </div>
          </button>

          <button
            onClick={() => router.push("/dashboard/interviews")}
            className="group surface-panel rounded-2xl shadow-sm p-5 flex items-start gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <MessageCircle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--foreground)] mb-1 group-hover:text-rose-600 transition-colors">
                Practice Interview
              </h3>
              <p className="text-[12px] text-[var(--muted)] leading-relaxed">
                10 AI questions (behavioral + technical) calibrated to your target role, scored live.
              </p>
            </div>
          </button>
        </div>
      )}

      {/* ─── CSS Animations ─── */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
