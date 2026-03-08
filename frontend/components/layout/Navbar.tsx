'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/common';
import { Sparkles } from 'lucide-react';

export const Navbar = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navLinks = [
        { name: 'Features', href: '#features' },
        { name: 'How It Works', href: '#how-it-works' },
        { name: 'Pricing', href: '#pricing' },
    ];

    return (
        <nav className="fixed top-6 left-0 right-0 z-50 px-6">
            <div className="max-w-6xl mx-auto glass-capsule-dark rounded-full px-6 py-3 flex items-center justify-between shadow-soft backdrop-blur-md border border-white/10 bg-black/50">

                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-white" />
                    <span className="text-lg font-bold tracking-tight text-white">
                        JobGenie
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="text-sm font-medium text-white/70 hover:text-white transition-opacity"
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>

                {/* CTAs */}
                <div className="hidden md:flex items-center gap-3">
                    <Link href="/login">
                        <Button variant="ghost" className="rounded-lg px-5 py-2 text-sm font-semibold border border-white/20 text-white hover:bg-white/10 hover:text-white">
                            Login
                        </Button>
                    </Link>
                    <Link href="/signup">
                        <Button className="rounded-lg px-5 py-2 text-sm font-semibold bg-white text-black hover:bg-white/90">
                            Get Started
                        </Button>
                    </Link>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden p-2"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    <div className="w-5 h-0.5 bg-white mb-1"></div>
                    <div className="w-5 h-0.5 bg-white"></div>
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden mt-4 glass-capsule-dark rounded-3xl p-6 shadow-soft max-w-sm mx-auto bg-black/90 border border-white/10 backdrop-blur-xl absolute top-20 left-4 right-4 z-50">
                    <div className="flex flex-col gap-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="text-base font-medium text-white"
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="h-px bg-white/10 my-2" />
                        <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                            <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">Login</Button>
                        </Link>
                        <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                            <Button className="w-full bg-white text-black hover:bg-white/90">Get Started</Button>
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
};
