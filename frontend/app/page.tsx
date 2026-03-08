'use client';

import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import Hero3D from "@/components/landing/Hero3D";
import {
  Sparkles,
  Upload,
  Search,
  MessageSquare,
  CheckCircle2,
  Target,
  FileText
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20">
      <div className="fixed top-0 w-full z-50">
         <Navbar />
      </div>

      <Hero3D 
        title="Unlock Your Career Potential"
        description="Your personal AI assistant for resume optimization, smart job matching, and interview preparation. Get hired faster with intelligent insights."
        badgeLabel="AI Powered"
        badgeText="Job Genie v1.0"
        ctaButtons={[
            { text: "Start Free Trial", href: "/signup", primary: true },
            { text: "View Features", href: "#features", primary: false }
        ]}
        microDetails={["Smart Parsing", "ATS Scoring", "Interview Coach"]}
      />

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 bg-black relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-white/90">
              Everything you need to land the job
            </h2>
            <p className="text-lg font-light text-white/60 max-w-2xl mx-auto">
              Our AI-driven tools streamline every step of your job search journey, from application to offer letter.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-500 group">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-light text-white mb-3">Smart Resume Parsing</h3>
              <p className="text-white/50 font-light leading-relaxed">
                Automatically extract and analyze key details from your resume. Our AI suggests improvements to pass ATS filters.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-500 group">
              <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/30 group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-light text-white mb-3">Precision Job Matching</h3>
              <p className="text-white/50 font-light leading-relaxed">
                Stop scrolling through irrelevant listings. Job Genie matches your skills and experience with the perfect job opportunities.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-500 group">
              <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center mb-6 border border-green-500/30 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-light text-white mb-3">Interview Preparation</h3>
              <p className="text-white/50 font-light leading-relaxed">
                Practice with AI-simulated interviews tailored to your target role. Get real-time feedback on your answers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-12 px-6 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <span className="text-lg font-bold text-white tracking-tight">Job Genie</span>
          </div>
          <p className="text-white/40 text-sm font-light">
            © {new Date().getFullYear()} Job Genie. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="text-white/40 hover:text-white text-sm font-light transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-white/40 hover:text-white text-sm font-light transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
