import {
   Document, Packer, Paragraph, TextRun, ExternalHyperlink,
   HeadingLevel, AlignmentType, BorderStyle, TabStopPosition, TabStopType,
   convertInchesToTwip, SectionType,
} from "docx";
import { saveAs } from "file-saver";

// ── Types ──
type ResumeData = {
   title: string;
   personal: {
      firstName: string; lastName: string; phone: string; email: string;
      linkedin: string; github: string; website: string;
   };
   summary: string;
   objective: string;
   experience: { role: string; company: string; location: string; startDate: string; endDate: string; current: boolean; description: string }[];
   projects: { name: string; tech: string; description: string; url: string; startDate: string; endDate: string; current: boolean }[];
   education: { school: string; location: string; degree: string; minor: string; gpa: string; startDate: string; endDate: string }[];
   skills: { name: string; skills: string[] }[];
   certifications: { name: string; issuer: string; dateObtained: string; expirationDate: string; credentialId: string; url: string }[];
   leadership: { role: string; company: string; location: string; startDate: string; endDate: string; current: boolean; description: string }[];
   research: { name: string; tech: string; description: string; url: string; startDate: string; endDate: string; current: boolean }[];
   awards: { title: string; issuer: string; date: string; description: string }[];
   publications: { title: string; publisher: string; date: string; url: string; description: string }[];
};

// ── Constants ──
const FONT = "Times New Roman";
const PT_BODY = 22;       // half-points (11pt)
const PT_BULLETS = 21;    // half-points (10.5pt)
const PT_HEADER = 26;     // half-points (13pt)
const PT_NAME = 44;       // half-points (22pt)
const PT_CONTACT = 21;    // half-points (10.5pt)
const RIGHT_TAB = convertInchesToTwip(7.3); // content width for right-aligned tab stops

function ensureUrl(url: string, type?: "linkedin" | "github"): string {
   if (!url || !url.trim()) return url;
   const t = url.trim();
   if (t.startsWith("http://") || t.startsWith("https://")) return t;
   if (t.startsWith("mailto:")) return t;
   if (!t.includes(".") && !t.includes("/")) {
      if (type === "linkedin") return `https://linkedin.com/in/${t}`;
      if (type === "github") return `https://github.com/${t}`;
   }
   return `https://${t}`;
}

