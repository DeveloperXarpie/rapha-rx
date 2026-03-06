/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary-blue':   '#2A66B8',
        'emerald-green':  '#3BB78F',
        'alert-red':      '#E74C3C',
        'dark-grey':      '#333333',
        'accent-purple':  '#9C5FA8',
        'accent-amber':   '#C9BA2E',
        'app-bg':         '#F4F5F7',
        'card-bg':        '#FFFFFF',
        'hover-state':    '#F0F3FF',
        'body-text':      '#222222',
        'caption-text':   '#757575',
      },
      fontSize: {
        'h1': ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'h2': ['28px', { lineHeight: '36px', fontWeight: '600' }],
        'h3': ['22px', { lineHeight: '30px', fontWeight: '500' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'btn': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'caption': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'small': ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },
      spacing: {
        'touch-min': '80px',
        'card-pad': '24px',
        'section-gap': '32px',
        'game-card': '80px',
        'game-card-lg': '120px',
        'seq-btn': '120px',
      },
      minHeight: {
        'touch-min': '80px',
        'game-card': '80px',
        'game-card-lg': '120px',
        'seq-btn': '120px',
      },
      minWidth: {
        'touch-min': '80px',
        'game-card': '80px',
        'game-card-lg': '120px',
        'seq-btn': '120px',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', 'Noto Sans Kannada', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
