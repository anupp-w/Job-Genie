"use client";

import React, { useEffect, useState } from "react";
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
  Target,
  Users,
  FlaskConical,
  Trophy,
  Code,
  Mail,
  Phone,
  Edit2,
  Lock,
  Check
} from "lucide-react";
import api from "@/services/api";

type ResumeResponse = {
  id: number;
  title: string;
  ats_score: number;
  file_path?: string | null;
  parsed_content?: string | null;
  sections: { id: number; section_type: string; content: string; order?: number | null }[];
  updated?: string;
};

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
  const [jdInput, setJdInput] = useState("");
  const [isTailoring, setIsTailoring] = useState(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

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
        setResumes(res.data);
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
      const response = await fetch("/api/v1/resumes/parse", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to parse resume");
      }

      const parsedData = await response.ok ? await response.json() : null;
      if (parsedData) {
        setResumeData(prev => ({
          ...prev,
          ...parsedData,
          personal: { ...prev.personal, ...parsedData.personal },
          skills: parsedData.skills || prev.skills,
          experience: parsedData.experience || prev.experience,
          education: parsedData.education || prev.education,
        }));
        alert("Resume parsed successfully! Please review the auto-filled data.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Coming Soon: Advanced AI parsing is currently being fine-tuned. Please fill in your details manually for now.");
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
      setResumes(prev => [res.data, ...prev]);
      alert("Resume saved successfully!");
    } catch (err: any) {
      setError("Failed to save resume.");
    } finally {
      setSaving(false);
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
      setResumeData(res.data.tailored_data);
      setMatchScore(res.data.match_score);
      setExplanation(res.data.explanation);
      setShowTailorModal(false);
      alert("Resume tailored successfully!");
    } catch (err: any) {
      console.error("Tailoring error:", err);
      setError("AI Tailoring failed. Please check your API key and try again.");
    } finally {
      setIsTailoring(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

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

  if (viewMode === "landing") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 -mt-8 -mx-8">
        <div className="max-w-4xl w-full space-y-12">
          <div className="text-center space-y-4">
             <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-sm font-bold border border-indigo-100 mb-4 animate-bounce">
                <Sparkles className="w-4 h-4" /> AI Powered Resume Engine
             </div>
             <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">Create your Pro Resume in <span className="text-indigo-600 italic underline decoration-indigo-200">minutes</span>.</h1>
             <p className="text-xl text-slate-500 max-w-2xl mx-auto">Choose a starting point to generate a professional, high-matching resume for your dream job.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Build from Scratch */}
             <button
               onClick={() => setViewMode("builder")}
               className="group relative p-8 bg-white border-2 border-slate-100 hover:border-indigo-500 rounded-[2.5rem] text-left transition-all hover:shadow-2xl hover:shadow-indigo-100 active:scale-[0.98]"
             >
                <div className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl shadow-indigo-200">
                   <Plus className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Build from Scratch</h3>
                <p className="text-slate-500 leading-relaxed">Fill out your details step-by-step and see your resume come to life in the live preview.</p>
                <div className="mt-8 flex items-center text-indigo-600 font-bold gap-2">
                   Get Started <Sparkles className="w-4 h-4" />
                </div>
             </button>

             {/* Upload & Tailor */}
             <div className="relative group p-8 bg-white border-2 border-slate-100 hover:border-purple-500 rounded-[2.5rem] text-left transition-all hover:shadow-2xl hover:shadow-purple-100">
                <input 
                  type="file" 
                  accept=".pdf"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const file = e.target.files[0];
                      const formData = new FormData();
                      formData.append("file", file);
                      try {
                        // We do a hacky toast here since we don't have a global toast
                        alert("Uploading and parsing " + file.name + "...");
                        const res = await api.post("/parse", formData, {
                           headers: { "Content-Type": "multipart/form-data" }
                        });
                        setResumeData(res.data.parsed_data);
                        setViewMode("builder");
                      } catch (err: any) {
                        alert("Failed to parse resume: " + (err.response?.data?.detail || err.message));
                      }
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  title="Upload PDF Resume"
                />
                <div className="w-16 h-16 rounded-3xl bg-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl shadow-purple-200">
                   <Upload className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Upload & Tailor <span className="text-sm font-normal text-purple-600 bg-purple-50 px-2 py-1 rounded ml-2">PDF</span></h3>
                <p className="text-slate-500 leading-relaxed">Instantly populate the builder from your existing PDF, then let AI tailor it to any JD.</p>
                <div className="mt-8 flex items-center text-purple-600 font-bold gap-2">
                   Select PDF File <Sparkles className="w-4 h-4" />
                </div>
               </div>
          </div>

          {resumes.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-2">Recent Resumes</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {resumes.slice(0, 3).map((res) => (
                  <div key={res.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 hover:border-slate-200 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                       <FileText className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-sm font-bold text-slate-900 truncate">{res.title}</p>
                       <p className="text-xs text-slate-400 uppercase font-bold tracking-tighter">Score: {res.ats_score}%</p>
                    </div>
               </div>
                ))}
              </div>
               </div>
          )}
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
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 rounded-xl"
            >
               <Download className="w-4 h-4" /> Download PDF
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {allSections.filter(s => enabledSections.includes(s.id)).map((sec) => {
                    const Icon = sec.icon;
                    return (
                       <button
                         key={sec.id}
                         onClick={() => setEditingSection(sec.id)}
                         className="group flex flex-col items-start p-6 bg-white border border-slate-100 hover:border-indigo-500/50 rounded-2xl transition-all text-left space-y-4 hover:shadow-xl hover:shadow-indigo-500/5"
                       >
                          <div className="w-12 h-12 rounded-xl bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
                             <Icon className="w-6 h-6 text-slate-400 group-hover:text-indigo-600" />
                          </div>
                          <div className="space-y-1">
                             <h3 className="font-bold text-slate-900 text-lg">{sec.label}</h3>
                             <p className="text-xs text-slate-500 line-clamp-1">{sec.description}</p>
                          </div>
                       </button>
                    );
                 })}
                 
                 <button
                   onClick={() => setShowAddSectionModal(true)}
                   className="group flex flex-col items-center justify-center p-6 bg-white/50 border border-dashed border-slate-200 hover:border-indigo-500/50 rounded-2xl transition-all space-y-3 min-h-[160px]"
                 >
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                       <Plus className="w-6 h-6 text-slate-400 group-hover:text-indigo-600" />
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

           {/* RIGHT: LIVE PREVIEW (Matching User Reference Image) */}
           <div className="bg-[#cbd5e1] overflow-y-auto flex justify-center p-4 xl:p-8 print:bg-white print:p-0 print:overflow-visible custom-scrollbar">
              <div id="resume-preview" className="bg-white w-[8.5in] min-h-[11in] shadow-2xl shrink-0 mx-auto box-border font-serif text-black" style={{ padding: '0.4in 0.6in' }}>

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
                          <a href={resumeData.personal.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                             <Linkedin className="w-2.5 h-2.5" /> LinkedIn
                          </a>
                        </div>
                      )}
                      {resumeData.personal.github && (
                        <div className="flex items-center gap-3">
                          <span className="text-slate-300">|</span>
                          <a href={resumeData.personal.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                             <Github className="w-2.5 h-2.5" /> GitHub
                          </a>
                        </div>
                      )}
                      {resumeData.personal.website && (
                        <div className="flex items-center gap-3">
                          <span className="text-slate-300">|</span>
                          <a href={resumeData.personal.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                             <User className="w-2.5 h-2.5" /> Portfolio
                          </a>
                        </div>
                      )}
                    </div>
               </div>

               {/* Objective Section */}
               {resumeData.objective && (
                 <div className="mb-4">
                    <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Objective</h2>
                    <p className="text-[11px] leading-tight text-slate-800">{resumeData.objective}</p>
                 </div>
               )}

               {/* Education Section */}
               <div className="mb-4">
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
                             <span className="not-italic">{edu.startDate} — {edu.endDate}</span>
                          </div>
                          {edu.gpa && <div className="text-[10.5px]">GPA: {edu.gpa}</div>}
                       </div>
                     )) : (
                        <div className="text-[11px] text-slate-400 italic">No education provided yet...</div>
                     )}
                  </div>
               </div>

               {/* Experience Section */}
               <div className="mb-4">
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

               {/* Leadership Section */}
               {resumeData.leadership.length > 0 && (
                 <div className="mb-4">
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
               )}

               {/* Projects Section */}
               <div className="mb-4">
                  <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Projects</h2>
                  <div className="space-y-3">
                     {resumeData.projects.length > 0 ? resumeData.projects.map((proj, i) => (
                       <div key={i} className="text-[11px] leading-tight">
                          <div className="flex justify-between items-baseline font-bold">
                             <span>{proj.name}</span>
                             <span>{proj.startDate} — {proj.current ? "Present" : proj.endDate}</span>
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

               {/* Research Section */}
               {resumeData.research.length > 0 && (
                 <div className="mb-4">
                    <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Research</h2>
                    <div className="space-y-3">
                       {resumeData.research.map((res, i) => (
                         <div key={i} className="text-[11px] leading-tight">
                            <div className="flex justify-between items-baseline font-bold">
                               <span>{res.name}</span>
                               <span>{res.startDate}</span>
                            </div>
                            {res.tech && <div className="italic text-[10.5px] mb-1">{res.tech}</div>}
                            <p className="text-[10.5px] leading-tight text-slate-800 whitespace-pre-line">{res.description}</p>
                         </div>
                       ))}
                    </div>
               </div>
               )}

               {/* Skills Section */}
               <div className="mb-4">
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

               {/* Awards & Publications */}
               <div className="grid grid-cols-2 gap-8 mb-4">
                  {resumeData.awards.length > 0 && (
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
                  {resumeData.publications.length > 0 && (
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

                {/* Certifications Section */}
                {resumeData.certifications.length > 0 && (
                   <div className="mb-4">
                      <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Certifications</h2>
                      <div className="space-y-1">
                         {resumeData.certifications.map((cert, i) => (
                            <div key={i} className="text-[11px] leading-tight flex justify-between">
                               <div>
                                  <span className="font-bold">{cert.name}</span> — <span>{cert.issuer}</span>
                               </div>
                               <span>{cert.dateObtained}</span>
                            </div>
                         ))}
                      </div>
               </div>
                )}

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
                            className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition-all relative ${
                              isEnabled 
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
                                      <input value={exp.startDate} onChange={(e) => updateListItem("experience", idx, "startDate", e.target.value)} placeholder="MM/YYYY" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                                   </div>
                                   <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">End Date</label>
                                      <input value={exp.endDate} onChange={(e) => updateListItem("experience", idx, "endDate", e.target.value)} placeholder="MM/YYYY" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" disabled={exp.current} />
                                   </div>
                                </div>
                                <div className="flex items-center gap-2">
                                   <input type="checkbox" checked={exp.current} onChange={(e) => updateListItem("experience", idx, "current", e.target.checked)} className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500" />
                                   <span className="text-xs text-slate-400">I currently work here</span>
                                </div>
                                <div className="space-y-1.5">
                                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
                                   <textarea value={exp.description} onChange={(e) => updateListItem("experience", idx, "description", e.target.value)} placeholder="Led development of..." className="w-full h-32 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-sm" />
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
                                      <input value={edu.startDate} onChange={(e) => updateListItem("education", idx, "startDate", e.target.value)} placeholder="MM/YYYY" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                                   </div>
                                   <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">End Date</label>
                                      <input value={edu.endDate} onChange={(e) => updateListItem("education", idx, "endDate", e.target.value)} placeholder="MM/YYYY" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                                   </div>
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
                                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
                                   <textarea value={proj.description} onChange={(e) => updateListItem("projects", idx, "description", e.target.value)} placeholder="Built a responsive..." className="w-full h-24 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-sm" />
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
                                      <input value={cert.dateObtained} onChange={(e) => updateListItem("certifications", idx, "dateObtained", e.target.value)} placeholder="01/2023" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
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
                                      <input value={exp.startDate} onChange={(e) => updateListItem("leadership", idx, "startDate", e.target.value)} placeholder="MM/YYYY" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                                   </div>
                                   <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">End Date</label>
                                      <input value={exp.endDate} onChange={(e) => updateListItem("leadership", idx, "endDate", e.target.value)} placeholder="MM/YYYY" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" disabled={exp.current} />
                                   </div>
                                </div>
                                <div className="flex items-center gap-2">
                                   <input type="checkbox" checked={exp.current} onChange={(e) => updateListItem("leadership", idx, "current", e.target.checked)} className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500" />
                                   <span className="text-xs text-slate-400">I currently lead this</span>
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Achievements</label>
                                   <textarea value={exp.description} onChange={(e) => updateListItem("leadership", idx, "description", e.target.value)} placeholder="Led a team of..." className="w-full h-24 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-sm transition-all" />
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
                                      <input value={res.startDate} onChange={(e) => updateListItem("research", idx, "startDate", e.target.value)} placeholder="MM/YYYY" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                                   </div>
               </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
                                   <textarea value={res.description} onChange={(e) => updateListItem("research", idx, "description", e.target.value)} placeholder="Conducted study on..." className="w-full h-24 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-sm transition-all" />
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
