"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Star, Loader2, ArrowLeft, Trophy } from "lucide-react";
import api from "@/services/api";

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await api.get(`/interviews/${id}/results`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      }
    }
    if (id) fetchResults();
  }, [id]);

  if (!data) return <div className="flex justify-center flex-col items-center min-h-[60vh] gap-4"><Loader2 className="animate-spin w-8 h-8 text-indigo-500" /><p className="text-[var(--muted)]">Tabulating your score...</p></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-[var(--surface-1)] shadow-sm border border-[var(--border)]">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/dashboard/interviews")} className="p-2 bg-[var(--surface-2)] rounded-full hover:bg-[var(--border)] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-emerald-500">Interview Completed</h1>
            <p className="text-[var(--muted)] mt-1 font-medium">{data.session.job_title}</p>
          </div>
        </div>
        <div className="md:text-right flex items-center md:items-end flex-col bg-[var(--surface-2)] px-6 py-3 rounded-xl border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-amber-500" />
            <div className="text-3xl font-bold text-[var(--foreground)]">{data.average_score}<span className="text-xl text-[var(--muted)]">/10</span></div>
          </div>
          <div className="text-xs uppercase tracking-wider font-semibold text-[var(--muted)]">Average Score</div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">Detailed Breakdown</h2>
        {data.results.map((item: any, idx: number) => (
          <div key={idx} className="p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] shadow-sm space-y-4 transition-all hover:border-[var(--accent-2)]/30">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <h3 className="font-semibold text-[15px] text-[var(--foreground)] leading-snug max-w-2xl">
                <span className="text-[var(--muted)] mr-2">Q{item.question.question_number}.</span> 
                {item.question.question_text}
              </h3>
              <div className="shrink-0 px-4 py-1.5 bg-[var(--accent-2)]/10 text-[var(--accent-2)] rounded-full text-sm font-bold flex gap-2 items-center border border-[var(--accent-2)]/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                <Star className="w-4 h-4 fill-[var(--accent-2)]" /> {item.answer.final_score}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]/50">
              <div>
                <span className="text-xs uppercase tracking-wide font-bold text-[var(--muted)] block mb-2">Your Answer</span>
                <div className="text-sm text-[var(--foreground)] bg-[var(--surface-2)] p-4 rounded-xl leading-relaxed">
                  "{item.answer.user_answer}"
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-xs uppercase tracking-wide font-bold text-emerald-500 block mb-2">Ideal Pattern</span>
                  <div className="text-sm text-[var(--foreground)] bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20 leading-relaxed font-medium">
                    {item.answer.ideal_answer}
                  </div>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wide font-bold text-indigo-500 block mb-2 flex items-center gap-1">Coach Feedback</span>
                  <p className="text-sm text-[var(--foreground)] leading-relaxed font-medium">{item.answer.llm_feedback}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
