'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/common';
import { Sparkles } from 'lucide-react';

export const Navbar = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navLinks = [
        { name: 'Features', href: '#features' },
        { name: 'How It Works', href: '#how-it-works' },
        { name: 'Resume Builder', href: '/dashboard' },
    ];

    return (
        <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-3xl">
            <div className="rounded-full px-6 py-3 flex items-center justify-between shadow-soft backdrop-blur-xl border border-black/10 bg-white/70">

                {/* Logo */}
                <Link href="/" className="flex items-center">
                    <Image src="/JG00000.png" alt="JobGenie Logo" width={32} height={32} className="object-contain" priority />
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="text-sm font-medium text-black/50 hover:text-black transition-colors"
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>

                {/* CTAs */}
                <div className="hidden md:flex items-center gap-3">
                    <Link href="/login">
                        <Button variant="ghost" className="rounded-lg px-5 py-2 text-sm font-medium border border-transparent text-black/70 hover:bg-black/5 hover:text-black transition-colors">
                            Log in
                        </Button>
                    </Link>
                    <Link href="/signup">
                        <Button className="rounded-lg px-5 py-2 text-sm font-medium bg-black text-white hover:bg-black/80 transition-colors shadow-sm">
                            Get started
                        </Button>
                    </Link>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden p-2 text-black/60 hover:text-black focus:outline-none"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    <div className="w-5 h-0.5 bg-current mb-1 transition-transform rounded-full"></div>
                    <div className="w-5 h-0.5 bg-current transition-transform rounded-full"></div>
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden mt-4 rounded-3xl p-6 shadow-soft max-w-sm mx-auto bg-white/95 border border-black/5 backdrop-blur-xl absolute top-20 left-4 right-4 z-50">
                    <div className="flex flex-col gap-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="text-base font-medium text-black/60 hover:text-black"
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="h-px bg-black/5 my-2" />
                        <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                            <Button variant="outline" className="w-full border-black/10 text-black/70 hover:bg-black/5">Log in</Button>
                        </Link>
                        <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                            <Button className="w-full bg-black text-white hover:bg-black/80">Get started</Button>
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
};
