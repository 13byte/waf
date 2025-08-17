/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable manual theme switching
  theme: {
    extend: {
      colors: {
        // Apple-inspired palette - Matching HTML preview
        primary: {
          DEFAULT: '#0071E3',
          light: '#64B5F6', 
          dark: '#0051A2',
        },
        success: {
          DEFAULT: '#30D158',
          light: '#86EFAC',
          dark: '#16A34A',
        },
        warning: {
          DEFAULT: '#FFD60A',
          light: '#FEF3C7',
          dark: '#F57C00',
        },
        danger: {
          DEFAULT: '#FF453A',
          light: '#FCA5A5',
          dark: '#DC2626',
        },
        info: {
          DEFAULT: '#0A84FF',
          light: '#93C5FD',
          dark: '#2563EB',
        },
        // Sophisticated gray scale - Matching HTML preview
        gray: {
          50: '#FAFBFC',    // Almost white
          100: '#F6F8FA',   // Light background
          200: '#E1E4E8',   // Borders
          300: '#D1D5DA',   
          400: '#959DA5',   // Muted text
          500: '#6A737D',   // Secondary text
          600: '#586069',   
          700: '#444D56',   // Body text
          800: '#2F363D',   // Headings
          900: '#24292E',   // Primary text
          950: '#0D1117',   // Pure dark
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['11px', '16px'],
        'sm': ['13px', '20px'],
        'base': ['15px', '24px'],
        'lg': ['17px', '28px'],
        'xl': ['20px', '32px'],
        '2xl': ['28px', '36px'],
        '3xl': ['34px', '42px'],
        '4xl': ['48px', '56px'],
        '5xl': ['56px', '64px'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px', 
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      // Clean shadow system - Matching HTML preview
      boxShadow: {
        'xs': '0 1px rgb(0 0 0 / 0.05)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'card': '0 0 0 1px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.05), 0 4px 8px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 0 0 1px rgba(0, 0, 0, 0.05), 0 4px 8px rgba(0, 0, 0, 0.08), 0 12px 24px rgba(0, 0, 0, 0.08)',
        'button': '0 4px 12px rgba(0, 113, 227, 0.3)',
        'none': '0 0 #0000',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'mesh-move': 'meshMove 20s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.98)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        meshMove: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '33%': { transform: 'translate(-20px, -20px) rotate(1deg)' },
          '66%': { transform: 'translate(20px, -10px) rotate(-1deg)' },
        },
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
}