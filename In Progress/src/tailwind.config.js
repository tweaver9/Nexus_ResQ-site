/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium Dark Backgrounds
        'obsidian': '#0a0a0f',
        'graphite': '#1a1a1f',
        'navy-deep': '#0f1419',
        'charcoal': '#1e1e24',
        
        // Metallic Accents
        'aluminum': '#e8e8e8',
        'chrome': '#f5f5f5',
        'steel': '#8a8a8a',
        'brass': '#b8860b',
        'gold': '#ffd700',
        'platinum': '#e5e4e2',
        
        // Signature Colors
        'nexus-gold': '#fdd835',
        'nexus-yellow': '#fdd835',
        'accent-blue': '#3b82f6',
        'accent-emerald': '#10b981',
        'accent-amber': '#f59e0b',
        'accent-rose': '#f43f5e',
        
        // Surface Colors
        'surface-primary': '#151b2e',
        'surface-secondary': '#1a2138',
        'surface-tertiary': '#0f1419',
        'surface-glass': 'rgba(255, 255, 255, 0.05)',
        'surface-glass-hover': 'rgba(255, 255, 255, 0.08)',
        
        // Border & Divider Colors
        'border-razor': '#2a3441',
        'border-metallic': '#4a5568',
        'border-glow': 'rgba(253, 216, 53, 0.3)',
        
        // Text Colors
        'text-primary': '#ffffff',
        'text-secondary': '#a0aec0',
        'text-muted': '#718096',
        'text-accent': '#fdd835',
        
        // Status Colors
        'status-online': '#10b981',
        'status-warning': '#f59e0b',
        'status-critical': '#ef4444',
        'status-info': '#3b82f6',
      },
      fontFamily: {
        'oswald': ['Oswald', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'display': ['Oswald', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
      },
      fontSize: {
        'display-1': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-2': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'display-3': ['2rem', { lineHeight: '1.3', letterSpacing: '0' }],
        'headline': ['1.5rem', { lineHeight: '1.4', letterSpacing: '0.01em' }],
        'title': ['1.25rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        'body': ['1rem', { lineHeight: '1.6', letterSpacing: '0.01em' }],
        'caption': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.02em' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'sharp': '0.125rem',
        'precise': '0.25rem',
        'refined': '0.375rem',
        'elegant': '0.5rem',
      },
      boxShadow: {
        'premium': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'premium-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'premium-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'premium-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'metallic': '0 0 0 1px rgba(255, 255, 255, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glow': '0 0 20px rgba(253, 216, 53, 0.3)',
        'glow-strong': '0 0 30px rgba(253, 216, 53, 0.5)',
        'inner-premium': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'widget-enter': 'widget-enter 0.3s ease forwards',
        'slide-up': 'slide-up 0.4s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'metallic-shine': 'metallic-shine 3s ease-in-out infinite',
        'precision-focus': 'precision-focus 0.15s ease-out',
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(253, 216, 53, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(253, 216, 53, 0.6), 0 0 30px rgba(253, 216, 53, 0.4)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(253, 216, 53, 0.2)' },
          '50%': { boxShadow: '0 0 15px rgba(253, 216, 53, 0.5)' },
        },
        'widget-enter': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'metallic-shine': {
          '0%, 100%': { backgroundPosition: '-200% center' },
          '50%': { backgroundPosition: '200% center' },
        },
        'precision-focus': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.98)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'metallic-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.1) 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'premium-gradient': 'linear-gradient(135deg, #151b2e 0%, #1a2138 100%)',
        'obsidian-gradient': 'linear-gradient(135deg, #0a0a0f 0%, #1a1a1f 100%)',
      },
    },
  },
  plugins: [],
}