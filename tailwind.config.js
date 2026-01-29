/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        brand: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      fontWeight: {
        brand: '300',
      },
      letterSpacing: {
        brand: '0.4em',
      },
      colors: {
        // GateStatus 颜色（统一规范）
        gate: {
          block: {
            border: '#dc2626',    // red-600
            text: '#b91c1c',      // red-700
            bg: '#fef2f2',        // red-50
            icon: '#dc2626',      // red-600
          },
          warn: {
            border: '#d97706',    // amber-600
            text: '#b45309',      // amber-700
            bg: '#fffbeb',        // amber-50
            icon: '#d97706',      // amber-600
          },
          pass: {
            border: '#16a34a',    // green-600
            text: '#15803d',      // green-700
            bg: '#f0fdf4',        // green-50
            icon: '#16a34a',      // green-600
          },
        },
        // 信息性颜色（蓝色）
        info: {
          date: '#2563eb',        // blue-600
          link: '#2563eb',        // blue-600
          transport: {
            bg: '#eff6ff',        // blue-50
            text: '#1e40af',      // blue-800
            border: '#bfdbfe',    // blue-200
          },
        },
        // 决策状态颜色（保留原有，用于兼容）
        'gate-allow': 'var(--gate-allow)',
        'gate-allow-foreground': 'var(--gate-allow-foreground)',
        'gate-allow-border': 'var(--gate-allow-border)',
        'gate-confirm': 'var(--gate-confirm)',
        'gate-confirm-foreground': 'var(--gate-confirm-foreground)',
        'gate-confirm-border': 'var(--gate-confirm-border)',
        'gate-suggest': 'var(--gate-suggest)',
        'gate-suggest-foreground': 'var(--gate-suggest-foreground)',
        'gate-suggest-border': 'var(--gate-suggest-border)',
        'gate-reject': 'var(--gate-reject)',
        'gate-reject-foreground': 'var(--gate-reject-foreground)',
        'gate-reject-border': 'var(--gate-reject-border)',
        // 三人格颜色
        'persona-abu': 'var(--persona-abu)',
        'persona-abu-foreground': 'var(--persona-abu-foreground)',
        'persona-abu-accent': 'var(--persona-abu-accent)',
        'persona-dre': 'var(--persona-dre)',
        'persona-dre-foreground': 'var(--persona-dre-foreground)',
        'persona-dre-accent': 'var(--persona-dre-accent)',
        'persona-neptune': 'var(--persona-neptune)',
        'persona-neptune-foreground': 'var(--persona-neptune-foreground)',
        'persona-neptune-accent': 'var(--persona-neptune-accent)',
        // 行程状态颜色
        'trip-status-planning': 'var(--trip-status-planning)',
        'trip-status-planning-foreground': 'var(--trip-status-planning-foreground)',
        'trip-status-planning-border': 'var(--trip-status-planning-border)',
        'trip-status-progress': 'var(--trip-status-progress)',
        'trip-status-progress-foreground': 'var(--trip-status-progress-foreground)',
        'trip-status-progress-border': 'var(--trip-status-progress-border)',
        'trip-status-completed': 'var(--trip-status-completed)',
        'trip-status-completed-foreground': 'var(--trip-status-completed-foreground)',
        'trip-status-completed-border': 'var(--trip-status-completed-border)',
        'trip-status-cancelled': 'var(--trip-status-cancelled)',
        'trip-status-cancelled-foreground': 'var(--trip-status-cancelled-foreground)',
        'trip-status-cancelled-border': 'var(--trip-status-cancelled-border)',
        // 预算状态颜色（克制、中性）
        'budget-safe': 'var(--budget-safe)',
        'budget-safe-foreground': 'var(--budget-safe-foreground)',
        'budget-safe-border': 'var(--budget-safe-border)',
        'budget-warning': 'var(--budget-warning)',
        'budget-warning-foreground': 'var(--budget-warning-foreground)',
        'budget-warning-border': 'var(--budget-warning-border)',
        'budget-critical': 'var(--budget-critical)',
        'budget-critical-foreground': 'var(--budget-critical-foreground)',
        'budget-critical-border': 'var(--budget-critical-border)',
      },
    },
  },
  plugins: [],
}
