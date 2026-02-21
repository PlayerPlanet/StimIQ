/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Pfizer-inspired clinical color palette
        'brand-navy': '#001952', // Very deep midnight blue for headers/nav
        'brand-blue': '#0052CC', // Bright saturated blue for CTAs and metrics
        'brand-blue-soft': '#f0f5ff', // Very light blue for subtle backgrounds
        'surface': '#ffffff', // White surface
        'surface-alt': '#fafbfc', // Alternative light surface
        'text-main': '#1a1f36', // Deep charcoal for main text
        'text-muted': '#697386', // Muted gray for secondary text
        'border-subtle': '#e3e8ee', // Subtle border color
        'background': '#f8fafb', // Page background
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      borderRadius: {
        'none': '0',
        'sm': '0.25rem',
        'base': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.25rem',
        'full': '9999px',
      },
      spacing: {
        'xs': '0.25rem',
        'sm': '0.5rem',
        'md': '1rem',
        'lg': '1.5rem',
        'xl': '2rem',
        '2xl': '2.5rem',
        '3xl': '3rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'base': '0 2px 4px 0 rgba(0, 82, 204, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 8px -2px rgba(0, 82, 204, 0.12), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 20px -5px rgba(0, 82, 204, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 30px -8px rgba(0, 82, 204, 0.18), 0 10px 15px -5px rgba(0, 0, 0, 0.08)',
        'navbar': '0 2px 8px 0 rgba(0, 19, 71, 0.1)',
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
      },
      transitionTimingFunction: {
        'ease-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
