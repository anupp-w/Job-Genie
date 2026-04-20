'use client';

import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/common";
import {
  Sparkles,
  Search,
  MessageSquare,
  CheckCircle2,
  Target,
  FileText,
  Eye,
  LineChart,
  ArrowRight
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-zinc-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="w-full z-50">
        <Navbar />
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 sm:pt-40 sm:pb-24 lg:pb-32 overflow-hidden flex flex-col items-center">
        {/* Background Gradients */}
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>

        <div className="max-w-4xl mx-auto text-center z-10">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-1.5 text-sm font-medium text-indigo-600 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
            Introducing Job Genie
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 mb-6 drop-shadow-sm">
            AI career analytics <br className="hidden md:block" />
            <span className="text-zinc-400 font-medium tracking-normal">for modern job seekers</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-600 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            Track, analyze, and optimize your application performance on ATS platforms through key metrics like
            <span className="inline-flex items-center gap-1 mx-1.5 px-2.5 py-0.5 rounded-md bg-white border border-zinc-200 text-sm font-medium shadow-sm"><Eye className="w-4 h-4 text-zinc-400" /> Visibility</span>,
            <span className="inline-flex items-center gap-1 mx-1.5 px-2.5 py-0.5 rounded-md bg-white border border-zinc-200 text-sm font-medium shadow-sm"><Target className="w-4 h-4 text-zinc-400" /> Match Rate</span>,
            and
            <span className="inline-flex items-center gap-1 ml-1.5 px-2.5 py-0.5 rounded-md bg-white border border-zinc-200 text-sm font-medium shadow-sm"><LineChart className="w-4 h-4 text-zinc-400" /> Competitiveness</span>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="#features">
              <Button variant="outline" className="h-12 px-8 text-base font-semibold border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 hover:text-zinc-900 rounded-xl shadow-sm">
                How It Works
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="h-12 px-8 text-base font-semibold bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl shadow-md transition-all hover:scale-[1.02]">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>

        {/* Dashboard Mockup Image */}
        <div className="max-w-5xl mx-auto mt-16 md:mt-24 relative z-10 w-full px-4 sm:px-6">
          <div className="rounded-2xl border border-black/10 bg-white/50 p-2 sm:p-4 shadow-2xl backdrop-blur-xl">
            <div className="rounded-xl overflow-hidden border border-black/5 bg-gray-50 flex items-center justify-center relative aspect-[16/9] sm:aspect-[21/9]">
              <Image
                src="/dashboard_mockup.png"
                alt="Job Genie Dashboard Interface"
                fill
                className="object-cover object-top rounded-xl"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Feature 1: Left Image, Right Text */}
      <section className="py-24 bg-white px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 rounded-3xl bg-neutral-50 border border-black/5 p-8 min-h-[400px] flex items-center justify-center relative overflow-hidden group">
            {/* Abstract representation of resume scanning */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative z-10 flex flex-col gap-4 w-full max-w-sm">
              <div className="h-12 w-3/4 bg-white rounded-lg border border-black/10 shadow-sm animate-pulse" />
              <div className="h-4 w-full bg-black/10 rounded-full" />
              <div className="h-4 w-5/6 bg-black/10 rounded-full" />
              <div className="flex gap-4 mt-6">
                <div className="h-24 w-1/3 bg-white rounded-2xl border border-black/5 shadow-sm transition-transform group-hover:-translate-y-2 duration-500" />
                <div className="h-24 w-1/3 bg-white rounded-2xl border border-black/5 shadow-sm transition-transform group-hover:-translate-y-1 duration-500 delay-75" />
                <div className="h-24 w-1/3 bg-white rounded-2xl border border-black/5 shadow-sm transition-transform group-hover:-translate-y-3 duration-500 delay-150" />
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2 space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-neutral-50 px-3 py-1 text-xs font-semibold text-black/50 uppercase tracking-widest">
              Summary Benefits
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold text-black tracking-tight">Smart Resume Tailoring</h2>
            <p className="text-lg text-black/60 leading-relaxed font-light">
              Stop guessing what employers want. Our AI instantly analyzes job descriptions and provides step-by-step guidance to tailor your resume, significantly boosting your ATS visibility and interview callback rates.
            </p>
            <ul className="space-y-4 pt-2">
              {['Real-time keyword gap analysis', 'Automated bullet point optimization', 'Role-specific formatting suggestions'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-black/70 font-medium">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/5 text-black">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup" className="inline-flex items-center gap-2 pt-4 group">
              <span className="text-black font-semibold text-lg hover:text-black/80 transition-colors">
                Optimize my resume
              </span>
              <ArrowRight className="w-5 h-5 text-black group-hover:translate-x-1.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6 bg-neutral-50 relative z-10 border-t border-black/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20 space-y-6">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-black">
              Tools to accelerate your job search
            </h2>
            <p className="text-xl text-black/60 max-w-2xl mx-auto font-light">
              A complete ecosystem designed to help you stand out and land offers faster.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Grid Item 1 */}
            <div className="p-8 rounded-3xl bg-white border border-black/10 shadow-sm hover:shadow-xl transition-all duration-300 group hover:-translate-y-1">
              <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center mb-8 border border-black/5 group-hover:bg-black transition-colors duration-300">
                <FileText className="w-6 h-6 text-black group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-semibold text-black mb-4">Intelligent Parsing</h3>
              <p className="text-black/60 font-light leading-relaxed text-lg">
                Automatically extract and analyze key details from your resume to ensure pixel-perfect formatting.
              </p>
            </div>

            {/* Grid Item 2 */}
            <div className="p-8 rounded-3xl bg-white border border-black/10 shadow-sm hover:shadow-xl transition-all duration-300 group hover:-translate-y-1">
              <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center mb-8 border border-black/5 group-hover:bg-black transition-colors duration-300">
                <Target className="w-6 h-6 text-black group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-semibold text-black mb-4">Precision Matching</h3>
              <p className="text-black/60 font-light leading-relaxed text-lg">
                Discover roles uniquely suited to your proven skills and past experiences, eliminating irrelevant listings.
              </p>
            </div>

            {/* Grid Item 3 */}
            <div className="p-8 rounded-3xl bg-white border border-black/10 shadow-sm hover:shadow-xl transition-all duration-300 group hover:-translate-y-1">
              <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center mb-8 border border-black/5 group-hover:bg-black transition-colors duration-300">
                <MessageSquare className="w-6 h-6 text-black group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-semibold text-black mb-4">Interview Coach</h3>
              <p className="text-black/60 font-light leading-relaxed text-lg">
                Practice with an AI trained on the specific company's cultural values and behavioral behavioral questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-black/10 py-16 px-6 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4 hover:opacity-80 transition-opacity cursor-pointer">
            <Image src="/JG00000.png" alt="JobGenie Logo" width={64} height={64} className="object-contain" />
            <span className="text-3xl font-semibold text-black tracking-tight">JobGenie</span>
          </div>
          <p className="text-black/40 text-base font-medium order-3 md:order-2">
            © {new Date().getFullYear()} JobGenie Technologies. All rights reserved.
          </p>
          <div className="flex gap-8 order-2 md:order-3">
            <Link href="#" className="text-black/50 hover:text-black font-medium transition-colors">Terms</Link>
            <Link href="#" className="text-black/50 hover:text-black font-medium transition-colors">Privacy</Link>
            <Link href="#" className="text-black/50 hover:text-black font-medium transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