// ── Builders ──
function sectionHeader(title: string): Paragraph {
   return new Paragraph({
      spacing: { before: 120, after: 60 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" } },
      children: [
         new TextRun({ text: title.toUpperCase(), bold: true, font: FONT, size: PT_HEADER }),
      ],
   });
}

function twoColumnRow(left: TextRun[], right: TextRun[], spacing?: { before?: number; after?: number }): Paragraph {
   return new Paragraph({
      spacing: spacing || {},
      tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
      children: [...left, new TextRun({ text: "\t", font: FONT }), ...right],
   });
}

function bulletParagraph(text: string): Paragraph {
   return new Paragraph({
      spacing: { after: 20 },
      indent: { left: convertInchesToTwip(0.167), hanging: convertInchesToTwip(0.167) },
      children: [
         new TextRun({ text: "• ", font: FONT, size: PT_BULLETS }),
         new TextRun({ text: text, font: FONT, size: PT_BULLETS }),
      ],
   });
}

function parseBullets(description: string): Paragraph[] {
   return description
      .split("\n")
      .map(b => b.replace(/^[\s•\-\*]+/, "").trim())
      .filter(Boolean)
      .map(b => bulletParagraph(b));
}

function emptyLine(): Paragraph {
   return new Paragraph({ spacing: { after: 0 }, children: [] });
}

// ══════════════════════════════════════════════
// Main generator
// ══════════════════════════════════════════════
export async function generateResumeDocx(data: ResumeData, enabledSections: string[]): Promise<void> {
   const paragraphs: Paragraph[] = [];

   // ── HEADER: Name ──
   const fullName = `${data.personal.firstName} ${data.personal.lastName}`.trim();
   if (fullName) {
      paragraphs.push(new Paragraph({
         alignment: AlignmentType.CENTER,
         spacing: { after: 40 },
         children: [new TextRun({ text: fullName.toUpperCase(), bold: true, font: FONT, size: PT_NAME })],
      }));
   }

   // ── Contact line ──
   const contactChildren: (TextRun | ExternalHyperlink)[] = [];
   const addContact = (label: string, url?: string) => {
      if (contactChildren.length > 0) {
         contactChildren.push(new TextRun({ text: "  |  ", font: FONT, size: PT_CONTACT, color: "94a3b8" }));
      }
      if (url) {
         contactChildren.push(new ExternalHyperlink({
            link: url,
            children: [new TextRun({ text: label, font: FONT, size: PT_CONTACT, style: "Hyperlink" })],
         }));
      } else {
         contactChildren.push(new TextRun({ text: label, font: FONT, size: PT_CONTACT }));
      }
   };

   if (data.personal.phone) addContact(data.personal.phone);
   if (data.personal.email) addContact(data.personal.email, `mailto:${data.personal.email}`);
   if (data.personal.linkedin) addContact("linkedin.com/in/" + (data.personal.linkedin.includes("/") ? data.personal.linkedin.split("/").pop() : data.personal.linkedin), ensureUrl(data.personal.linkedin, "linkedin"));
   if (data.personal.github) addContact("github.com/" + (data.personal.github.includes("/") ? data.personal.github.split("/").pop() : data.personal.github), ensureUrl(data.personal.github, "github"));
   if (data.personal.website) addContact("Portfolio", ensureUrl(data.personal.website));

   if (contactChildren.length > 0) {
      paragraphs.push(new Paragraph({
         alignment: AlignmentType.CENTER,
         spacing: { after: 80 },
         children: contactChildren,
      }));
   }

   // ── Section renderers ──
   const renderSummary = () => {
      if (!data.summary?.trim()) return;
      paragraphs.push(sectionHeader("Professional Summary"));
      paragraphs.push(new Paragraph({
         spacing: { after: 40 },
         children: [new TextRun({ text: data.summary, font: FONT, size: PT_BODY, color: "475569" })],
      }));
   };

   const renderObjective = () => {
      if (!data.objective?.trim()) return;
      paragraphs.push(sectionHeader("Objective"));
      paragraphs.push(new Paragraph({
         spacing: { after: 40 },
         children: [new TextRun({ text: data.objective, font: FONT, size: PT_BODY })],
      }));
   };

   const renderExperience = () => {
      if (!data.experience.length) return;
      paragraphs.push(sectionHeader("Experience"));
      data.experience.forEach((exp, i) => {
         if (i > 0) paragraphs.push(emptyLine());
         // Role — Dates
         paragraphs.push(twoColumnRow(
            [new TextRun({ text: exp.role || "", bold: true, font: FONT, size: PT_BODY })],
            [new TextRun({ text: `${exp.startDate} — ${exp.current ? "Present" : exp.endDate}`, bold: true, font: FONT, size: PT_BODY })],
         ));
         // Company — Location
         if (exp.company || exp.location) {
            paragraphs.push(twoColumnRow(
               [new TextRun({ text: exp.company || "", italics: true, font: FONT, size: PT_BODY })],
               [new TextRun({ text: exp.location || "", italics: true, font: FONT, size: PT_BODY })],
               { after: 30 },
            ));
         }
         if (exp.description?.trim()) paragraphs.push(...parseBullets(exp.description));
      });
   };

   const renderProjects = () => {
      if (!data.projects.length) return;
      paragraphs.push(sectionHeader("Projects"));
      data.projects.forEach((proj, i) => {
         if (i > 0) paragraphs.push(emptyLine());
         // Name (optionally linked) — Dates
         const nameChildren: (TextRun | ExternalHyperlink)[] = [];
         if (proj.url?.trim()) {
            nameChildren.push(new ExternalHyperlink({
               link: ensureUrl(proj.url),
               children: [new TextRun({ text: proj.name || "", bold: true, font: FONT, size: PT_BODY, style: "Hyperlink" })],
            }));
         } else {
            nameChildren.push(new TextRun({ text: proj.name || "", bold: true, font: FONT, size: PT_BODY }));
         }
         const dateStr = `${proj.startDate}${proj.startDate || proj.endDate || proj.current ? " — " : ""}${proj.current ? "Present" : proj.endDate}`;
         paragraphs.push(new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
            children: [
               ...nameChildren,
               new TextRun({ text: "\t", font: FONT }),
               new TextRun({ text: dateStr, bold: true, font: FONT, size: PT_BODY }),
            ],
         }));
         // Tech stack
         if (proj.tech) {
            paragraphs.push(new Paragraph({
               spacing: { after: 30 },
               children: [new TextRun({ text: proj.tech, italics: true, font: FONT, size: PT_BULLETS })],
            }));
         }
         if (proj.description?.trim()) paragraphs.push(...parseBullets(proj.description));
      });
   };

   const renderEducation = () => {
      paragraphs.push(sectionHeader("Education"));
      if (data.education.length > 0) {
         data.education.forEach((edu, i) => {
            if (i > 0) paragraphs.push(emptyLine());
            // School — Location
            paragraphs.push(twoColumnRow(
               [new TextRun({ text: edu.school || "", bold: true, font: FONT, size: PT_BODY })],
               [new TextRun({ text: `${edu.startDate} — ${edu.endDate}`, font: FONT, size: PT_BODY })],
            ));
            // Degree — Dates
            const degText = edu.degree + (edu.minor ? `, Minor in ${edu.minor}` : "");
            paragraphs.push(twoColumnRow(
               [new TextRun({ text: degText, italics: true, font: FONT, size: PT_BODY })],
               [new TextRun({ text: edu.location || "", font: FONT, size: PT_BODY })],
            ));
            if (edu.gpa) {
               paragraphs.push(new Paragraph({
                  children: [new TextRun({ text: `GPA: ${edu.gpa}`, font: FONT, size: PT_BULLETS })],
               }));
            }
         });
      } else {
         paragraphs.push(new Paragraph({
            children: [new TextRun({ text: "No education provided yet...", italics: true, font: FONT, size: PT_BODY, color: "94a3b8" })],
         }));
      }
   };

   const renderSkills = () => {
      paragraphs.push(sectionHeader("Skills"));
      for (const cat of data.skills) {
         paragraphs.push(new Paragraph({
            spacing: { after: 20 },
            children: [
               new TextRun({ text: `${cat.name}: `, bold: true, font: FONT, size: PT_BODY }),
               new TextRun({ text: cat.skills.join(", "), font: FONT, size: PT_BODY }),
            ],
         }));
      }
   };

   const renderCertifications = () => {
      if (!data.certifications.length) return;
      paragraphs.push(sectionHeader("Certifications"));
      for (const cert of data.certifications) {
         const nameChildren: (TextRun | ExternalHyperlink)[] = [];
         if (cert.url?.trim()) {
            nameChildren.push(new ExternalHyperlink({
               link: ensureUrl(cert.url),
               children: [new TextRun({ text: cert.name || "", bold: true, font: FONT, size: PT_BODY, style: "Hyperlink" })],
            }));
         } else {
            nameChildren.push(new TextRun({ text: cert.name || "", bold: true, font: FONT, size: PT_BODY }));
         }
         paragraphs.push(new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
            children: [
               ...nameChildren,
               new TextRun({ text: "\t", font: FONT }),
               new TextRun({ text: cert.dateObtained || "", font: FONT, size: PT_BODY }),
            ],
         }));
         if (cert.issuer) {
            paragraphs.push(new Paragraph({
               children: [new TextRun({ text: cert.issuer, italics: true, font: FONT, size: PT_BULLETS, color: "475569" })],
            }));
         }
      }
   };

   const renderLeadership = () => {
      if (!data.leadership.length) return;
      paragraphs.push(sectionHeader("Leadership"));
      data.leadership.forEach((exp, i) => {
         if (i > 0) paragraphs.push(emptyLine());
         paragraphs.push(twoColumnRow(
            [new TextRun({ text: exp.role || "", bold: true, font: FONT, size: PT_BODY })],
            [new TextRun({ text: `${exp.startDate} — ${exp.current ? "Present" : exp.endDate}`, bold: true, font: FONT, size: PT_BODY })],
         ));
         if (exp.company) {
            paragraphs.push(new Paragraph({
               spacing: { after: 30 },
               children: [new TextRun({ text: exp.company, italics: true, font: FONT, size: PT_BODY })],
            }));
         }
         if (exp.description?.trim()) paragraphs.push(...parseBullets(exp.description));
      });
   };

   const renderResearch = () => {
      if (!data.research.length) return;
      paragraphs.push(sectionHeader("Research"));
      data.research.forEach((res, i) => {
         if (i > 0) paragraphs.push(emptyLine());
         const nameChildren: (TextRun | ExternalHyperlink)[] = [];
         if (res.url?.trim()) {
            nameChildren.push(new ExternalHyperlink({
               link: ensureUrl(res.url),
               children: [new TextRun({ text: res.name || "", bold: true, font: FONT, size: PT_BODY, style: "Hyperlink" })],
            }));
         } else {
            nameChildren.push(new TextRun({ text: res.name || "", bold: true, font: FONT, size: PT_BODY }));
         }
         const dateStr = `${res.startDate}${res.startDate || res.endDate || res.current ? " — " : ""}${res.current ? "Present" : res.endDate}`;
         paragraphs.push(new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
            children: [...nameChildren, new TextRun({ text: "\t", font: FONT }), new TextRun({ text: dateStr, bold: true, font: FONT, size: PT_BODY })],
         }));
         if (res.tech) paragraphs.push(new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: res.tech, italics: true, font: FONT, size: PT_BULLETS })] }));
         if (res.description?.trim()) paragraphs.push(...parseBullets(res.description));
      });
   };

   const renderAwards = () => {
      if (!data.awards.length) return;
      paragraphs.push(sectionHeader("Awards & Honors"));
      for (const award of data.awards) {
         paragraphs.push(twoColumnRow(
            [new TextRun({ text: award.title || "", bold: true, font: FONT, size: PT_BODY })],
            [new TextRun({ text: award.date || "", font: FONT, size: PT_BODY })],
         ));
         if (award.issuer) paragraphs.push(new Paragraph({ children: [new TextRun({ text: award.issuer, italics: true, font: FONT, size: PT_BULLETS, color: "475569" })] }));
      }
   };

   const renderPublications = () => {
      if (!data.publications.length) return;
      paragraphs.push(sectionHeader("Publications"));
      for (const pub of data.publications) {
         const nameChildren: (TextRun | ExternalHyperlink)[] = [];
         if (pub.url?.trim()) {
            nameChildren.push(new ExternalHyperlink({
               link: ensureUrl(pub.url),
               children: [new TextRun({ text: pub.title || "", bold: true, font: FONT, size: PT_BODY, style: "Hyperlink" })],
            }));
         } else {
            nameChildren.push(new TextRun({ text: pub.title || "", bold: true, font: FONT, size: PT_BODY }));
         }
         paragraphs.push(new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
            children: [...nameChildren, new TextRun({ text: "\t", font: FONT }), new TextRun({ text: pub.date || "", font: FONT, size: PT_BODY })],
         }));
         if (pub.publisher) paragraphs.push(new Paragraph({ children: [new TextRun({ text: pub.publisher, italics: true, font: FONT, size: PT_BULLETS, color: "475569" })] }));
      }
   };

   // ── Render in enabledSections order ──
   const renderers: Record<string, () => void> = {
      summary: renderSummary, objective: renderObjective,
      experience: renderExperience, projects: renderProjects,
      education: renderEducation, skills: renderSkills,
      certifications: renderCertifications, leadership: renderLeadership,
      research: renderResearch, awards: renderAwards,
      publications: renderPublications,
   };

   for (const id of enabledSections) {
      if (id === "personal") continue;
      renderers[id]?.();
   }

   // ── Build and save ──
   const doc = new Document({
      sections: [{
         properties: {
            page: {
               margin: {
                  top: convertInchesToTwip(0.4),
                  bottom: convertInchesToTwip(0.4),
                  left: convertInchesToTwip(0.6),
                  right: convertInchesToTwip(0.6),
               },
               size: { width: convertInchesToTwip(8.5), height: convertInchesToTwip(11) },
            },
         },
         children: paragraphs,
      }],
   });

   const blob = await Packer.toBlob(doc);
   const fileName = (data.title || "Resume").replace(/[^a-zA-Z0-9 ]/g, "_") + ".docx";
   saveAs(blob, fileName);
}
