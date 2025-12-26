// Note: Google Fonts are loaded in index.html with preconnect for optimal performance
// This component only provides CSS variables and utility classes

export function Fonts() {
  return (
    <style>{`
      :root {
        --font-display: 'Syne', sans-serif;
        --font-mono: 'DM Mono', monospace;
        --color-bg: #0a0a0c;
        --color-surface: #131316;
        --color-surface-highlight: #1c1c21;
        --color-primary: #dfff4f; /* Acid Lime */
        --color-secondary: #ff4f99; /* Hot Pink */
        --color-text: #f0f0f0;
        --color-text-dim: #888890;
      }

      body {
        background-color: #050507;
        color: var(--color-text);
        font-family: var(--font-mono);
        -webkit-font-smoothing: antialiased;
        margin: 0;
        overflow: hidden; /* Prevent body scroll, handle in app container */
      }

      .font-display { font-family: var(--font-display); }
      .font-mono { font-family: var(--font-mono); }

      /* Custom Animations */
      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0px); }
      }
      
      @keyframes slide-up {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      @keyframes slide-in-left {
        from { transform: translateX(-100%); }
        to { transform: translateX(0); }
      }
      
      @keyframes slide-out-left {
        from { transform: translateX(0); }
        to { transform: translateX(-100%); }
      }
      
      @keyframes slide-down {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(100%); opacity: 0; }
      }
      
      @keyframes fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }

      .animate-float { animation: float 6s ease-in-out infinite; }
      .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      .animate-slide-in-left { animation: slide-in-left 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      .animate-slide-out-left { animation: slide-out-left 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .animate-slide-down { animation: slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .animate-fade-out { animation: fade-out 0.25s ease-out forwards; }
      
      /* Scrollbar hide */
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

      .glass-panel {
        background: rgba(19, 19, 22, 0.85);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      .glass-panel-top {
        background: rgba(19, 19, 22, 0.85);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-top: 1px solid rgba(255, 255, 255, 0.05);
      }

      .acid-border {
        position: relative;
      }
      .acid-border::after {
        content: '';
        position: absolute;
        bottom: -4px;
        right: -4px;
        width: 100%;
        height: 100%;
        border: 1px solid var(--color-primary);
        z-index: -1;
        transition: all 0.2s;
      }
      .acid-border:active::after {
        bottom: 0px;
        right: 0px;
      }
    `}</style>
  )
}

