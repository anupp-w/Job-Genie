"use client";

import React from "react";
import { 
  BookOpen, 
  Play, 
  Award, 
  CheckCircle2 
} from "lucide-react";

const courses = [
  {
    id: 1,
    title: "Advanced React Patterns",
    platform: "Udemy",
    progress: 75,
    match: "Required for Senior Frontend Role"
  },
  {
    id: 2,
    title: "System Design for Interviews",
    platform: "Educative.io",
    progress: 30, 
    match: "Highly Recommended"
  }
];

export default function LearningPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-[var(--foreground)]">Skill Builder</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Courses recommended to close your skill gaps.</p>
        </div>
      </div>

      {/* Course List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.map(course => (
          <div key={course.id} className="p-6 rounded-xl surface-panel hover:border-[var(--accent-2)]/20 transition-all group shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-500">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]">
                {course.platform}
              </span>
            </div>
            
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1 group-hover:text-indigo-500 transition-colors">
              {course.title}
            </h3>
            <p className="text-xs text-amber-600 mb-6 flex items-center gap-1.5">
              <Award className="w-3 h-3 text-amber-500" />
              {course.match}
            </p>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[var(--muted)]">
                <span>Progress</span>
                <span>{course.progress}%</span>
              </div>
              <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>

            <button className="w-full mt-6 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface)] transition-all flex items-center justify-center gap-2 shadow-sm">
              <Play className="w-4 h-4 fill-current" />
              Continue Learning
            </button>
          </div>
        ))}

        {/* Placeholder for 'Add New' */}
        <button className="p-6 rounded-xl border border-dashed border-[var(--border)] hover:border-[var(--accent-2)]/30 hover:bg-[var(--surface-2)] flex flex-col items-center justify-center gap-3 transition-all group min-h-[200px]">
          <div className="p-4 rounded-full bg-[var(--surface-2)] group-hover:bg-[var(--surface)] transition-colors">
             <BookOpen className="w-6 h-6 text-[var(--muted)] group-hover:text-[var(--foreground)]" />
          </div>
          <span className="text-sm font-medium text-[var(--muted)] group-hover:text-[var(--foreground)]">Browse Course Library</span>
        </button>
      </div>
    </div>
  );
}
