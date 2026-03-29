// Resume Analyzer — Pure client-side, no LLM
// Scores a resume across 8 dimensions with actionable tips

// ─── Constants ───────────────────────────────────────────────
const ACTION_VERBS = [
  "achieved","administered","analyzed","built","collaborated","conducted","coordinated",
  "created","decreased","delivered","designed","developed","directed","drove","eliminated",
  "engineered","established","exceeded","executed","expanded","generated","grew","guided",
  "headed","identified","implemented","improved","increased","initiated","innovated",
  "integrated","introduced","investigated","launched","led","managed","maximized","mentored",
  "migrated","minimized","modernized","negotiated","optimized","orchestrated","organized",
  "overhauled","oversaw","pioneered","planned","produced","published","raised","redesigned",
  "reduced","refactored","resolved","restructured","revamped","scaled","secured","simplified",
  "spearheaded","streamlined","strengthened","supervised","transformed","unified","upgraded"
];

const QUANTIFIER_PATTERNS = [
  /\d+%/,          // percentages
  /\$[\d,.]+/,     // dollar amounts
  /\d+\+/,         // 10+
  /\d+x/i,         // 3x
  /\d+k\b/i,       // 10K
  /\d+m\b/i,       // 5M
  /\d+(?:,\d+)+/,  // numbers with commas: 1,000
  /\b\d{2,}\b/,    // any number with 2+ digits
];

const WEAK_PHRASES = [
  "responsible for","duties included","helped with","assisted in",
  "worked on","tasked with","in charge of","handled"
];

// ─── Types ───────────────────────────────────────────────────
export interface AnalysisCategory {
  category: string;
  score: number;
  maxScore: number;
  icon: string;
  tips: string[];
}

export interface JDMatchResult {
  percentage: number;
  foundKeywords: string[];
  missingKeywords: string[];
}

export interface ResumeAnalysisResult {
  overallScore: number;
  grade: string;
  breakdown: AnalysisCategory[];
  jdMatch?: JDMatchResult;
  wordCount: number;
  bulletCount: number;
}

// ─── Helper ──────────────────────────────────────────────────
function countBullets(text: string): number {
  if (!text) return 0;
  return text.split("\n").filter(l => l.trim().length > 0).length;
}

function hasQuantifier(text: string): boolean {
  return QUANTIFIER_PATTERNS.some(p => p.test(text));
}

function startsWithActionVerb(line: string): boolean {
  const first = line.trim().replace(/^[•\-\*]\s*/, "").split(/\s/)[0]?.toLowerCase();
  return ACTION_VERBS.includes(first || "");
}

function hasWeakPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  return WEAK_PHRASES.some(p => lower.includes(p));
}

function getGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 40) return "D";
  return "F";
}

