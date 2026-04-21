"use client";

import React from "react";
import { 
  Linkedin, 
  Github, 
  Mail, 
  Phone 
} from "lucide-react";

// --- Types ---
export type Experience = {
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
};

export type Project = {
  name: string;
  tech: string;
  description: string;
  url: string;
  startDate: string;
  endDate: string;
  current: boolean;
};

export type Education = {
  school: string;
  location: string;
  degree: string;
  minor: string;
  gpa: string;
  startDate: string;
  endDate: string;
  current?: boolean;
};

export type Certification = {
  name: string;
  issuer: string;
  dateObtained: string;
  expirationDate: string;
  credentialId: string;
  url: string;
};

export type SkillCategory = {
  name: string;
  skills: string[];
};

export type ResumeData = {
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
  leadership: Experience[];
  research: Project[];
  awards: { title: string; issuer: string; date: string; description?: string }[];
  publications: { title: string; publisher: string; date: string; url: string; description?: string }[];
};

interface ResumePreviewProps {
  data: ResumeData;
  enabledSections?: string[];
  scale?: number;
}

// --- Helper: Ensure a URL has a protocol prefix ---
function ensureUrl(url: string, type?: "linkedin" | "github"): string {
  if (!url || !url.trim()) return url;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("mailto:")) return trimmed;
  if (!trimmed.includes(".") && !trimmed.includes("/")) {
    if (type === "linkedin") return `https://linkedin.com/in/${trimmed}`;
    if (type === "github") return `https://github.com/${trimmed}`;
  }
  return `https://${trimmed}`;
}

function normalizeMultiline(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeMultiline(item))
      .filter((line) => line.trim())
      .join("\n");
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("description" in record) {
      return normalizeMultiline(record.description);
    }
    if ("text" in record) {
      return normalizeMultiline(record.text);
    }
    return Object.values(record)
      .map((item) => (typeof item === "string" ? item : ""))
      .filter((line) => line.trim())
      .join("\n");
  }
  return "";
}

function bulletLines(value: unknown): string[] {
  return normalizeMultiline(value)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[•\-\*]\s*/, ""));
}

