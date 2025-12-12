/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de colores clínica y profesional
        hospital: {
          50: '#f8fafc', // Fondo principal muy claro (casi blanco)
          100: '#f1f5f9', // Fondos de secciones secundarias
          200: '#e2e8f0', // Bordes sutiles
          300: '#cbd5e1', // Textos secundarios / placeholders
          400: '#94a3b8', // Iconos inactivos
          500: '#64748b', // Texto descriptivo
          600: '#475569', // Texto principal
          700: '#334155', // Encabezados
          800: '#1e293b', // Texto oscuro / Sidebar
          900: '#0f172a', // Negro casi total
        },
        clinical: {
          primary: '#0284c7', // Azul médico principal (Sky 600) - Acciones principales
          dark: '#0369a1',      // Azul más oscuro para hover
          light: '#e0f2fe',     // Azul muy claro para fondos de acento
          success: '#10b981',   // Verde esmeralda (Estable)
          warning: '#f59e0b',   // Ámbar (Pendiente)
          danger: '#ef4444',    // Rojo (Crítico/Alergias)
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
      }
    },
  },
  plugins: [],
}