// ─── Main Analyzer ───────────────────────────────────────────
export function analyzeResume(
  resumeData: any,
  jobDescription?: string
): ResumeAnalysisResult {
  const breakdown: AnalysisCategory[] = [];

  // ── 1. Contact Completeness (10%) ─────────────────────────
  {
    const p = resumeData.personal || {};
    let score = 0;
    const tips: string[] = [];
    const max = 10;

    if (p.firstName && p.lastName) score += 2; else tips.push("Add your full name");
    if (p.email) score += 2; else tips.push("Add an email address");
    if (p.phone) score += 2; else tips.push("Add a phone number");
    if (p.linkedin) score += 2; else tips.push("Add your LinkedIn profile URL");
    if (p.github || p.website) score += 2; else tips.push("Add GitHub or portfolio link for credibility");

    breakdown.push({ category: "Contact Info", score, maxScore: max, icon: "👤", tips });
  }

  // ── 2. Section Coverage (15%) ─────────────────────────────
  {
    let score = 0;
    const tips: string[] = [];
    const max = 15;

    const hasSummary = !!resumeData.summary || !!resumeData.objective;
    const hasExp = (resumeData.experience || []).length > 0;
    const hasEdu = (resumeData.education || []).length > 0;
    const hasSkills = (resumeData.skills || []).some((c: any) => c.skills?.length > 0);
    const hasProjects = (resumeData.projects || []).length > 0;

    if (hasSummary) score += 3; else tips.push("Add a Professional Summary or Objective — it's the first thing recruiters read");
    if (hasExp) score += 4; else tips.push("Add work experience — this is the most critical section");
    if (hasEdu) score += 3; else tips.push("Add your education details");
    if (hasSkills) score += 3; else tips.push("Add a Skills section with your technical and soft skills");
    if (hasProjects) score += 2; else tips.push("Consider adding projects to showcase practical work");

    breakdown.push({ category: "Section Coverage", score, maxScore: max, icon: "📋", tips });
  }

  // ── 3. Experience Quality (20%) ───────────────────────────
  {
    let score = 0;
    const tips: string[] = [];
    const max = 20;
    const experiences = resumeData.experience || [];

    if (experiences.length === 0) {
      tips.push("Add at least one work experience entry");
      breakdown.push({ category: "Experience Quality", score: 0, maxScore: max, icon: "💼", tips });
    } else {
      let totalBullets = 0;
      let actionVerbBullets = 0;
      let quantifiedBullets = 0;
      let weakPhraseBullets = 0;
      let rolesWithDates = 0;

      for (const exp of experiences) {
        if (exp.startDate) rolesWithDates++;
        const lines = (exp.description || "").split("\n").filter((l: string) => l.trim());
        totalBullets += lines.length;
        for (const line of lines) {
          if (startsWithActionVerb(line)) actionVerbBullets++;
          if (hasQuantifier(line)) quantifiedBullets++;
          if (hasWeakPhrase(line)) weakPhraseBullets++;
        }
      }

      // Score: enough bullet points (4+ per role avg)
      const avgBullets = totalBullets / experiences.length;
      if (avgBullets >= 4) score += 5;
      else if (avgBullets >= 2) { score += 3; tips.push(`Average ${avgBullets.toFixed(1)} bullets per role — aim for 4-6 per position`); }
      else { score += 1; tips.push("Add more bullet points describing your achievements in each role"); }

      // Score: action verbs
      const actionRatio = totalBullets > 0 ? actionVerbBullets / totalBullets : 0;
      if (actionRatio >= 0.6) score += 5;
      else if (actionRatio >= 0.3) { score += 3; tips.push("Start more bullets with strong action verbs (Led, Built, Improved, etc.)"); }
      else { score += 1; tips.push("Use action verbs to begin each bullet point — avoid passive voice"); }

      // Score: quantified achievements
      const quantRatio = totalBullets > 0 ? quantifiedBullets / totalBullets : 0;
      if (quantRatio >= 0.4) score += 5;
      else if (quantRatio >= 0.15) { score += 3; tips.push("Quantify more achievements (%, $, numbers) — currently only " + Math.round(quantRatio * 100) + "% of bullets have metrics"); }
      else { score += 1; tips.push("Add measurable results: 'Increased revenue by 25%' is much stronger than 'Increased revenue'"); }

      // Score: no weak phrases
      if (weakPhraseBullets === 0) score += 3;
      else { score += 1; tips.push(`Remove weak phrases like "responsible for" or "helped with" (found in ${weakPhraseBullets} bullets)`); }

      // Score: dates present
      if (rolesWithDates === experiences.length) score += 2;
      else tips.push("Ensure all roles have start/end dates");

      breakdown.push({ category: "Experience Quality", score, maxScore: max, icon: "💼", tips });
    }
  }

  // ── 4. Skills Depth (10%) ────────────────────────────────
  {
    let score = 0;
    const tips: string[] = [];
    const max = 10;
    const skillCats = resumeData.skills || [];
    const totalSkills = skillCats.reduce((sum: number, c: any) => sum + (c.skills?.length || 0), 0);

    if (totalSkills >= 10) score += 4;
    else if (totalSkills >= 5) { score += 2; tips.push(`You have ${totalSkills} skills — aim for at least 10`); }
    else { tips.push("Add more skills to your resume — recruiters scan this section quickly"); }

    if (skillCats.length >= 2) score += 3;
    else if (skillCats.length === 1) { score += 1; tips.push("Organize skills into categories (Technical, Soft Skills, Tools, etc.)"); }
    else tips.push("Create skill categories for better organization");

    // Check for variety
    const allSkillNames = skillCats.flatMap((c: any) => c.skills || []).map((s: string) => s.toLowerCase());
    const hasFramework = allSkillNames.some((s: string) => /react|angular|vue|django|flask|spring|express|next/i.test(s));
    const hasLanguage = allSkillNames.some((s: string) => /python|javascript|typescript|java|c\+\+|go|rust|swift|kotlin/i.test(s));
    if (hasFramework && hasLanguage) score += 3;
    else if (hasFramework || hasLanguage) { score += 2; tips.push("Include both programming languages AND frameworks/tools"); }
    else tips.push("Specify concrete technologies (e.g., React, Python, AWS) — not just generic terms");

    breakdown.push({ category: "Skills Depth", score, maxScore: max, icon: "⚡", tips });
  }

  // ── 5. Education Detail (10%) ────────────────────────────
  {
    let score = 0;
    const tips: string[] = [];
    const max = 10;
    const edu = resumeData.education || [];

    if (edu.length > 0) {
      score += 3;
      const first = edu[0];
      if (first.degree) score += 2; else tips.push("Specify your degree (e.g., B.S. Computer Science)");
      if (first.school) score += 2; else tips.push("Add your university/institution name");
      if (first.startDate || first.endDate) score += 1; else tips.push("Add graduation date");
      if (first.gpa) score += 2; else tips.push("Consider adding GPA if it's 3.0+ (or equivalent)");
    } else {
      tips.push("Add your education — degree, institution, and graduation date");
    }

    breakdown.push({ category: "Education", score, maxScore: max, icon: "🎓", tips });
  }

  // ── 6. Length & Format (10%) ──────────────────────────────
  {
    let score = 0;
    const tips: string[] = [];
    const max = 10;

    // Count total words across all text fields
    const allText = [
      resumeData.summary || "",
      resumeData.objective || "",
      ...(resumeData.experience || []).map((e: any) => `${e.role} ${e.company} ${e.description}`),
      ...(resumeData.projects || []).map((p: any) => `${p.name} ${p.description}`),
      ...(resumeData.education || []).map((e: any) => `${e.degree} ${e.school}`),
    ].join(" ");
    const wordCount = allText.split(/\s+/).filter(Boolean).length;

    if (wordCount >= 200 && wordCount <= 800) score += 4;
    else if (wordCount >= 100) { score += 2; tips.push(`Resume has ~${wordCount} words — aim for 300-600 for a single-page resume`); }
    else if (wordCount > 800) { score += 2; tips.push(`Resume has ~${wordCount} words — consider trimming to keep it concise (aim for 1-2 pages)`); }
    else { tips.push("Resume content is very thin — add more detail to experience and projects"); }

    // Bullet point count
    const totalBullets = (resumeData.experience || []).reduce((s: number, e: any) =>
      s + (e.description || "").split("\n").filter((l: string) => l.trim()).length, 0
    ) + (resumeData.projects || []).reduce((s: number, p: any) =>
      s + (p.description || "").split("\n").filter((l: string) => l.trim()).length, 0
    );

    if (totalBullets >= 10) score += 3;
    else if (totalBullets >= 5) { score += 2; tips.push(`${totalBullets} bullet points total — aim for 10+ across experience and projects`); }
    else { tips.push("Add more descriptive bullet points to your experience and projects"); }

    // Section balance
    const hasMultipleSections = (resumeData.experience || []).length > 0 &&
      (resumeData.education || []).length > 0 &&
      (resumeData.skills || []).some((c: any) => c.skills?.length > 0);
    if (hasMultipleSections) score += 3;
    else { score += 1; tips.push("A well-balanced resume has at least Experience, Education, and Skills"); }

    breakdown.push({ category: "Length & Format", score, maxScore: max, icon: "📏", tips });
  }

  // ── 7. Consistency (10%) ──────────────────────────────────
  {
    let score = 0;
    const tips: string[] = [];
    const max = 10;

    // Check date consistency
    const allDates = [
      ...(resumeData.experience || []).flatMap((e: any) => [e.startDate, e.endDate].filter(Boolean)),
      ...(resumeData.education || []).flatMap((e: any) => [e.startDate, e.endDate].filter(Boolean)),
      ...(resumeData.projects || []).flatMap((p: any) => [p.startDate, p.endDate].filter(Boolean)),
    ];
    
    if (allDates.length > 0) {
      // Check if dates use consistent format
      const hasSlash = allDates.some((d: string) => d.includes("/"));
      const hasDash = allDates.some((d: string) => d.includes("-") && !d.includes("—"));
      const hasMonthText = allDates.some((d: string) => /[a-zA-Z]/.test(d));
      const formats = [hasSlash, hasDash, hasMonthText].filter(Boolean).length;
      
      if (formats <= 1) score += 4;
      else { score += 2; tips.push("Use a consistent date format throughout (e.g., 'Jan 2024' or '01/2024')"); }
    } else {
      score += 2; // neutral
      tips.push("Add dates to your experience and education entries");
    }

    // Check for empty-looking sections (enabled but no content)
    const emptyExp = (resumeData.experience || []).some((e: any) => !e.role && !e.company);
    const emptyEdu = (resumeData.education || []).some((e: any) => !e.school && !e.degree);
    const emptyProj = (resumeData.projects || []).some((p: any) => !p.name);

    if (!emptyExp && !emptyEdu && !emptyProj) score += 3;
    else { score += 1; tips.push("Remove or complete any blank entries in your sections"); }

    // Professional summary length
    const summary = resumeData.summary || resumeData.objective || "";
    if (summary.length > 0) {
      const summaryWords = summary.split(/\s+/).length;
      if (summaryWords >= 20 && summaryWords <= 80) score += 3;
      else if (summaryWords > 80) { score += 2; tips.push("Keep your summary concise — 2-3 sentences max"); }
      else { score += 1; tips.push("Expand your summary to 2-3 impactful sentences"); }
    } else {
      tips.push("Add a professional summary to make a strong first impression");
    }

    breakdown.push({ category: "Consistency", score, maxScore: max, icon: "✅", tips });
  }

  // ── 8. ATS Keyword Match (15%) — only if JD provided ─────
  let jdMatch: JDMatchResult | undefined;
  {
    let score = 0;
    const tips: string[] = [];
    const max = 15;

    if (jobDescription && jobDescription.trim().length > 20) {
      // Extract keywords from JD (simple tokenization)
      const jdTokens = jobDescription
        .toLowerCase()
        .replace(/[^a-z0-9\s\+\#\.]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 2);
      
      // Build unique meaningful keywords (filter stop words)
      const stopWords = new Set([
        "the","and","for","are","but","not","you","all","can","had","her","was","one","our",
        "out","day","get","has","him","his","how","its","may","new","now","old","see","way",
        "who","did","got","let","say","she","too","use","with","will","have","from","this",
        "that","they","been","each","make","like","long","look","many","some","than","them",
        "then","what","when","your","about","could","other","their","which","would","these",
        "being","doing","during","before","after","should","through","between","into",
        "more","also","back","much","most","such","well","very","just","over","only","must",
        "work","working","experience","years","team","role","ability","strong","knowledge",
        "understanding","including","using","etc","required","preferred","skills","job",
        "position","looking","join","company","opportunity","responsibilities","requirements",
        "qualifications"
      ]);

      // Get multi-word tech terms from JD
      const techPatterns = jobDescription.match(
        /\b(?:machine learning|deep learning|data science|cloud computing|project management|system design|ci\/cd|rest api|web development|full stack|front end|back end|mobile development|agile|scrum|devops|web scraping|natural language processing|computer vision)\b/gi
      ) || [];

      const jdKeywords = [...new Set([
        ...jdTokens
          .filter(w => !stopWords.has(w) && w.length > 2)
          .filter(w => /[a-z]/.test(w)), // must contain letters
        ...techPatterns.map(t => t.toLowerCase())
      ])];

      // Get all resume text
      const resumeText = [
        resumeData.summary || "",
        resumeData.objective || "",
        ...(resumeData.experience || []).map((e: any) => `${e.role} ${e.company} ${e.description}`),
        ...(resumeData.projects || []).map((p: any) => `${p.name} ${p.tech} ${p.description}`),
        ...(resumeData.skills || []).flatMap((c: any) => c.skills || []),
        ...(resumeData.education || []).map((e: any) => `${e.degree} ${e.school}`),
      ].join(" ").toLowerCase();

      const foundKeywords: string[] = [];
      const missingKeywords: string[] = [];

      for (const kw of jdKeywords) {
        if (resumeText.includes(kw)) {
          foundKeywords.push(kw);
        } else {
          missingKeywords.push(kw);
        }
      }

      // Only keep top 15 missing for readability
      const topMissing = missingKeywords.slice(0, 15);
      const matchPct = jdKeywords.length > 0 ? (foundKeywords.length / jdKeywords.length) * 100 : 0;

      jdMatch = { percentage: Math.round(matchPct), foundKeywords, missingKeywords: topMissing };

      if (matchPct >= 70) score += 15;
      else if (matchPct >= 50) { score += 10; tips.push(`${Math.round(matchPct)}% keyword match — add missing terms to boost ATS pass rate`); }
      else if (matchPct >= 30) { score += 6; tips.push(`Only ${Math.round(matchPct)}% keyword overlap — incorporate more JD terms into your resume`); }
      else { score += 2; tips.push("Very low keyword match — tailor your resume using terms from the job description"); }

      if (topMissing.length > 0) {
        tips.push(`Top missing keywords: ${topMissing.slice(0, 8).join(", ")}`);
      }
    } else {
      // No JD provided — give partial score
      score += 8;
      tips.push("Paste a Job Description to get ATS keyword matching analysis");
    }

    breakdown.push({ category: "ATS Keywords", score, maxScore: max, icon: "🔍", tips });
  }

  // ── Calculate Overall ──────────────────────────────────────
  const totalScore = breakdown.reduce((s, b) => s + b.score, 0);
  const totalMax = breakdown.reduce((s, b) => s + b.maxScore, 0);
  const overallScore = Math.round((totalScore / totalMax) * 100);

  // Word count
  const allTextForCount = [
    resumeData.summary || "",
    resumeData.objective || "",
    ...(resumeData.experience || []).map((e: any) => `${e.role} ${e.company} ${e.description}`),
    ...(resumeData.projects || []).map((p: any) => `${p.name} ${p.description}`),
  ].join(" ");
  const wordCount = allTextForCount.split(/\s+/).filter(Boolean).length;
  const bulletCount = (resumeData.experience || []).reduce((s: number, e: any) =>
    s + (e.description || "").split("\n").filter((l: string) => l.trim()).length, 0
  );

  return {
    overallScore,
    grade: getGrade(overallScore),
    breakdown,
    jdMatch,
    wordCount,
    bulletCount
  };
}
