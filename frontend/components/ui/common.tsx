import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge tailwind classes safely
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => (
    <div className="w-full space-y-1.5">
        {label && (
            <label className="block text-sm font-medium text-slate-700 ml-1">
                {label}
            </label>
        )}
        <input
            className={cn(
                "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl",
                "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200",
                "placeholder:text-slate-400 text-slate-900",
                error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                className
            )}
            {...props}
        />
        {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
    </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'premium';
    size?: 'sm' | 'md' | 'lg';
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    leftIcon,
    rightIcon,
    isLoading,
    className,
    children,
    disabled,
    ...props
}) => {
    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20',
        secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900',
        outline: 'bg-transparent border border-slate-200 text-slate-900 hover:bg-slate-50',
        ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
        premium: 'bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-md shadow-blue-500/25 border-none',
    };

    const sizes = {
        sm: 'py-1.5 px-3 text-sm',
        md: 'py-2.5 px-5 text-base',
        lg: 'py-3.5 px-8 text-lg',
    };

    return (
        <button
            className={cn(
                "inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none gap-2",
                variants[variant],
                sizes[size],
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
                <>
                    {leftIcon && <span className="flex items-center">{leftIcon}</span>}
                    {children}
                    {rightIcon && <span className="flex items-center">{rightIcon}</span>}
                </>
            )}
        </button>
    );
};
