/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
  				light: 'hsl(var(--primary-light))',
  				glow: 'hsl(var(--primary-glow))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  			 DEFAULT: 'hsl(var(--accent))',
  			 foreground: 'hsl(var(--accent-foreground))',
  			 cyan: 'hsl(var(--accent-cyan))',
  			 neon: 'hsl(var(--accent-neon))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		fontFamily: {
  		 sans: [
  		  'var(--font-sans)'
  		 ],
  		 mono: [
  		  'var(--font-mono)'
  		 ],
  		 display: [
  		  'var(--font-display)'
  		 ]
  		},
  		animation: {
  		 'fade-in': 'fade-in 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
  		 'slide-up': 'slide-up 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
  		 'scale-in': 'scale-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  		 'float': 'float 3s ease-in-out infinite',
  		 'shimmer': 'shimmer 3s infinite',
  		 'glitch': 'glitch 0.3s infinite',
  		 'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
  		 'accordion-down': 'accordion-down 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
  		 'accordion-up': 'accordion-up 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
  		},
  		keyframes: {
  			'fade-in': {
  				'0%': {
  					opacity: '0'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			},
  			'slide-up': {
  				'0%': {
  					transform: 'translateY(10px)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'scale-in': {
  				from: {
  					opacity: '0',
  					transform: 'scale(0.9)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			},
  			'float': {
  				'0%, 100%': {
  					transform: 'translateY(0px)'
  				},
  				'50%': {
  					transform: 'translateY(-10px)'
  				}
  			},
  			'shimmer': {
  			 '0%': {
  			  left: '-100%'
  			 },
  			 '100%': {
  			  left: '100%'
  			 }
  			},
  			'glitch': {
  			 '0%, 100%': {
  			  transform: 'translate(0)'
  			 },
  			 '20%': {
  			  transform: 'translate(-2px, 2px)'
  			 },
  			 '40%': {
  			  transform: 'translate(-2px, -2px)'
  			 },
  			 '60%': {
  			  transform: 'translate(2px, 2px)'
  			 },
  			 '80%': {
  			  transform: 'translate(2px, -2px)'
  			 }
  			},
  			'pulse-glow': {
  			 '0%, 100%': {
  			  opacity: '1',
  			  filter: 'brightness(1)'
  			 },
  			 '50%': {
  			  opacity: '0.7',
  			  filter: 'brightness(1.5)'
  			 }
  			}
  			}
  			}
  			},
  plugins: [require("tailwindcss-animate")],
} 