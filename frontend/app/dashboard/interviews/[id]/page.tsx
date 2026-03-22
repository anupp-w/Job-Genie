"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Mic, Send, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import api from "@/services/api";

export default function InterviewChatPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id;

  const [question, setQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const fetchNextQuestion = async () => {
    try {
      setLoading(true);
      setError("");
      setResult(null);
      setAnswer("");
      
      const res = await api.get(`/interviews/${sessionId}/next`);
      
      if (res.data.message === "All questions completed") {
        router.push(`/dashboard/interviews/${sessionId}/results`);
      } else if (res.data.id) {
        setQuestion(res.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || "Failed to load next question.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchNextQuestion();
    }
  }, [sessionId]);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    try {
      setSubmitting(true);
      setError("");
      const res = await api.post(`/interviews/${sessionId}/answer/${question.id}`, {
        user_answer: answer
      });
      setResult(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to submit answer.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--muted)]">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
        <p>Loading your next question...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--muted)]">
        <AlertCircle className="w-8 h-8 mb-4 text-rose-500" />
        <p>{error || "Could not load question."}</p>
        <button onClick={() => router.push("/dashboard/interviews")} className="mt-4 text-indigo-500 hover:underline">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <span className="text-xs font-semibold px-2 py-1 rounded bg-indigo-500/10 text-indigo-500 uppercase tracking-wide">
            {question.question_type} • Question {question.question_number}/10
          </span>
          <h1 className="text-2xl font-semibold mt-3 text-[var(--foreground)]">
            {question.question_text}
          </h1>
        </div>
      </div>

      {!result ? (
        <div className="space-y-4">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={submitting}
            placeholder="Type your answer here, be as detailed as possible."
            className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 min-h-[200px] text-[var(--foreground)] focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all resize-none shadow-sm"
          />
          <div className="flex items-center justify-end">
            <button 
              onClick={handleSubmit} 
              disabled={submitting || !answer.trim()}
              className="flex items-center gap-2 bg-[var(--accent-2)] hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {submitting ? "Analyzing..." : "Submit Answer"}
            </button>
          </div>
          {error && <p className="text-rose-500 text-sm mt-2">{error}</p>}
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Feedback & Score</h3>
              <div className="flex items-center gap-2 bg-[var(--surface-2)] px-4 py-2 rounded-xl border border-[var(--border)]">
                <span className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">Composite Score:</span>
                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-emerald-500">
                  {result.final_score}/10
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l"></div>
                <p className="text-xs text-[var(--muted)] uppercase font-medium tracking-wide">Semantic Match</p>
                <p className="text-xl font-semibold text-[var(--foreground)] mt-2">{result.score_breakdown?.semantic_score?.toFixed(1) || 0}<span className="text-sm text-[var(--muted)] ml-1">/ 10</span></p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l"></div>
                <p className="text-xs text-[var(--muted)] uppercase font-medium tracking-wide">Keyword Coverage</p>
                <p className="text-xl font-semibold text-[var(--foreground)] mt-2">{result.score_breakdown?.keyword_score?.toFixed(1) || 0}<span className="text-sm text-[var(--muted)] ml-1">/ 10</span></p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l"></div>
                <p className="text-xs text-[var(--muted)] uppercase font-medium tracking-wide">Length / Detail</p>
                <p className="text-xl font-semibold text-[var(--foreground)] mt-2">{result.score_breakdown?.length_score?.toFixed(1) || 0}<span className="text-sm text-[var(--muted)] ml-1">/ 10</span></p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="flex flex-col h-full">
                  <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Your Answer
                  </h4>
                  <div className="flex-1 p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--foreground)] leading-relaxed font-medium">
                    "{result.user_answer}"
                  </div>
                </div>
                <div className="flex flex-col h-full">
                  <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Ideal Answer Pattern
                  </h4>
                  <div className="flex-1 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-sm text-[var(--foreground)] leading-relaxed font-medium">
                    "{result.ideal_answer}"
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Coach Analysis
                </h4>
                <div className="p-4 rounded-xl bg-indigo-500/5 text-sm text-[var(--foreground)] leading-relaxed font-medium">
                  {result.llm_feedback}
                </div>
                {result.score_breakdown?.matched_keywords?.length > 0 && (
                  <div className="mt-4 p-4 rounded-xl bg-emerald-500/5 text-sm">
                    <span className="font-semibold text-emerald-600 block mb-1">Matched keywords in your answer:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {result.score_breakdown.matched_keywords.map((kw: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-xs font-medium border border-emerald-500/20">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.score_breakdown?.missing_keywords?.length > 0 && (
                  <div className="mt-4 p-4 rounded-xl bg-rose-500/5 text-sm">
                    <span className="font-semibold text-rose-500 block mb-1">Missing keywords that would boost your score:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {result.score_breakdown.missing_keywords.map((kw: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-rose-500/10 text-rose-600 rounded-lg text-xs font-medium border border-rose-500/20">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button 
              onClick={fetchNextQuestion}
              className="flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)] px-6 py-3 rounded-xl font-medium shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              {question.question_number === 10 ? "Finish Interview" : "Continue to Next"} <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
