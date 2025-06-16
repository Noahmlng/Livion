export const theme = {
  colors: {
    /*
     * Northern mythology warm palette - inspired by torches, parchment and scrolls
     */
    background: '#1a1d21',            // Deep dark background (保持黑灰色)
    foreground: '#e0e0e0',            // Light text (保持淡白色)
    primary: '#e0a639',               // Amber/gold primary / highlight
    secondary: '#a36627',             // Burnt orange for secondary actions
    accent: '#e0a639',                // Amber/gold accent
    success: '#56a65a',               // Kept as-is
    danger: '#d64545',                // Kept as-is
    warning: '#e9973b',               // Warm amber warning
    info: '#d8a45e',                  // Soft amber for info

    /* Warm neutrals for the earthy/parchment feel */
    dark: '#0f1115',                  // 保持深黑色
    darkBrown: '#1e2228',             // 恢复深灰色
    lightBrown: '#2a2d31',            // 恢复灰色面板
    parchment: '#2a2d31',             // 恢复灰色卡片
    leather: '#3d4147',               // 恢复灰色边框
    wood: '#4a4e54',                  // 恢复深灰色边框
    stone: '#a3a3a3',                 // 恢复中性灰色

    /* Metallic colors with warm tints */
    gold: '#e0a639',                  // Amber/gold highlight (仅高亮处使用温暖色)
    silver: '#c5c0b8',                // Warmer silver
    copper: '#b87333',                // Rich copper

    /* Tabs */
    tabDefault: '#2a2d31',            // 恢复灰色不活跃标签
    tabActive: '#e0a639',             // Active tab - amber highlight
  },
  fonts: {
    heading: '"Cinzel", serif',
    body: '"Roboto", sans-serif',
    rpg: '"MedievalSharp", cursive',
  },
  shadows: {
    small: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    medium: '0 3px 6px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12)',
    large: '0 10px 20px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.1)',
    inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
    outline: '0 0 0 3px rgba(224, 166, 57, 0.5)',
    none: 'none',
  },
  border: {
    radius: {
      small: '4px',
      medium: '8px',
      large: '12px',
      full: '50%',
    },
    width: {
      thin: '1px',
      medium: '2px',
      thick: '4px',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  transitions: {
    fast: '0.15s ease',
    medium: '0.3s ease',
    slow: '0.5s ease',
  },
  zIndex: {
    background: 0,
    foreground: 1,
    dropdown: 100,
    modal: 200,
    tooltip: 300,
    toast: 400,
  },
};

export type Theme = typeof theme; 