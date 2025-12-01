import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'special' | 'ghost' | 'danger';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  icon,
  variant = 'primary',
  className = '',
  fullWidth = true,
  ...props
}) => {
  const baseClasses =
    'relative flex items-center justify-center font-semibold rounded-xl transition-all duration-300 ease-out transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden group';

  const widthClass = fullWidth ? 'w-full' : 'w-auto px-6';
  const sizeClasses = 'py-3 text-sm tracking-wide';

  const variantClasses = {
    primary:
      'bg-slate-800/50 backdrop-blur-md border border-fuchsia-500/50 text-white shadow-[0_0_20px_rgba(192,132,252,0.15)] hover:shadow-[0_0_30px_rgba(192,132,252,0.4)] hover:border-fuchsia-400 hover:bg-fuchsia-500/10',
    secondary:
      'bg-slate-900/40 backdrop-blur-sm text-slate-300 border border-white/10 hover:bg-white/5 hover:text-white hover:border-white/20',
    success:
      'bg-emerald-900/30 backdrop-blur-md border border-emerald-500/50 text-emerald-100 hover:bg-emerald-500/20 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]',
    warning:
      'bg-amber-900/30 backdrop-blur-md border border-amber-500/50 text-amber-100 hover:bg-amber-500/20',
    danger:
      'bg-red-900/30 backdrop-blur-md border border-red-500/50 text-red-100 hover:bg-red-500/20',
    special:
      'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white border border-white/20 shadow-lg hover:shadow-fuchsia-500/50',
    ghost:
      'bg-transparent hover:bg-white/5 text-slate-400 hover:text-white',
  };

  return (
    <button
      className={`${baseClasses} ${widthClass} ${sizeClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {/* Inner glow effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      
      {icon && <span className="mr-2 relative z-10 transition-transform group-hover:scale-110">{icon}</span>}
      <span className="relative z-10">{children}</span>
    </button>
  );
};

export default Button;