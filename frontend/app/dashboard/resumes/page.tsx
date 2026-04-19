"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
   FileText,
   Upload,
   Download,
   Loader2,
   Plus,
   Trash2,
   ArrowLeft,
   Sparkles,
   Linkedin,
   Github,
   User,
   Briefcase,
   GraduationCap,
   Award,
   BookOpen,
   AlignLeft,
   ChevronRight,
   ChevronLeft,
   ChevronUp,
   ChevronDown,
   Target,
   Users,
   FlaskConical,
   Trophy,
   Code,
   Mail,
   Phone,
   Edit2,
   Lock,
   Check,
   BarChart3,
   Calendar,
   Eye,
   X
} from "lucide-react";
import api from "@/services/api";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { analyzeResume, type ResumeAnalysisResult } from "@/lib/resume-analyzer";

type ResumeResponse = {
   id: number;
   title: string;
   ats_score: number;
   file_path?: string | null;
   parsed_content?: string | null;
   sections: { id: number; section_type: string; content: string; order?: number | null }[];
   updated?: string;
};

// --- Helper: Ensure a URL has a protocol prefix ---
function ensureUrl(url: string, type?: "linkedin" | "github"): string {
   if (!url || !url.trim()) return url;
   const trimmed = url.trim();
   if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
   if (trimmed.startsWith("mailto:")) return trimmed;
   // Handle bare usernames like "anupw" -> full URL
   if (!trimmed.includes(".") && !trimmed.includes("/")) {
      if (type === "linkedin") return `https://linkedin.com/in/${trimmed}`;
      if (type === "github") return `https://github.com/${trimmed}`;
   }
   return `https://${trimmed}`;
}

// --- Helper: Normalize any parsed/loaded resume data to match ResumeData shape ---
function normalizeResumeData(data: any): any {
   const defaultData = {
      title: "Untitled Resume",
      personal: { firstName: "", lastName: "", phone: "", email: "", linkedin: "", github: "", website: "" },
      summary: "",
      objective: "",
      experience: [],
      projects: [],
      education: [],
      skills: [{ name: "Technical Skills", skills: [] }, { name: "Soft Skills", skills: [] }],
      certifications: [],
      leadership: [],
      research: [],
      awards: [],
      publications: []
   };

   if (!data || typeof data !== "object") return defaultData;

   // Normalize personal — handle missing or flattened personal object
   const rawPersonal = data.personal || {};
   const personal = {
      firstName: rawPersonal.firstName || rawPersonal.first_name || "",
      lastName: rawPersonal.lastName || rawPersonal.last_name || "",
      phone: rawPersonal.phone || "",
      email: rawPersonal.email || "",
      linkedin: rawPersonal.linkedin || "",
      github: rawPersonal.github || "",
      website: rawPersonal.website || "",
   };

   // Normalize skills — backend uses {category, items}, builder uses {name, skills}
   let skills = defaultData.skills;
   if (Array.isArray(data.skills)) {
      skills = data.skills.map((cat: any) => ({
         name: cat.name || cat.category || "Skills",
         skills: Array.isArray(cat.skills) ? cat.skills : (Array.isArray(cat.items) ? cat.items : []),
      }));
      if (skills.length === 0) skills = defaultData.skills;
   } else if (data.skills && typeof data.skills === "object" && !Array.isArray(data.skills)) {
      // Handle {technical: "...", soft: "..."} format
      skills = Object.entries(data.skills).map(([key, val]: [string, any]) => ({
         name: key.charAt(0).toUpperCase() + key.slice(1) + " Skills",
         skills: typeof val === "string" ? val.split(",").map((s: string) => s.trim()).filter(Boolean) : (Array.isArray(val) ? val : []),
      }));
   }

   // Normalize certifications — handle missing url field
   const certifications = Array.isArray(data.certifications)
      ? data.certifications.map((c: any) => ({ ...c, url: c.url || "" }))
      : [];

   return {
      ...defaultData,
      ...data,
      personal,
      skills,
      certifications,
      experience: Array.isArray(data.experience) ? data.experience : [],
      projects: Array.isArray(data.projects) ? data.projects : [],
      education: Array.isArray(data.education) ? data.education : [],
      leadership: Array.isArray(data.leadership) ? data.leadership : [],
      research: Array.isArray(data.research) ? data.research : [],
      awards: Array.isArray(data.awards) ? data.awards : [],
      publications: Array.isArray(data.publications) ? data.publications : [],
   };
}

