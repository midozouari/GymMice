/**
 * GymMice design tokens — default palette.
 * These are the base structural tokens used by useColors().
 * Dynamic palette colors come from ThemeContext (context/ThemeContext.tsx).
 */

const colors = {
  light: {
    // Legacy aliases
    text: '#1A1A2E',
    tint: '#1D9E75',

    // Core surfaces
    background: '#F7F8FA',
    foreground: '#1A1A2E',

    // Cards / elevated
    card: '#ffffff',
    cardForeground: '#1A1A2E',

    // Primary (default GymMice green)
    primary: '#1D9E75',
    primaryForeground: '#ffffff',

    // Secondary
    secondary: '#F0F2F5',
    secondaryForeground: '#1A1A2E',

    // Muted
    muted: '#F0F2F5',
    mutedForeground: '#6B7280',

    // Accent (default GymMice orange)
    accent: '#E8692A',
    accentForeground: '#ffffff',

    // Destructive
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',

    // Borders / inputs
    border: '#E5E7EB',
    input: '#E5E7EB',
  },

  radius: 12,
};

export default colors;