const ResumePreview: React.FC<ResumePreviewProps> = ({ 
  data, 
  enabledSections = ["personal", "summary", "experience", "projects", "education", "skills"],
  scale = 1
}) => {
  const resumeData = data;

  return (
    <div 
      className="bg-white shadow-2xl mx-auto origin-top transition-transform duration-300 pointer-events-auto"
      style={{
        width: "8.5in",
        minHeight: "11in",
        padding: "0.4in 0.6in",
        transform: `scale(${scale})`,
        color: "black",
        fontFamily: "'Inter', sans-serif"
      }}
      id="resume-preview"
    >
      <div className="resume-content flex flex-col h-full text-black">
        {/* Header Section (Personal Info) */}
        <div className="text-center mb-4 border-b-2 border-black pb-2">
          <h1 className="text-[24px] font-black uppercase tracking-tight leading-tight">
            {resumeData.personal.firstName} {resumeData.personal.lastName}
          </h1>
          <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 mt-1 text-[11px]">
            {resumeData.personal.email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" /> {resumeData.personal.email}
              </span>
            )}
            {resumeData.personal.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" /> {resumeData.personal.phone}
              </span>
            )}
            {resumeData.personal.linkedin && (
              <span className="flex items-center gap-1">
                <Linkedin className="w-3 h-3" /> {resumeData.personal.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '')}
              </span>
            )}
            {resumeData.personal.github && (
              <span className="flex items-center gap-1">
                <Github className="w-3 h-3" /> {resumeData.personal.github.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
              </span>
            )}
            {resumeData.personal.website && (
              <span className="flex items-center gap-1">
                {resumeData.personal.website}
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Sections */}
        {enabledSections.map((secId) => {
          switch (secId) {
            case "summary":
              return resumeData.summary ? (
                <div key={secId} className="mb-4">
                  <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Summary</h2>
                  <p className="text-[11px] leading-relaxed text-justify whitespace-pre-wrap">{resumeData.summary}</p>
                </div>
              ) : null;

            case "objective":
              return resumeData.objective ? (
                <div key={secId} className="mb-4">
                  <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Objective</h2>
                  <p className="text-[11px] leading-relaxed text-justify whitespace-pre-wrap">{resumeData.objective}</p>
                </div>
              ) : null;

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
                        {(() => {
                          const lines = bulletLines(exp.description);
                          if (!lines.length) return null;
                          return (
                            <ul className="list-disc ml-4 space-y-0.5 text-[10.5px]">
                              {lines.map((line, j) => (
                                <li key={j}>{line}</li>
                              ))}
                            </ul>
                          );
                        })()}
                      </div>
                    )) : (
                      <div className="text-[11px] text-gray-400 italic">No work experience provided yet...</div>
                    )}
                  </div>
                </div>
              );

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
                          <span className="not-italic">{edu.startDate} — {edu.current ? "Present" : edu.endDate}</span>
                        </div>
                        {edu.gpa && <div className="text-[10.5px]">GPA: {edu.gpa}</div>}
                      </div>
                    )) : (
                      <div className="text-[11px] text-gray-400 italic">No education provided yet...</div>
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
                          {proj.url ? (
                            <a href={ensureUrl(proj.url, "github")} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {proj.name}
                            </a>
                          ) : <span>{proj.name}</span>}
                          <span>{proj.startDate}{proj.startDate || proj.endDate || proj.current ? " — " : ""}{proj.current ? "Present" : proj.endDate}</span>
                        </div>
                        {proj.tech && <div className="italic text-[10.5px] mb-1">{proj.tech}</div>}
                        {(() => {
                          const lines = bulletLines(proj.description);
                          if (!lines.length) return null;
                          return (
                            <ul className="list-disc ml-4 space-y-0.5 text-[10.5px]">
                              {lines.map((line, j) => (
                                <li key={j}>{line}</li>
                              ))}
                            </ul>
                          );
                        })()}
                      </div>
                    )) : (
                      <div className="text-[11px] text-gray-400 italic">No projects provided yet...</div>
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
                      <div className="text-[11px] text-gray-400 italic">No skills provided yet...</div>
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
                        {(() => {
                          const lines = bulletLines(exp.description);
                          if (!lines.length) return null;
                          return (
                            <ul className="list-disc ml-4 space-y-0.5 text-[10.5px]">
                              {lines.map((line, j) => (
                                <li key={j}>{line}</li>
                              ))}
                            </ul>
                          );
                        })()}
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
                        {(() => {
                          const lines = bulletLines(res.description);
                          if (!lines.length) return null;
                          return (
                            <ul className="list-disc ml-4 space-y-0.5 text-[10.5px]">
                              {lines.map((line, j) => (
                                <li key={j}>{line}</li>
                              ))}
                            </ul>
                          );
                        })()}
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
              // Handle combined layout logic if both are passed, but simple for now
              if (secId === "awards") {
                return resumeData.awards.length > 0 ? (
                  <div key={secId} className="mb-4">
                    <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Awards & Honors</h2>
                    <div className="space-y-2">
                      {resumeData.awards.map((award, i) => (
                        <div key={i} className="text-[11px] leading-tight">
                          <div className="flex justify-between font-bold">
                            <span>{award.title}</span>
                            <span>{award.date}</span>
                          </div>
                          <div className="text-[10.5px] italic text-gray-600">{award.issuer}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              }
              if (secId === "publications") {
                return resumeData.publications.length > 0 ? (
                  <div key={secId} className="mb-4">
                    <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5 uppercase tracking-wider">Publications</h2>
                    <div className="space-y-2">
                      {resumeData.publications.map((pub, i) => (
                        <div key={i} className="text-[11px] leading-tight">
                          <div className="flex justify-between font-bold">
                            <span>{pub.title}</span>
                            <span>{pub.date}</span>
                          </div>
                          <div className="text-[10.5px] italic text-gray-600">{pub.publisher}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              }
              return null;

            default:
              return null;
          }
        })}
      </div>
      <style jsx>{`
        #resume-preview {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      `}</style>
    </div>
  );
};

export default ResumePreview;