export default function ResumesPage() {
   const router = useRouter();
   const [resumes, setResumes] = useState<ResumeResponse[]>([]);
   const [loading, setLoading] = useState(false);
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [hasToken, setHasToken] = useState(false);
   const [viewMode, setViewMode] = useState<"landing" | "builder">("landing");

   // AI Tailoring State
   const [showTailorModal, setShowTailorModal] = useState(false);
   const [showTailorReport, setShowTailorReport] = useState(false);
   const [jdInput, setJdInput] = useState("");
   const [isTailoring, setIsTailoring] = useState(false);
   const [matchScore, setMatchScore] = useState<number | null>(null);
   const [explanation, setExplanation] = useState<string | null>(null);
   const [tailorChanges, setTailorChanges] = useState<string[]>([]);
   const [tailorMissing, setTailorMissing] = useState<string[]>([]);
   const [tailorMatched, setTailorMatched] = useState<string[]>([]);

   // Analysis State
   const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
   const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisResult | null>(null);
   const [analysisJd, setAnalysisJd] = useState("");
   const [isDownloading, setIsDownloading] = useState(false);
   const [isParsing, setIsParsing] = useState(false);

   // Preview Scaling
   const previewContainerRef = useRef<HTMLDivElement>(null);
   const previewRef = useRef<HTMLDivElement>(null);
   const [previewScale, setPreviewScale] = useState(0.55);

   // Types for Resume Data
   type Experience = {
      role: string;
      company: string;
      location: string;
      startDate: string;
      endDate: string;
      current: boolean;
      description: string
   };
   type Project = {
      name: string;
      tech: string;
      description: string;
      url: string;
      startDate: string;
      endDate: string;
      current: boolean;
   };
   type Education = {
      school: string;
      location: string;
      degree: string;
      minor: string;
      gpa: string;
      startDate: string;
      endDate: string;
   };
   type Certification = {
      name: string;
      issuer: string;
      dateObtained: string;
      expirationDate: string;
      credentialId: string;
      url: string;
   };
   type SkillCategory = {
      name: string;
      skills: string[];
   };

   type ResumeData = {
      title: string;
      personal: {
         firstName: string;
         lastName: string;
         phone: string;
         email: string;
         linkedin: string;
         github: string;
         website: string;
      };
      summary: string;
      objective: string;
      experience: Experience[];
      projects: Project[];
      education: Education[];
      skills: SkillCategory[];
      certifications: Certification[];
      leadership: Experience[]; // Reuse Experience type
      research: Project[]; // Reuse Project or similar
      awards: { title: string; issuer: string; date: string; description: string }[];
      publications: { title: string; publisher: string; date: string; url: string; description: string }[];
   };

   // Structured Resume State (Starting Empty)
   const [activeSection, setActiveSection] = useState<string>("personal");
   const [editingSection, setEditingSection] = useState<string | null>(null);
   const [enabledSections, setEnabledSections] = useState<string[]>(["personal", "summary", "experience", "projects", "education", "skills"]);
   const [showAddSectionModal, setShowAddSectionModal] = useState(false);
   const [resumeData, setResumeData] = useState<ResumeData>({
      title: "Untitled Resume",
      personal: { firstName: "", lastName: "", phone: "", email: "", linkedin: "", github: "", website: "" },
      summary: "",
      objective: "",
      experience: [],
      projects: [],
      education: [],
      skills: [
         { name: "Technical Skills", skills: [] },
         { name: "Soft Skills", skills: [] }
      ],
      certifications: [],
      leadership: [],
      research: [],
      awards: [],
      publications: []
   });

   const allSections = [
      { id: "personal", label: "Personal Info", icon: User, description: "Basic contact details", required: true },
      { id: "summary", label: "Professional Summary", icon: AlignLeft, description: "Brief overview of your experience" },
      { id: "objective", label: "Career Objective", icon: Target, description: "Your career goals" },
      { id: "experience", label: "Professional Experience", icon: Briefcase, description: "Work history and achievements" },
      { id: "education", label: "Education", icon: GraduationCap, description: "Degrees and certifications" },
      { id: "projects", label: "Projects", icon: Code, description: "Personal and professional work" },
      { id: "skills", label: "Skills", icon: Sparkles, description: "Technical and soft skills" },
      { id: "certifications", label: "Certifications", icon: Award, description: "Licenses and certificates" },
      { id: "leadership", label: "Leadership", icon: Users, description: "Roles in organizations" },
      { id: "research", label: "Research", icon: FlaskConical, description: "Publications and studies" },
      { id: "awards", label: "Awards & Honors", icon: Trophy, description: "Recognition and achievements" },
      { id: "publications", label: "Publications", icon: BookOpen, description: "Articles and books" },
   ];

   const toggleSection = (id: string) => {
      setEnabledSections(prev =>
         prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
      );
      setShowAddSectionModal(false);
      setActiveSection(id);
   };

   useEffect(() => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      setHasToken(Boolean(token));
      const fetchResumes = async () => {
         if (!token) return;
         setLoading(true);
         try {
            const res = await api.get<ResumeResponse[]>("/resumes");
            // Filter out analysis records and sort by date (newest first)
            const filtered = res.data
               .filter((r: ResumeResponse) => !r.title?.startsWith("Analysis -"))
               .sort((a: ResumeResponse, b: ResumeResponse) => {
                  const da = a.updated ? new Date(a.updated).getTime() : 0;
                  const db = b.updated ? new Date(b.updated).getTime() : 0;
                  return db - da;
               });
            setResumes(filtered);
         } catch (err: any) {
            console.error("Resumes fetch error:", err);
         } finally {
            setLoading(false);
         }
      };
      fetchResumes();
   }, []);

   const handleUpload = async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      try {
         setSaving(true);
         const response = await api.post("/resumes/parse", formData, {
            headers: { "Content-Type": "multipart/form-data" },
         });

         const parsedData = response.data?.parsed_data;
         if (parsedData) {
            const normalized = normalizeResumeData(parsedData);
            setResumeData(prev => ({
               ...prev,
               ...normalized,
               title: prev.title || normalized.title,
            }));
            alert("Resume parsed successfully! Please review the auto-filled data.");
         }
      } catch (error: any) {
         console.error("Upload error:", error);
         alert(error?.response?.data?.detail || "Failed to parse resume. Please try again.");
      } finally {
         setSaving(false);
      }
   };

   const handleSave = async () => {
      if (!hasToken) {
         setError("Please sign in to save.");
         return;
      }
      setSaving(true);
      try {
         const payload = {
            title: resumeData.title,
            sections: [
               { section_type: "structured_data", content: JSON.stringify(resumeData), order: 0 }
            ]
         };
         const res = await api.post<ResumeResponse>("/resumes", payload);
         setResumes(prev => [res.data, ...prev.filter(r => r.id !== res.data.id)]); // prevent dups visually
         alert("Resume saved successfully!");
      } catch (err: any) {
         setError("Failed to save resume.");
      } finally {
         setSaving(false);
      }
   };

   const loadResume = (res: ResumeResponse) => {
      try {
         const structSection = res.sections?.find((s: any) => s.section_type === "structured_data");
         let data = null;
         if (structSection && structSection.content) {
            data = JSON.parse(structSection.content);
         } else if (res.parsed_content) {
            data = JSON.parse(res.parsed_content);
         }

         if (data) {
            const normalized = normalizeResumeData(data);
            setResumeData({ ...normalized, title: res.title || normalized.title });
            setViewMode("builder");
         } else {
            alert("This resume has no editable data.");
         }
      } catch (err) {
         console.error("Failed to load resume data:", err);
         alert("Could not load the resume data.");
      }
   };

   const handleDelete = async (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      if (!confirm("Are you sure you want to delete this resume?")) return;
      try {
         await api.delete(`/resumes/${id}`);
         setResumes(prev => prev.filter(r => r.id !== id));
      } catch (err) {
         console.error("Failed to delete resume:", err);
         alert("Failed to delete the resume.");
      }
   };

   const handleTailor = async () => {
      if (!jdInput.trim()) return;
      setIsTailoring(true);
      setError(null);
      try {
         const res = await api.post("/tailor", {
            resume_data: resumeData,
            job_description: jdInput
         });
         setResumeData(normalizeResumeData(res.data.tailored_data));
         setMatchScore(res.data.match_score);
         setExplanation(res.data.explanation);
         setTailorChanges(res.data.changes || []);
         setTailorMissing(res.data.missing_skills || []);
         setTailorMatched(res.data.matched_skills || []);

         setShowTailorModal(false);
         setShowTailorReport(true);
      } catch (err: any) {
         console.error("Tailoring error:", err);
         setError("AI Tailoring failed. Please check your API key and try again.");
      } finally {
         setIsTailoring(false);
      }
   };

   const handleDownloadPDF = useCallback(async () => {
      const el = previewRef.current;
      if (!el) return;
      setIsDownloading(true);
      try {
         // Override lab() CSS variables to hex equivalents for html2canvas compatibility
         const root = document.documentElement;
         const overrides: Record<string, string> = {
            "--background": "#ffffff",
            "--foreground": "#0a0a0a",
            "--muted": "#f5f5f5",
            "--muted-foreground": "#737373",
            "--border": "#e5e5e5",
            "--ring": "#a1a1a1",
            "--primary": "#171717",
            "--primary-foreground": "#fafafa",
         };
         const originals: Record<string, string> = {};
         for (const [key, val] of Object.entries(overrides)) {
            originals[key] = root.style.getPropertyValue(key);
            root.style.setProperty(key, val);
         }

         const canvas = await html2canvas(el, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            windowWidth: 816,
            windowHeight: 1056,
         });

         // Restore original CSS variables
         for (const [key, val] of Object.entries(originals)) {
            if (val) root.style.setProperty(key, val);
            else root.style.removeProperty(key);
         }

         const imgData = canvas.toDataURL("image/png");
         const pdf = new jsPDF({ orientation: "portrait", unit: "in", format: "letter" });
         const pdfW = pdf.internal.pageSize.getWidth();
         const pdfH = pdf.internal.pageSize.getHeight();
         pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
         const fileName = (resumeData.title || "Resume").replace(/[^a-zA-Z0-9]/g, "_") + ".pdf";
         pdf.save(fileName);
      } catch (err) {
         console.error("PDF generation failed:", err);
         alert("PDF download failed. Please try again.");
      } finally {
         setIsDownloading(false);
      }
   }, [resumeData.title]);

   const handleRunAnalysis = () => {
      const result = analyzeResume(resumeData, analysisJd || undefined);
      setAnalysisResult(result);
   };

   // Preview scaling effect
   useEffect(() => {
      const container = previewContainerRef.current;
      if (!container) return;
      const observer = new ResizeObserver((entries) => {
         for (const entry of entries) {
            const containerW = entry.contentRect.width - 48; // subtract padding
            const resumeW = 816; // 8.5in
            const scale = Math.min(containerW / resumeW, 1);
            setPreviewScale(scale);
         }
      });
      observer.observe(container);
      return () => observer.disconnect();
   }, [viewMode]);

   const addExperience = () => {
      setResumeData(prev => ({
         ...prev,
         experience: [...prev.experience, { role: "", company: "", location: "", startDate: "", endDate: "", current: false, description: "" }]
      }));
   };

   const addProject = () => {
      setResumeData(prev => ({
         ...prev,
         projects: [...prev.projects, { name: "", tech: "", description: "", url: "", startDate: "", endDate: "", current: false }]
      }));
   };

   const addEducation = () => {
      setResumeData(prev => ({
         ...prev,
         education: [...prev.education, { school: "", location: "", degree: "", minor: "", gpa: "", startDate: "", endDate: "" }]
      }));
   };

   const addLeadership = () => {
      const newItem = { role: "", company: "", location: "", startDate: "", endDate: "", current: false, description: "" };
      setResumeData(prev => ({ ...prev, leadership: [...prev.leadership, newItem] }));
   };

   const addResearch = () => {
      const newItem = { name: "", tech: "", description: "", url: "", startDate: "", endDate: "", current: false };
      setResumeData(prev => ({ ...prev, research: [...prev.research, newItem] }));
   };

   const addAward = () => {
      const newItem = { title: "", issuer: "", date: "", description: "" };
      setResumeData(prev => ({ ...prev, awards: [...prev.awards, newItem] }));
   };

   const addPublication = () => {
      const newItem = { title: "", publisher: "", date: "", url: "", description: "" };
      setResumeData(prev => ({ ...prev, publications: [...prev.publications, newItem] }));
   };

   const addCertification = () => {
      const newItem = { name: "", issuer: "", dateObtained: "", expirationDate: "", credentialId: "" };
      setResumeData(prev => ({ ...prev, certifications: [...prev.certifications, newItem] }));
   };

   const addSkill = (categoryIdx: number, skill: string) => {
      if (!skill.trim()) return;
      const skillsArray = skill.split(',').map(s => s.trim()).filter(Boolean);
      setResumeData(prev => {
         const newSkills = [...prev.skills];
         newSkills[categoryIdx].skills = [...new Set([...newSkills[categoryIdx].skills, ...skillsArray])];
         return { ...prev, skills: newSkills };
      });
   };

   const removeSkill = (categoryIdx: number, skillIdx: number) => {
      setResumeData(prev => {
         const newSkills = [...prev.skills];
         newSkills[categoryIdx].skills = newSkills[categoryIdx].skills.filter((_, i) => i !== skillIdx);
         return { ...prev, skills: newSkills };
      });
   };

   const addSkillCategory = () => {
      setResumeData(prev => ({
         ...prev,
         skills: [...prev.skills, { name: "New Category", skills: [] }]
      }));
   };

   const updateNested = (section: keyof ResumeData, field: string, value: any) => {
      setResumeData(prev => ({
         ...prev,
         [section]: { ...prev[section] as any, [field]: value }
      }));
   };

   const updateListItem = (section: keyof ResumeData, index: number, field: string, value: any) => {
      setResumeData(prev => {
         const list = [...(prev[section] as any[])];
         list[index] = { ...list[index], [field]: value };
         return { ...prev, [section]: list };
      });
   };

   const removeListItem = (section: keyof ResumeData, index: number) => {
      setResumeData(prev => ({
         ...prev,
         [section]: (prev[section] as any[]).filter((_, i) => i !== index)
      }));
   };

   // --- Section reordering: move section up or down in the enabledSections list ---
   const moveSection = (id: string, direction: "up" | "down") => {
      setEnabledSections(prev => {
         const idx = prev.indexOf(id);
         if (idx === -1) return prev;
         const newIdx = direction === "up" ? idx - 1 : idx + 1;
         if (newIdx < 0 || newIdx >= prev.length) return prev;
         const updated = [...prev];
         [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
         return updated;
      });
   };

   // --- Item reordering: move an item up or down within a list section ---
   const moveItemInList = (section: keyof ResumeData, index: number, direction: "up" | "down") => {
      setResumeData(prev => {
         const arr = [...(prev[section] as any[])];
         const newIdx = direction === "up" ? index - 1 : index + 1;
         if (newIdx < 0 || newIdx >= arr.length) return prev;
         [arr[index], arr[newIdx]] = [arr[newIdx], arr[index]];
         return { ...prev, [section]: arr };
      });
   };

   if (viewMode === "landing") {
      return (
         <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start p-8 -mt-8 -mx-8">
            <div className="max-w-6xl w-full space-y-12 py-10">

               {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium flex items-center gap-3 border border-red-100">
                     <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <span className="font-bold text-red-600">!</span>
                     </div>
                     <div className="flex-1">
                        {error}
                     </div>
                     <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg">
                        <X className="w-4 h-4" />
                     </button>
                  </div>
               )}

               <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                  <div className="space-y-4">
                     <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-sm font-bold border border-indigo-100">
                        <Sparkles className="w-4 h-4" /> AI Powered Resume Engine
                     </div>
                     <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">My Resumes</h1>
                     <p className="text-lg text-slate-500 max-w-2xl">Manage your resumes, track their ATS scores, or build new tailored versions.</p>
                  </div>

                  <button
                     onClick={() => {
                        setResumeData({ title: "Untitled Resume", personal: { firstName: "", lastName: "", phone: "", email: "", linkedin: "", github: "", website: "" }, summary: "", objective: "", experience: [], projects: [], education: [], skills: [{ name: "Technical Skills", skills: [] }, { name: "Soft Skills", skills: [] }], certifications: [], leadership: [], research: [], awards: [], publications: [] });
                        setViewMode("builder");
                     }}
                     className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 transition-all cursor-pointer whitespace-nowrap"
                  >
                     <Plus className="w-5 h-5" /> Build from Scratch
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                  {/* Upload Quick Card */}
                  <div className="relative group p-8 bg-white border border-dashed border-slate-300 hover:border-purple-500 hover:bg-purple-50/50 rounded-3xl text-left transition-all hover:shadow-xl hover:shadow-purple-100/50 cursor-pointer flex flex-col justify-center min-h-[220px]">
                     {!isParsing && (
                        <input
                           type="file"
                           accept=".pdf"
                           onChange={async (e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                 const file = e.target.files[0];
                                 const formData = new FormData();
                                 formData.append("file", file);
                                 try {
                                    setIsParsing(true);
                                    setError(null);
                                    const res = await api.post("/resumes/parse", formData, {
                                       headers: { "Content-Type": "multipart/form-data" },
                                    });

                                    const parsedData = res.data?.parsed_data;
                                    if (parsedData) {
                                       const normalized = normalizeResumeData(parsedData);
                                       setResumeData(prev => ({ ...prev, ...normalized }));
                                    }
                                    setViewMode("builder");
                                 } catch (err: any) {
                                    setError(err.message || "Failed to parse resume");
                                 } finally {
                                    setIsParsing(false);
                                    // reset input so same file can be selected again if needed
                                    e.target.value = "";
                                 }
                              }
                           }}
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                           title="Upload PDF Resume"
                        />
                     )}
                     <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-purple-100 flex items-center justify-center mb-4 transition-colors">
                        {isParsing ? <Loader2 className="w-6 h-6 text-purple-600 animate-spin" /> : <Upload className="w-6 h-6 text-slate-400 group-hover:text-purple-600" />}
                     </div>
                     <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-purple-700 transition-colors">
                        {isParsing ? "Extracting Data..." : "Upload & Tailor PDF"}
                     </h3>
                     <p className="text-sm text-slate-500">
                        {isParsing ? "Hang tight, AI is analyzing your resume." : "Extract data from an existing resume to start editing."}
                     </p>
                  </div>

                  {/* Saved Resumes */}
                  {resumes.map((res) => (
                     <div
                        key={res.id}
                        onClick={() => loadResume(res)}
                        className="group relative p-8 bg-white border border-slate-200 hover:border-indigo-300 rounded-3xl text-left transition-all shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 cursor-pointer flex flex-col justify-between min-h-[220px]"
                     >
                        <button
                           onClick={(e) => handleDelete(e, res.id)}
                           className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors z-20 opacity-0 group-hover:opacity-100"
                        >
                           <Trash2 className="w-4 h-4" />
                        </button>
                        <div>
                           <div className="flex items-center gap-3 mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                 <FileText className="w-6 h-6 text-indigo-500" />
                              </div>
                              {res.ats_score > 0 && (
                                 <div className="px-3 py-1 bg-green-50 text-green-600 border border-green-200 rounded-xl text-xs font-black self-start mt-1">
                                    {res.ats_score}% ATS
                                 </div>
                              )}
                           </div>
                           <h3 className="text-lg font-bold text-slate-900 line-clamp-2 leading-tight">{res.title || "Untitled Resume"}</h3>
                           <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              Updated {res.updated ? new Date(res.updated).toLocaleDateString() : 'Recently'}
                           </p>
                        </div>
                        <div className="flex items-center text-sm font-bold text-slate-400 group-hover:text-indigo-600 mt-4 transition-colors gap-2">
                           Open in Builder <ArrowLeft className="w-4 h-4 rotate-180" />
                        </div>
                     </div>
                  ))}

               </div>
            </div>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-slate-50 -mt-8 -mx-8">
         {/* Navbar for Builder */}
         <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-8 py-4 flex items-center justify-between no-print">
            <div className="flex items-center gap-4">
               <button
                  onClick={() => setViewMode("landing")}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900"
               >
                  <ArrowLeft className="w-5 h-5" />
               </button>
               <h1 className="text-xl font-bold text-slate-900 tracking-tight">Resume Builder</h1>
               <div className="h-6 w-px bg-slate-200" />
               <input
                  value={resumeData.title}
                  onChange={(e) => setResumeData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Resume Title"
                  className="bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors w-64 uppercase tracking-wider"
               />
            </div>
            <div className="flex items-center gap-3">
               {matchScore !== null && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg animate-in fade-in slide-in-from-right-4 duration-500">
                     <div className="relative w-8 h-8 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90">
                           <circle cx="16" cy="16" r="14" fill="transparent" stroke="rgba(34, 197, 94, 0.1)" strokeWidth="3" />
                           <circle cx="16" cy="16" r="14" fill="transparent" stroke="#22c55e" strokeWidth="3" strokeDasharray={88} strokeDashoffset={88 - (88 * matchScore) / 100} strokeLinecap="round" />
                        </svg>
                        <span className="absolute text-[8px] font-black text-green-500">{matchScore}%</span>
                     </div>
                     <div className="leading-tight">
                        <p className="text-[10px] font-black text-green-500 uppercase tracking-tighter">Match Score</p>
                        <p className="text-[8px] text-green-400 truncate max-w-[100px]">{explanation}</p>
                     </div>
                  </div>
               )}
               <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 rounded-xl disabled:opacity-50"
               >
                  {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download PDF
               </button>
               <button
                  onClick={() => { setShowAnalysisPanel(true); handleRunAnalysis(); }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200 rounded-xl"
               >
                  <BarChart3 className="w-4 h-4" /> Analyze
               </button>
               <button
                  onClick={() => setShowTailorModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all rounded-xl shadow-lg shadow-purple-500/20"
               >
                  <Sparkles className="w-4 h-4" /> Tailor to JD
               </button>
               <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-50"
               >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Save Progress
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 xl:grid-cols-2 gap-0 overflow-hidden h-[calc(100vh-73px)]">

            {/* Hidden File Input for PDF Upload */}
            <input
               id="resume-upload"
               type="file"
               accept=".pdf"
               className="hidden"
               onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
               }}
            />

            {/* LEFT: SECTIONS DASHBOARD */}
            <div className="flex-1 bg-slate-50 border-r border-slate-200 overflow-y-auto no-print custom-scrollbar">
               <div className="p-8 xl:p-12 max-w-4xl mx-auto space-y-10">
                  <div className="space-y-2">
                     <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Resume Sections</h2>
                     <p className="text-slate-500">Click any section to edit your details.</p>
                  </div>

                  <div className="space-y-4">
                     {enabledSections.map((secId, i) => {
                        const sec = allSections.find(s => s.id === secId);
                        if (!sec) return null;
                        const Icon = sec.icon;
                        return (
                           <div key={sec.id} className="group relative flex items-center bg-white border border-slate-100 hover:border-indigo-500/50 rounded-2xl transition-all shadow-sm">
                              <div className="flex flex-col gap-1 px-3 border-r border-slate-100 opacity-60 group-hover:opacity-100">
                                 <button
                                    onClick={() => moveSection(sec.id, "up")}
                                    disabled={i === 0}
                                    className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 -mb-1"
                                 >
                                    <ChevronUp className="w-4 h-4" />
                                 </button>
                                 <button
                                    onClick={() => moveSection(sec.id, "down")}
                                    disabled={i === enabledSections.length - 1}
                                    className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 -mt-1"
                                 >
                                    <ChevronDown className="w-4 h-4" />
                                 </button>
                              </div>
                              <button
                                 onClick={() => setEditingSection(sec.id)}
                                 className="flex-1 flex items-center p-6 text-left"
                              >
                                 <div className="w-12 h-12 rounded-xl bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center transition-colors shrink-0 mr-4">
                                    <Icon className="w-6 h-6 text-slate-400 group-hover:text-indigo-600" />
                                 </div>
                                 <div className="space-y-1">
                                    <h3 className="font-bold text-slate-900 text-lg">{sec.label}</h3>
                                    <p className="text-xs text-slate-500 line-clamp-1">{sec.description}</p>
                                 </div>
                              </button>
                              {sec.id !== "personal" && (
                                 <button
                                    onClick={() => toggleSection(sec.id)}
                                    className="absolute right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                 >
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              )}
                           </div>
                        );
                     })}

                     <button
                        onClick={() => setShowAddSectionModal(true)}
                        className="w-full flex items-center justify-center p-6 bg-white/50 border border-dashed border-slate-200 hover:border-indigo-500/50 rounded-2xl transition-all gap-3"
                     >
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                           <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                        </div>
                        <span className="font-bold text-slate-500 group-hover:text-slate-900 transition-colors">Add Section</span>
                     </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
                     <button
                        onClick={() => document.getElementById('resume-upload')?.click()}
                        className="flex items-center gap-3 p-5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all font-bold text-sm shadow-sm"
                     >
                        <Upload className="w-5 h-5 text-indigo-500" /> Import from PDF
                     </button>
                     <button
                        onClick={() => setShowTailorModal(true)}
                        className="flex items-center gap-3 p-5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all font-bold text-sm shadow-sm"
                     >
                        <Sparkles className="w-5 h-5 text-purple-500" /> AI Tailoring
                     </button>
                  </div>
               </div>
            </div>

            {/* RIGHT: LIVE PREVIEW — scaled to fit panel */}
            <div ref={previewContainerRef} className="bg-[#e2e8f0] overflow-y-auto overflow-x-hidden flex justify-center p-6 no-print custom-scrollbar">
               <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top center', width: '8.5in', minHeight: '11in', flexShrink: 0 }}>
                  <div ref={previewRef} id="resume-preview" className="bg-white w-[8.5in] min-h-[11in] shadow-2xl shrink-0 mx-auto box-border font-serif text-black" style={{ padding: '0.4in 0.6in' }}>

                     {/* Header: Name & Contact */}
                     <div className="text-center mb-4">
                        <h1 className="text-2xl font-bold text-black mb-1.5 uppercase tracking-wide">
                           {resumeData.personal.firstName} {resumeData.personal.lastName || ""}
                        </h1>
                        <div className="flex flex-wrap justify-center items-center gap-x-4 text-[10.5px]">
                           {resumeData.personal.phone && (
                              <span className="flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> {resumeData.personal.phone}</span>
                           )}
                           {resumeData.personal.email && (
                              <div className="flex items-center gap-3">
                                 <span className="text-slate-300">|</span>
                                 <a href={`mailto:${resumeData.personal.email}`} className="flex items-center gap-1 hover:underline">
                                    <Mail className="w-2.5 h-2.5" /> {resumeData.personal.email}
                                 </a>
                              </div>
                           )}
                           {resumeData.personal.linkedin && (
                              <div className="flex items-center gap-3">
                                 <span className="text-slate-300">|</span>
                                 <a href={ensureUrl(resumeData.personal.linkedin, "linkedin")} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                                    <Linkedin className="w-2.5 h-2.5" /> LinkedIn
                                 </a>
                              </div>
                           )}
                           {resumeData.personal.github && (
                              <div className="flex items-center gap-3">
                                 <span className="text-slate-300">|</span>
                                 <a href={ensureUrl(resumeData.personal.github, "github")} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                                    <Github className="w-2.5 h-2.5" /> GitHub
                                 </a>
                              </div>
                           )}
                           {resumeData.personal.website && (
                              <div className="flex items-center gap-3">
                                 <span className="text-slate-300">|</span>
                                 <a href={ensureUrl(resumeData.personal.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                                    <User className="w-2.5 h-2.5" /> Portfolio
                                 </a>
                              </div>
                           )}
                        </div>
                     </div>

                     {/* Render sections dynamically based on enabledSections order */}
                     {enabledSections.map((secId) => {
                        switch (secId) {
                           case "summary":
                              return resumeData.summary ? (
                                 <div key={secId} className="mb-4">
                                    <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Professional Summary</h2>
                                    <p className="text-[11px] leading-tight text-slate-800">{resumeData.summary}</p>
                                 </div>
                              ) : null;

                           case "objective":
                              return resumeData.objective ? (
                                 <div key={secId} className="mb-4">
                                    <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Objective</h2>
                                    <p className="text-[11px] leading-tight text-black">{resumeData.objective}</p>
                                 </div>
                              ) : null;

                           case "education":
                              return (
                                 <div key={secId} className="mb-4">
                                    <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Education</h2>
                                    <div className="space-y-2">
                                       {resumeData.education.length > 0 ? resumeData.education.map((edu, i) => (
                                          <div key={i} className="text-[11px] leading-tight">
                                             <div className="flex justify-between items-baseline font-bold">
                                                <span>{edu.school}</span>
                                                <span>{edu.location}</span>
                                             </div>
                                             <div className="flex justify-between items-baseline italic">
                                                <span>{edu.degree}{edu.minor ? `, Minor in ${edu.minor}` : ""}</span>
                                                <span className="not-italic">{edu.startDate} — {(edu as any).current ? "Present" : edu.endDate}</span>
                                             </div>
                                             {edu.gpa && <div className="text-[10.5px]">GPA: {edu.gpa}</div>}
                                          </div>
                                       )) : (
                                          <div className="text-[11px] text-slate-400 italic">No education provided yet...</div>
                                       )}
                                    </div>
                                 </div>
                              );

                           case "experience":
                              return (
                                 <div key={secId} className="mb-4">
                                    <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Experience</h2>
                                    <div className="space-y-3">
                                       {resumeData.experience.length > 0 ? resumeData.experience.map((exp, i) => (
                                          <div key={i} className="text-[11px] leading-tight">
                                             <div className="flex justify-between items-baseline font-bold">
                                                <span>{exp.role}</span>
                                                <span>{exp.startDate} — {exp.current ? "Present" : exp.endDate}</span>
                                             </div>
                                             <div className="flex justify-between items-baseline italic mb-1">
                                                <span>{exp.company}</span>
                                                <span>{exp.location}</span>
                                             </div>
                                             {exp.description && (
                                                <ul className="list-disc ml-4 space-y-0.5 text-[10.5px]">
                                                   {exp.description.split('\n').filter(l => l.trim()).map((line, j) => (
                                                      <li key={j}>{line.replace(/^[•\-\*]\s*/, '')}</li>
                                                   ))}
                                                </ul>
                                             )}
                                          </div>
                                       )) : (
                                          <div className="text-[11px] text-slate-400 italic">No work experience provided yet...</div>
                                       )}
                                    </div>
                                 </div>
                              );

                           case "projects":
                              return (
                                 <div key={secId} className="mb-4">
                                    <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Projects</h2>
                                    <div className="space-y-3">
                                       {resumeData.projects.length > 0 ? resumeData.projects.map((proj, i) => (
                                          <div key={i} className="text-[11px] leading-tight">
                                             <div className="flex justify-between items-baseline font-bold">
                                                {proj.url ? <a href={ensureUrl(proj.url, "github")} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{proj.name}</a> : <span>{proj.name}</span>}
                                                <span>{proj.startDate}{proj.startDate || proj.endDate || proj.current ? " — " : ""}{proj.current ? "Present" : proj.endDate}</span>
                                             </div>
                                             {proj.tech && <div className="italic text-[10.5px] mb-1">{proj.tech}</div>}
                                             {proj.description && (
                                                <ul className="list-disc ml-4 space-y-0.5 text-[10.5px]">
                                                   {proj.description.split('\n').filter(l => l.trim()).map((line, j) => (
                                                      <li key={j}>{line.replace(/^[•\-\*]\s*/, '')}</li>
                                                   ))}
                                                </ul>
                                             )}
                                          </div>
                                       )) : (
                                          <div className="text-[11px] text-slate-400 italic">No projects provided yet...</div>
                                       )}
                                    </div>
                                 </div>
                              );

                           case "skills":
                              return (
                                 <div key={secId} className="mb-4">
                                    <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Skills</h2>
                                    <div className="space-y-1">
                                       {resumeData.skills.length > 0 ? resumeData.skills.map((cat, i) => (
                                          <div key={i} className="text-[11px] leading-tight">
                                             <span className="font-bold">{cat.name}: </span>
                                             <span>{cat.skills.join(", ")}</span>
                                          </div>
                                       )) : (
                                          <div className="text-[11px] text-slate-400 italic">No skills provided yet...</div>
                                       )}
                                    </div>
                                 </div>
                              );

                           case "leadership":
                              return resumeData.leadership.length > 0 ? (
                                 <div key={secId} className="mb-4">
                                    <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Leadership</h2>
                                    <div className="space-y-3">
                                       {resumeData.leadership.map((exp, i) => (
                                          <div key={i} className="text-[11px] leading-tight">
                                             <div className="flex justify-between items-baseline font-bold">
                                                <span>{exp.role}</span>
                                                <span>{exp.startDate} — {exp.current ? "Present" : exp.endDate}</span>
                                             </div>
                                             <div className="flex justify-between items-baseline italic mb-1">
                                                <span>{exp.company}</span>
                                             </div>
                                             {exp.description && (
                                                <ul className="list-disc ml-4 space-y-0.5 text-[10.5px]">
                                                   {exp.description.split('\n').filter(l => l.trim()).map((line, j) => (
                                                      <li key={j}>{line.replace(/^[•\-\*]\s*/, '')}</li>
                                                   ))}
                                                </ul>
                                             )}
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              ) : null;

                           case "research":
                              return resumeData.research.length > 0 ? (
                                 <div key={secId} className="mb-4">
                                    <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Research</h2>
                                    <div className="space-y-3">
                                       {resumeData.research.map((res, i) => (
                                          <div key={i} className="text-[11px] leading-tight">
                                             <div className="flex justify-between items-baseline font-bold">
                                                {res.url ? <a href={ensureUrl(res.url)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{res.name}</a> : <span>{res.name}</span>}
                                                <span>{res.startDate}{res.startDate || res.endDate || res.current ? " — " : ""}{res.current ? "Present" : res.endDate}</span>
                                             </div>
                                             {res.tech && <div className="italic text-[10.5px] mb-1">{res.tech}</div>}
                                             {res.description && (
                                                <ul className="list-disc ml-4 space-y-0.5 text-[10.5px]">
                                                   {res.description.split('\n').filter((l: string) => l.trim()).map((line: string, j: number) => (
                                                      <li key={j}>{line.replace(/^[•\-\*]\s*/, '')}</li>
                                                   ))}
                                                </ul>
                                             )}
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              ) : null;

                           case "certifications":
                              return resumeData.certifications.length > 0 ? (
                                 <div key={secId} className="mb-4">
                                    <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Certifications</h2>
                                    <div className="space-y-1">
                                       {resumeData.certifications.map((cert, i) => (
                                          <div key={i} className="text-[11px] leading-tight flex justify-between">
                                             <div>
                                                {cert.url ? <a href={ensureUrl(cert.url)} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-600 hover:underline">{cert.name}</a> : <span className="font-bold">{cert.name}</span>} — <span>{cert.issuer}</span>
                                             </div>
                                             <span>{cert.dateObtained}</span>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              ) : null;

                           case "awards":
                           case "publications":
                              // Combine Awards and Publications side-by-side if they both exist and we hit the first one
                              if (secId === "awards" || (secId === "publications" && !enabledSections.includes("awards"))) {
                                 return (resumeData.awards.length > 0 || resumeData.publications.length > 0) ? (
                                    <div key="awards-pubs" className="grid grid-cols-2 gap-8 mb-4">
                                       {resumeData.awards.length > 0 && enabledSections.includes("awards") && (
                                          <div>
                                             <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Awards & Honors</h2>
                                             <div className="space-y-2">
                                                {resumeData.awards.map((award, i) => (
                                                   <div key={i} className="text-[11px] leading-tight">
                                                      <div className="flex justify-between font-bold">
                                                         <span>{award.title}</span>
                                                         <span>{award.date}</span>
                                                      </div>
                                                      <div className="text-[10.5px] italic text-slate-600">{award.issuer}</div>
                                                   </div>
                                                ))}
                                             </div>
                                          </div>
                                       )}
                                       {resumeData.publications.length > 0 && enabledSections.includes("publications") && (
                                          <div>
                                             <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Publications</h2>
                                             <div className="space-y-2">
                                                {resumeData.publications.map((pub, i) => (
                                                   <div key={i} className="text-[11px] leading-tight">
                                                      <div className="flex justify-between font-bold">
                                                         <span>{pub.title}</span>
                                                         <span>{pub.date}</span>
                                                      </div>
                                                      <div className="text-[10.5px] italic text-slate-600">{pub.publisher}</div>
                                                   </div>
                                                ))}
                                             </div>
                                          </div>
                                       )}
                                    </div>
                                 ) : null;
                              }
                              return null; // Skip "publications" alone if "awards" handled it

                           default:
                              return null;
                        }
                     })}

                  </div>
               </div>
            </div>
         </div>

         {/* Add Section Modal (Matching User Reference) */}
         {showAddSectionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
               <div className="bg-white border border-slate-200 rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                  <div className="p-10 space-y-8">
                     <div className="flex items-center justify-between">
                        <div className="space-y-1">
                           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Add Content</h2>
                           <p className="text-slate-500">Select a section to add to your resume</p>
                        </div>
                        <button onClick={() => setShowAddSectionModal(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                           <Plus className="w-8 h-8 rotate-45" />
                        </button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
                        {allSections.map((section) => {
                           const isEnabled = enabledSections.includes(section.id);
                           return (
                              <button
                                 key={section.id}
                                 disabled={isEnabled}
                                 onClick={() => toggleSection(section.id)}
                                 className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition-all relative ${isEnabled
                                       ? "bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed"
                                       : "bg-white border-slate-200 hover:border-indigo-500 hover:bg-slate-50 active:scale-[0.98] shadow-sm"
                                    }`}
                              >
                                 <div className={`p-3 rounded-xl ${isEnabled ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-600"}`}>
                                    <section.icon className="w-5 h-5" />
                                 </div>
                                 <div className="space-y-1">
                                    <h3 className="text-sm font-bold text-slate-900">{section.label}</h3>
                                    <p className="text-[10px] text-slate-500 leading-snug">{section.description}</p>
                                 </div>
                                 {isEnabled && (
                                    <div className="absolute top-4 right-4 text-[10px] font-bold text-slate-400 uppercase">Added</div>
                                 )}
                              </button>
                           );
                        })}
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* SECTION MODALS */}
         {editingSection && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto no-print">
               <div className="bg-white border border-slate-200 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 my-8">
                  <div className="p-10 space-y-8">
                     <div className="flex items-center justify-between">
                        <div>
                           <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                              {allSections.find(s => s.id === editingSection)?.label}
                           </h2>
                           <p className="text-slate-500">Update your details below.</p>
                        </div>
                        <button onClick={() => setEditingSection(null)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                           <Plus className="w-8 h-8 rotate-45" />
                        </button>
                     </div>

                     {/* Personal Section Modal Content */}
                     {editingSection === "personal" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">First Name *</label>
                              <input
                                 value={resumeData.personal.firstName}
                                 onChange={(e) => updateNested("personal", "firstName", e.target.value)}
                                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent outline-none transition-all font-medium shadow-sm"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Last Name *</label>
                              <input
                                 value={resumeData.personal.lastName}
                                 onChange={(e) => updateNested("personal", "lastName", e.target.value)}
                                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent outline-none transition-all font-medium shadow-sm"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address *</label>
                              <input
                                 value={resumeData.personal.email}
                                 onChange={(e) => updateNested("personal", "email", e.target.value)}
                                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent outline-none transition-all font-medium shadow-sm"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Phone Number *</label>
                              <input
                                 value={resumeData.personal.phone}
                                 onChange={(e) => updateNested("personal", "phone", e.target.value)}
                                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent outline-none transition-all font-medium shadow-sm"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">LinkedIn Profile URL</label>
                              <input
                                 value={resumeData.personal.linkedin}
                                 onChange={(e) => updateNested("personal", "linkedin", e.target.value)}
                                 placeholder="johndoe"
                                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent outline-none transition-all font-medium shadow-sm"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">GitHub Profile URL</label>
                              <input
                                 value={resumeData.personal.github}
                                 onChange={(e) => updateNested("personal", "github", e.target.value)}
                                 placeholder="johndoe"
                                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent outline-none transition-all font-medium shadow-sm"
                              />
                           </div>
                        </div>
                     )}

                     {/* Summary Section Modal Content */}
                     {editingSection === "summary" && (
                        <div className="space-y-4">
                           <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Professional Summary</label>
                           <textarea
                              value={resumeData.summary}
                              onChange={(e) => setResumeData(prev => ({ ...prev, summary: e.target.value }))}
                              placeholder="A highly motivated software engineer..."
                              className="w-full h-64 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent outline-none transition-all resize-none leading-relaxed shadow-sm"
                           />
                        </div>
                     )}

                     {/* Objective Section Modal Content */}
                     {editingSection === "objective" && (
                        <div className="space-y-4">
                           <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Career Objective</label>
                           <textarea
                              value={resumeData.objective}
                              onChange={(e) => setResumeData(prev => ({ ...prev, objective: e.target.value }))}
                              placeholder="To secure a challenging position in..."
                              className="w-full h-64 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent outline-none transition-all resize-none leading-relaxed shadow-sm"
                           />
                        </div>
                     )}

                     {/* Experience Section Modal Content */}
                     {editingSection === "experience" && (
                        <div className="space-y-8 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
                           <div className="flex justify-between items-center sticky top-0 bg-white z-10 pb-4">
                              <p className="text-sm text-slate-400">List your professional roles and impact.</p>
                              <button onClick={addExperience} className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-xs font-bold transition-all">
                                 <Plus className="w-4 h-4" /> Add Experience
                              </button>
                           </div>
                           <div className="space-y-6">
                              {resumeData.experience.map((exp, idx) => (
                                 <div key={idx} className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4 relative group shadow-sm">
                                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all bg-white p-1 rounded-xl shadow-lg border border-slate-100">
                                       <button onClick={() => moveItemInList("experience", idx, "up")} disabled={idx === 0} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400">
                                          <ChevronUp className="w-4 h-4" />
                                       </button>
                                       <button onClick={() => moveItemInList("experience", idx, "down")} disabled={idx === resumeData.experience.length - 1} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400">
                                          <ChevronDown className="w-4 h-4" />
                                       </button>
                                    </div>
                                    <button onClick={() => removeListItem("experience", idx)} className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                                       <Plus className="w-4 h-4 rotate-45" />
                                    </button>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="space-y-1.5">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</label>
                                          <input value={exp.role} onChange={(e) => updateListItem("experience", idx, "role", e.target.value)} placeholder="Software Engineer" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                                       </div>
                                       <div className="space-y-1.5">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Company</label>
                                          <input value={exp.company} onChange={(e) => updateListItem("experience", idx, "company", e.target.value)} placeholder="Google" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="space-y-1.5">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Start Date</label>
                                          <input value={exp.startDate} type="month" onChange={(e) => updateListItem("experience", idx, "startDate", e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                                       </div>
                                       <div className="space-y-1.5">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">End Date</label>
                                          <input value={exp.endDate} type="month" onChange={(e) => updateListItem("experience", idx, "endDate", e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" disabled={exp.current} />
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <input type="checkbox" checked={exp.current} onChange={(e) => updateListItem("experience", idx, "current", e.target.checked)} className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500" />
                                       <span className="text-xs text-slate-400">I currently work here</span>
                                    </div>
                                    <div className="space-y-1.5">
                                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
                                       <textarea value={exp.description} onChange={(e) => updateListItem("experience", idx, "description", e.target.value)} placeholder="Led development of..." className="w-full h-32 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-sm" />
                                       <p className="text-[10px] text-slate-400 mt-1">Press <b>Enter</b> to create a new bullet point.</p>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     {/* Education Section Modal Content */}
                     {editingSection === "education" && (
                        <div className="space-y-8 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
                           <div className="flex justify-between items-center sticky top-0 bg-white z-10 pb-4">
                              <p className="text-sm text-slate-400">Add your academic background.</p>
                              <button onClick={addEducation} className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-xs font-bold transition-all">
                                 <Plus className="w-4 h-4" /> Add Education
                              </button>
                           </div>
                           <div className="space-y-6">
                              {resumeData.education.map((edu, idx) => (
                                 <div key={idx} className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4 relative group shadow-sm">
                                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all bg-white p-1 rounded-xl shadow-lg border border-slate-100">
                                       <button onClick={() => moveItemInList("education", idx, "up")} disabled={idx === 0} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400">
                                          <ChevronUp className="w-4 h-4" />
                                       </button>
                                       <button onClick={() => moveItemInList("education", idx, "down")} disabled={idx === resumeData.education.length - 1} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400">
                                          <ChevronDown className="w-4 h-4" />
                                       </button>
                                    </div>
                                    <button onClick={() => removeListItem("education", idx)} className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                                       <Plus className="w-4 h-4 rotate-45" />
                                    </button>
                                    <div className="space-y-1.5">
                                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">School / University</label>
                                       <input value={edu.school} onChange={(e) => updateListItem("education", idx, "school", e.target.value)} placeholder="Harvard University" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="space-y-1.5">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Degree</label>
                                          <input value={edu.degree} onChange={(e) => updateListItem("education", idx, "degree", e.target.value)} placeholder="B.S. Computer Science" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                                       </div>
                                       <div className="space-y-1.5">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">GPA</label>
                                          <input value={edu.gpa} onChange={(e) => updateListItem("education", idx, "gpa", e.target.value)} placeholder="3.8/4.0" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="space-y-1.5">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Start Date</label>
                                          <input value={edu.startDate} type="month" onChange={(e) => updateListItem("education", idx, "startDate", e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                                       </div>
                                       <div className="space-y-1.5">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">End Date</label>
                                          <input value={edu.endDate} type="month" onChange={(e) => updateListItem("education", idx, "endDate", e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" disabled={(edu as any).current} />
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <input type="checkbox" checked={(edu as any).current} onChange={(e) => updateListItem("education", idx, "current", e.target.checked)} className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500" />
                                       <span className="text-xs text-slate-400">I am currently studying here</span>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     {/* Skills Section Modal Content */}
                     {editingSection === "skills" && (
                        <div className="space-y-8 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
                           <div className="flex justify-between items-center sticky top-0 bg-white z-10 pb-4">
                              <p className="text-sm text-slate-400">List your technical and soft skills.</p>
                              <button onClick={addSkillCategory} className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-xs font-bold transition-all">
                                 <Plus className="w-4 h-4" /> Add Category
                              </button>
                           </div>
                           <div className="space-y-6">
                              {resumeData.skills.map((cat, catIdx) => (
                                 <div key={catIdx} className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4 relative group shadow-sm">
                                    <button onClick={() => removeListItem("skills", catIdx)} className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                                       <Plus className="w-4 h-4 rotate-45" />
                                    </button>
                                    <div className="space-y-1.5">
                                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category (e.g., Languages)</label>
                                       <input value={cat.name} onChange={(e) => updateListItem("skills", catIdx, "name", e.target.value)} placeholder="Technical Skills" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                                    </div>
                                    <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                                       {cat.skills.map((skill, skillIdx) => (
                                          <div key={skillIdx} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-[10px] font-bold shadow-sm">
                                             {skill}
                                             <button onClick={() => removeSkill(catIdx, skillIdx)} className="text-indigo-400 hover:text-indigo-600 transition-colors">
                                                <Plus className="w-3.5 h-3.5 rotate-45" />
                                             </button>
                                          </div>
                                       ))}
                                       <input
                                          placeholder="+ Add skill"
                                          className="bg-transparent border-none focus:ring-0 text-[10px] text-slate-600 w-24 p-0 font-medium placeholder:text-slate-400"
                                          onKeyDown={(e) => {
                                             if (e.key === 'Enter') {
                                                addSkill(catIdx, (e.target as HTMLInputElement).value);
                                                (e.target as HTMLInputElement).value = "";
                                             }
                                          }}
                                       />
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     {/* Projects Section Modal Content */}
                     {editingSection === "projects" && (
                        <div className="space-y-8 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
                           <div className="flex justify-between items-center sticky top-0 bg-white z-10 pb-4">
                              <p className="text-sm text-slate-400">Showcase your best work.</p>
                              <button onClick={addProject} className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-xs font-bold transition-all">
                                 <Plus className="w-4 h-4" /> Add Project
                              </button>
                           </div>
                           <div className="space-y-6">
                              {resumeData.projects.map((proj, idx) => (
                                 <div key={idx} className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4 relative group shadow-sm">
                                    <button onClick={() => removeListItem("projects", idx)} className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                                       <Plus className="w-4 h-4 rotate-45" />
                                    </button>
                                    <div className="space-y-1.5">
                                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Project Name</label>
                                       <input value={proj.name} onChange={(e) => updateListItem("projects", idx, "name", e.target.value)} placeholder="E-commerce App" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Technologies</label>
                                       <input value={proj.tech} onChange={(e) => updateListItem("projects", idx, "tech", e.target.value)} placeholder="React, Node.js, AWS" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Project Link (Optional)</label>
                                       <input value={proj.url} onChange={(e) => updateListItem("projects", idx, "url", e.target.value)} placeholder="github.com/my-project" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="space-y-1.5">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Start Date (Optional)</label>
                                          <input type="month" value={proj.startDate} onChange={(e) => updateListItem("projects", idx, "startDate", e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                                       </div>
                                       <div className="space-y-1.5">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">End Date (Optional)</label>
                                          <input type="month" value={proj.endDate} onChange={(e) => updateListItem("projects", idx, "endDate", e.target.value)} disabled={proj.current} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm disabled:opacity-50" />
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <input type="checkbox" checked={proj.current} onChange={(e) => updateListItem("projects", idx, "current", e.target.checked)} className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500" />
                                       <span className="text-xs text-slate-400">I am currently working on this project</span>
                                    </div>
                                    <div className="space-y-1.5">
                                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
                                       <textarea value={proj.description} onChange={(e) => updateListItem("projects", idx, "description", e.target.value)} placeholder="Built a responsive..." className="w-full h-24 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-sm" />
                                       <p className="text-[10px] text-slate-400 mt-1">Press <b>Enter</b> to create a new bullet point.</p>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     {/* Certifications Modal Content */}
                     {editingSection === "certifications" && (
                        <div className="space-y-8 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
                           <div className="flex justify-between items-center sticky top-0 bg-white z-10 pb-4">
                              <p className="text-sm text-slate-400">List your professional certifications.</p>
                              <button onClick={addCertification} className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-xs font-bold transition-all">
                                 <Plus className="w-4 h-4" /> Add Certification
                              </button>
                           </div>
                           <div className="space-y-6">
                              {resumeData.certifications.map((cert, idx) => (
                                 <div key={idx} className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4 relative group shadow-sm">
                                    <button onClick={() => removeListItem("certifications", idx)} className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                                       <Plus className="w-4 h-4 rotate-45" />
                                    </button>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Certification Name</label>
                                       <input value={cert.name} onChange={(e) => updateListItem("certifications", idx, "name", e.target.value)} placeholder="AWS Solutions Architect" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="space-y-2">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Issuer</label>
                                          <input value={cert.issuer} onChange={(e) => updateListItem("certifications", idx, "issuer", e.target.value)} placeholder="Amazon Web Services" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                                       </div>
                                       <div className="space-y-2">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date Obtained (MM/YYYY)</label>
                                          <input value={cert.dateObtained} type="month" onChange={(e) => updateListItem("certifications", idx, "dateObtained", e.target.value)} placeholder="01/2023" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                                       </div>
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Certificate Link (Drive/URL)</label>
                                       <input value={cert.url} onChange={(e) => updateListItem("certifications", idx, "url", e.target.value)} placeholder="https://drive.google.com/..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     {/* Leadership Modal Content */}
                     {editingSection === "leadership" && (
                        <div className="space-y-8 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
                           <div className="flex justify-between items-center sticky top-0 bg-white z-10 pb-4">
                              <p className="text-sm text-slate-400">Highlight your leadership roles.</p>
                              <button onClick={addLeadership} className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-xs font-bold transition-all">
                                 <Plus className="w-4 h-4" /> Add Leadership
                              </button>
                           </div>
                           <div className="space-y-6">
                              {resumeData.leadership.map((exp, idx) => (
                                 <div key={idx} className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4 relative group shadow-sm">
                                    <button onClick={() => removeListItem("leadership", idx)} className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                                       <Plus className="w-4 h-4 rotate-45" />
                                    </button>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="space-y-2">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</label>
                                          <input value={exp.role} onChange={(e) => updateListItem("leadership", idx, "role", e.target.value)} placeholder="Club President" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                                       </div>
                                       <div className="space-y-2">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Organization</label>
                                          <input value={exp.company} onChange={(e) => updateListItem("leadership", idx, "company", e.target.value)} placeholder="Student Council" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="space-y-2">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Start Date</label>
                                          <input value={exp.startDate} type="month" onChange={(e) => updateListItem("leadership", idx, "startDate", e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                                       </div>
                                       <div className="space-y-2">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">End Date</label>
                                          <input value={exp.endDate} type="month" onChange={(e) => updateListItem("leadership", idx, "endDate", e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" disabled={exp.current} />
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <input type="checkbox" checked={exp.current} onChange={(e) => updateListItem("leadership", idx, "current", e.target.checked)} className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500" />
                                       <span className="text-xs text-slate-400">I currently lead this</span>
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Achievements</label>
                                       <textarea value={exp.description} onChange={(e) => updateListItem("leadership", idx, "description", e.target.value)} placeholder="Led a team of..." className="w-full h-24 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-sm transition-all" />
                                       <p className="text-[10px] text-slate-400 mt-1">Press <b>Enter</b> to create a new bullet point.</p>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     {/* Research Modal Content */}
                     {editingSection === "research" && (
                        <div className="space-y-8 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
                           <div className="flex justify-between items-center sticky top-0 bg-white z-10 pb-4">
                              <p className="text-sm text-slate-400">Add your research experience.</p>
                              <button onClick={addResearch} className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-xs font-bold transition-all">
                                 <Plus className="w-4 h-4" /> Add Research
                              </button>
                           </div>
                           <div className="space-y-6">
                              {resumeData.research.map((res, idx) => (
                                 <div key={idx} className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4 relative group shadow-sm">
                                    <button onClick={() => removeListItem("research", idx)} className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                                       <Plus className="w-4 h-4 rotate-45" />
                                    </button>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Project Name</label>
                                       <input value={res.name} onChange={(e) => updateListItem("research", idx, "name", e.target.value)} placeholder="AI in Healthcare" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="space-y-2">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Technologies</label>
                                          <input value={res.tech} onChange={(e) => updateListItem("research", idx, "tech", e.target.value)} placeholder="Python, PyTorch" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                                       </div>
                                       <div className="space-y-2">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</label>
                                          <input value={res.startDate} onChange={(e) => updateListItem("research", idx, "startDate", e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                                       </div>
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
                                       <textarea value={res.description} onChange={(e) => updateListItem("research", idx, "description", e.target.value)} placeholder="Conducted study on..." className="w-full h-24 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-sm transition-all" />
                                       <p className="text-[10px] text-slate-400 mt-1">Press <b>Enter</b> to create a new bullet point.</p>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     {/* Awards Modal Content */}
                     {editingSection === "awards" && (
                        <div className="space-y-8 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
                           <div className="flex justify-between items-center sticky top-0 bg-white z-10 pb-4">
                              <p className="text-sm text-slate-400">List your awards and honors.</p>
                              <button onClick={addAward} className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-xs font-bold transition-all">
                                 <Plus className="w-4 h-4" /> Add Award
                              </button>
                           </div>
                           <div className="space-y-6">
                              {resumeData.awards.map((award, idx) => (
                                 <div key={idx} className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4 relative group shadow-sm">
                                    <button onClick={() => removeListItem("awards", idx)} className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                                       <Plus className="w-4 h-4 rotate-45" />
                                    </button>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Award Title</label>
                                       <input value={award.title} onChange={(e) => updateListItem("awards", idx, "title", e.target.value)} placeholder="Dean's List" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="space-y-2">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Issuer</label>
                                          <input value={award.issuer} onChange={(e) => updateListItem("awards", idx, "issuer", e.target.value)} placeholder="University" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                                       </div>
                                       <div className="space-y-2">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</label>
                                          <input value={award.date} onChange={(e) => updateListItem("awards", idx, "date", e.target.value)} placeholder="Jan 2023" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                                       </div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     {/* Publications Modal Content */}
                     {editingSection === "publications" && (
                        <div className="space-y-8 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
                           <div className="flex justify-between items-center sticky top-0 bg-white z-10 pb-4">
                              <p className="text-sm text-slate-400">Add your publications.</p>
                              <button onClick={addPublication} className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-xs font-bold transition-all">
                                 <Plus className="w-4 h-4" /> Add Publication
                              </button>
                           </div>
                           <div className="space-y-6">
                              {resumeData.publications.map((pub, idx) => (
                                 <div key={idx} className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4 relative group shadow-sm">
                                    <button onClick={() => removeListItem("publications", idx)} className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                                       <Plus className="w-4 h-4 rotate-45" />
                                    </button>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Title</label>
                                       <input value={pub.title} onChange={(e) => updateListItem("publications", idx, "title", e.target.value)} placeholder="The Future of AI" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="space-y-2">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Publisher</label>
                                          <input value={pub.publisher} onChange={(e) => updateListItem("publications", idx, "publisher", e.target.value)} placeholder="IEEE" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                                       </div>
                                       <div className="space-y-2">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</label>
                                          <input value={pub.date} onChange={(e) => updateListItem("publications", idx, "date", e.target.value)} placeholder="Jan 2023" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                                       </div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     <div className="pt-6 flex justify-end">
                        <button
                           onClick={() => setEditingSection(null)}
                           className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
                        >
                           Done
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Tailor Modal */}
         {showTailorModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
               <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-8 space-y-6">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                              <Sparkles className="w-5 h-5 text-purple-600" />
                           </div>
                           <div>
                              <h2 className="text-xl font-bold text-[var(--foreground)]">Tailor to Job Description</h2>
                              <p className="text-sm text-[var(--muted)]">Our AI will rewrite your resume for a perfect match.</p>
                           </div>
                        </div>
                        <button onClick={() => setShowTailorModal(false)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                           <Plus className="w-6 h-6 rotate-45" />
                        </button>
                     </div>

                     <div className="space-y-4">
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paste Job Description</label>
                           <textarea
                              value={jdInput}
                              onChange={(e) => setJdInput(e.target.value)}
                              placeholder="Paste the target job description here..."
                              className="w-full h-64 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-900 focus:ring-2 focus:ring-purple-500 focus:bg-white focus:border-transparent transition-all outline-none resize-none shadow-sm"
                           />
                        </div>

                        <div className="flex gap-3">
                           <button
                              onClick={() => setShowTailorModal(false)}
                              className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                           >
                              Cancel
                           </button>
                           <button
                              onClick={handleTailor}
                              disabled={isTailoring || !jdInput.trim()}
                              className="flex-[2] py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                           >
                              {isTailoring ? (
                                 <><Loader2 className="w-4 h-4 animate-spin" /> Tailoring with AI...</>
                              ) : (
                                 <><Sparkles className="w-4 h-4" /> Start Tailoring</>
                              )}
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}
         {showTailorReport && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
               <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                  <div className="p-8 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                           <Check className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                           <h2 className="text-xl font-bold text-slate-900">Tailoring Complete</h2>
                           <p className="text-sm text-slate-500">Match score: <span className="font-bold text-purple-600">{matchScore}%</span></p>
                        </div>
                     </div>
                     <button onClick={() => setShowTailorReport(false)} className="text-slate-400 hover:text-slate-900">
                        <X className="w-6 h-6" />
                     </button>
                  </div>

                  <div className="p-8 overflow-y-auto space-y-8 bg-slate-50">
                     {tailorChanges && tailorChanges.length > 0 && (
                        <div className="space-y-3">
                           <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Changes Made</h3>
                           <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
                              {tailorChanges.map((change, i) => (
                                 <div key={i} className="flex gap-3 text-sm text-slate-700">
                                    <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                                    <p>{change}</p>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {tailorMatched && tailorMatched.length > 0 && (
                           <div className="space-y-3">
                              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600">Matched Skills</h3>
                              <div className="flex flex-wrap gap-2">
                                 {tailorMatched.map((skill, i) => (
                                    <span key={i} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">
                                       {skill}
                                    </span>
                                 ))}
                              </div>
                           </div>
                        )}
                        {tailorMissing && tailorMissing.length > 0 && (
                           <div className="space-y-3">
                              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-600">Missing Skills (Gaps)</h3>
                              <div className="flex flex-wrap gap-2">
                                 {tailorMissing.map((skill, i) => (
                                    <span key={i} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold border border-amber-200">
                                       {skill}
                                    </span>
                                 ))}
                              </div>
                              <p className="text-xs text-slate-500 italic mt-2">These skills were in the JD but not found in your resume.</p>
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex justify-end">
                     <button
                        onClick={() => setShowTailorReport(false)}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all"
                     >
                        Review Updates
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Analysis Modal */}
         {showAnalysisPanel && analysisResult && (
            <div className="fixed inset-0 z-50 flex justify-end p-0 bg-slate-900/20 backdrop-blur-sm">
               <div className="bg-white w-full max-w-lg h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
                  <div className="p-8 space-y-8">
                     <div className="flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur pb-4 z-10">
                        <div className="space-y-1">
                           <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                              <BarChart3 className="w-6 h-6 text-emerald-500" />
                              Resume Analysis
                           </h2>
                        </div>
                        <button onClick={() => setShowAnalysisPanel(false)} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-100 rounded-full transition-colors">
                           <X className="w-5 h-5" />
                        </button>
                     </div>

                     {/* Overall Score */}
                     <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                           <svg className="w-full h-full -rotate-90">
                              <circle cx="48" cy="48" r="42" fill="transparent" stroke="rgba(16, 185, 129, 0.1)" strokeWidth="8" />
                              <circle cx="48" cy="48" r="42" fill="transparent" stroke={analysisResult.overallScore >= 70 ? "#10b981" : analysisResult.overallScore >= 50 ? "#f59e0b" : "#ef4444"} strokeWidth="8" strokeDasharray={264} strokeDashoffset={264 - (264 * analysisResult.overallScore) / 100} strokeLinecap="round" className="transition-all duration-1000" />
                           </svg>
                           <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl font-black text-slate-900">{analysisResult.overallScore}</span>
                           </div>
                        </div>
                        <div className="space-y-2">
                           <h3 className="text-lg font-bold text-slate-900">Overall Score: <span className={analysisResult.overallScore >= 70 ? "text-emerald-500" : analysisResult.overallScore >= 50 ? "text-amber-500" : "text-red-500"}>{analysisResult.grade}</span></h3>
                           <p className="text-xs text-slate-500 leading-relaxed">
                              Your resume has {analysisResult.wordCount} words and {analysisResult.bulletCount} bullet points.
                           </p>
                        </div>
                     </div>

                     {/* JD Match Section */}
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ATS Keyword Check</label>
                           <textarea
                              value={analysisJd}
                              onChange={(e) => setAnalysisJd(e.target.value)}
                              placeholder="Paste a job description here and click Analyze to check ATS keywords..."
                              className="w-full h-24 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                           />
                           <button
                              onClick={handleRunAnalysis}
                              className="w-full py-2 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-200 transition-colors"
                           >
                              Refresh Analysis
                           </button>
                        </div>

                        {analysisResult.jdMatch && (
                           <div className="p-5 bg-white border border-emerald-100 rounded-2xl space-y-4 shadow-sm">
                              <div className="flex justify-between items-center">
                                 <span className="font-bold text-slate-900 text-sm">Keyword Match</span>
                                 <span className="font-black text-emerald-600">{analysisResult.jdMatch.percentage}%</span>
                              </div>

                              {analysisResult.jdMatch.missingKeywords.length > 0 && (
                                 <div className="space-y-2">
                                    <p className="text-xs font-bold text-rose-500">Missing Keywords to Add:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                       {analysisResult.jdMatch.missingKeywords.map((kw, i) => (
                                          <span key={i} className="px-2 py-1 bg-rose-50 text-rose-600 rounded text-[10px] font-bold">{kw}</span>
                                       ))}
                                    </div>
                                 </div>
                              )}

                              {analysisResult.jdMatch.foundKeywords.length > 0 && (
                                 <div className="space-y-2">
                                    <p className="text-xs font-bold text-emerald-600">Matched Keywords:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                       {analysisResult.jdMatch.foundKeywords.slice(0, 10).map((kw, i) => (
                                          <span key={i} className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold">{kw}</span>
                                       ))}
                                       {analysisResult.jdMatch.foundKeywords.length > 10 && (
                                          <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded text-[10px] font-bold">+{analysisResult.jdMatch.foundKeywords.length - 10} more</span>
                                       )}
                                    </div>
                                 </div>
                              )}
                           </div>
                        )}
                     </div>

                     {/* Breakdown */}
                     <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Analysis Breakdown</h3>
                        <div className="space-y-6">
                           {analysisResult.breakdown.map((cat, i) => (
                              <div key={i} className="space-y-3">
                                 <div className="flex justify-between items-end">
                                    <div className="flex items-center gap-2">
                                       <span className="text-base">{cat.icon}</span>
                                       <span className="font-bold text-sm text-slate-700">{cat.category}</span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-400">{cat.score}/{cat.maxScore}</span>
                                 </div>

                                 <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                       className={`h-full rounded-full ${cat.score === cat.maxScore ? 'bg-emerald-500' : cat.score >= cat.maxScore * 0.5 ? 'bg-amber-400' : 'bg-rose-500'}`}
                                       style={{ width: `${(cat.score / cat.maxScore) * 100}%` }}
                                    />
                                 </div>

                                 {cat.tips.length > 0 && (
                                    <ul className="space-y-1.5 mt-2">
                                       {cat.tips.map((tip, j) => (
                                          <li key={j} className="text-[11px] text-slate-500 flex items-start gap-1.5">
                                             <ArrowLeft className="w-3 h-3 text-amber-500 shrink-0 mt-0.5 rotate-180" />
                                             <span>{tip}</span>
                                          </li>
                                       ))}
                                    </ul>
                                 )}
                              </div>
                           ))}
                        </div>
                     </div>

                  </div>
               </div>
            </div>
         )}

         <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          #resume-preview, #resume-preview * { visibility: visible; }
          #resume-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 20mm !important;
            box-shadow: none !important;
          }
        }
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
