"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Upload,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Download,
  Edit,
  Loader2
} from "lucide-react";
import api from "@/services/api";

type ResumeSectionInput = {
  section_type: string;
  content: string;
};

type ResumeResponse = {
  id: number;
  title: string;
  ats_score: number;
  file_path?: string | null;
  parsed_content?: string | null;
  sections: { id: number; section_type: string; content: string; order?: number | null }[];
  updated?: string;
};

const SECTION_PRESETS: { key: string; label: string; hint: string }[] = [
  { key: "Professional Summary", label: "Professional Summary", hint: "Brief overview of strengths" },
  { key: "Career Objective", label: "Career Objective", hint: "Your career goals" },
  { key: "Education", label: "Education", hint: "Degrees and institutions" },
  { key: "Professional Experience", label: "Professional Experience", hint: "Roles, impact, achievements" },
  { key: "Leadership", label: "Leadership", hint: "Leadership roles" },
  { key: "Projects", label: "Projects", hint: "Notable projects and tech" },
  { key: "Research", label: "Research", hint: "Papers, theses" },
  { key: "Certifications", label: "Certifications", hint: "Certs and licenses" },
  { key: "Awards & Honors", label: "Awards & Honors", hint: "Recognition" },
  { key: "Publications", label: "Publications", hint: "Articles and books" },
  { key: "Skills", label: "Skills", hint: "Technical and professional skills" },
];

export default function ResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [title, setTitle] = useState("My Resume");
  const [sections, setSections] = useState<Record<string, ResumeSectionInput>>(() => {
    const initial: Record<string, ResumeSectionInput> = {};
    SECTION_PRESETS.forEach((s) => {
      initial[s.key] = { section_type: s.key, content: "" };
    });
    return initial;
  });

  const sectionList = useMemo(
    () =>
      SECTION_PRESETS.map((s, idx) => ({
        ...s,
        order: idx,
        content: sections[s.key]?.content ?? "",
      })),
    [sections]
  );

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    setHasToken(Boolean(token));

    const fetchResumes = async () => {
      if (!token) {
        setError("Sign in to view your resumes.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Using /resumes without trailing slash to match backend normalization
        const res = await api.get<ResumeResponse[]>("/resumes");
        setResumes(res.data);
      } catch (err: any) {
        console.error("Resumes fetch error:", err);
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          setError("Session expired. Please sign in again.");
          // Don't redirect automatically on mount to let user see the error
        } else {
          setError(err.response?.data?.detail || "Could not load resumes. Try again shortly.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, [router]); // Router as dependency to re-run if needed, but primarily runs on mount

  const handleCreate = async () => {
    if (!hasToken) {
      setError("Sign in to create resumes.");
      router.push("/login");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        sections: sectionList
          .filter((s) => (s.content || "").trim().length > 0)
          .map((s) => ({ section_type: s.key, content: s.content, order: s.order })),
      };
      const res = await api.post<ResumeResponse>("/resumes", payload);
      setResumes((prev) => [res.data, ...prev]);
      setTitle("My Resume");
      setSections((prev) => {
        const reset = { ...prev };
        Object.keys(reset).forEach((k) => (reset[k].content = ""));
        return reset;
      });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setError("Session expired. Please sign in again.");
        router.push("/login");
      } else {
        setError("Could not create resume. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-[var(--foreground)]">Resumes & ATS</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Manage your resume versions and optimize for ATS.</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="flex items-center gap-2 bg-[var(--accent-2)] hover:bg-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Create Resume
        </button>
      </div>

      {/* Form: title + sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 surface-panel p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[12px] text-[var(--muted)]">Resume Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[14px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/30"
              placeholder="e.g., Frontend Resume"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sectionList.map((section) => (
              <div key={section.key} className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-semibold text-[var(--foreground)]">{section.label}</p>
                    <p className="text-[12px] text-[var(--muted)]">{section.hint}</p>
                  </div>
                  <span className="text-[10px] text-[var(--muted)]">Optional</span>
                </div>
                <textarea
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]/30 min-h-[110px]"
                  placeholder={`Add ${section.label}`}
                  value={section.content}
                  onChange={(e) =>
                    setSections((prev) => ({
                      ...prev,
                      [section.key]: { section_type: section.key, content: e.target.value },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-5 rounded-xl surface-panel flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[var(--foreground)]">{resumes[0]?.ats_score ?? 0}</p>
              <p className="text-xs text-[var(--muted)]">Highest ATS Score</p>
            </div>
          </div>
          <div className="p-5 rounded-xl surface-panel flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[var(--foreground)]">{resumes.length}</p>
              <p className="text-xs text-[var(--muted)]">Saved Resumes</p>
            </div>
          </div>
          <div className="p-5 rounded-xl surface-panel flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[var(--foreground)]">+ Tailored</p>
              <p className="text-xs text-[var(--muted)]">Track improvements</p>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Resume List */}
      <div className="grid grid-cols-1 gap-4">
        {loading && (
          <div className="p-4 rounded-lg surface-panel text-sm text-[var(--muted)]">Loading resumes…</div>
        )}
        {!loading && resumes.length === 0 && (
          <div className="p-4 rounded-lg surface-panel text-sm text-[var(--muted)]">No resumes yet. Add content and hit Create Resume.</div>
        )}
        {resumes.map((resume) => (
          <div
            key={resume.id}
            className="group flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-xl surface-panel hover:border-[var(--accent-2)]/20 transition-all shadow-sm"
          >
            <div className="flex items-start gap-4 mb-4 md:mb-0">
              <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-medium text-[var(--foreground)]">{resume.title}</h3>
                <p className="text-[12px] text-[var(--muted)]">Sections: {resume.sections?.length ?? 0}</p>
              </div>
            </div>

            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-sm font-bold text-indigo-600">{resume.ats_score ?? 0}/100</span>
                  <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-500/10 border-emerald-500/30 text-emerald-600">
                    Draft
                  </span>
                </div>
                <p className="text-[10px] text-[var(--muted)] mt-1">ATS Compatibility Score</p>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] rounded-lg transition-colors border border-[var(--border)]" title="Download">
                  <Download className="w-4 h-4" />
                </button>
                <button className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] rounded-lg transition-colors border border-[var(--border)]" title="Edit">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="px-4 py-2 bg-[var(--accent-2)] hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm">
                  Scan Again
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
