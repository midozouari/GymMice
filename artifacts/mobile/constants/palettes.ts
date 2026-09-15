export type PaletteId = 'default' | 'pink' | 'military' | 'mono' | 'midnight';
export type ThemeMode = 'light' | 'dark';

// Full semantic token set. Every screen should read colors from these tokens
// (via useTheme()) instead of hardcoding hex values, so both palette and
// light/dark mode stay consistent app-wide.
export type ThemeColors = {
  // Structure
  background: string;
  surface: string;
  card: string;
  border: string;
  inputBackground: string;
  overlay: string;

  // Text & icons
  primaryText: string;
  secondaryText: string;
  mutedText: string;
  icon: string;
  iconMuted: string;

  // Brand / identity (palette-defining)
  primary: string;
  accent: string;
  navy: string; // fixed dark chrome color (tab bar, avatars) — same across modes by design

  // Status
  success: string;
  warning: string;
  danger: string;
  dangerBg: string;

  // Charts — kept visually distinct per series while remaining palette+mode aware
  chartTrack: string;
  chartGrid: string;
  chartPush: string;
  chartPull: string;
  chartLegs: string;
  chartWater: string;
  chartPositive: string;
  chartNegative: string;
  chartPositiveBg: string;
  chartNegativeBg: string;
  chartPR: string;
};

export type Palette = {
  id: PaletteId;
  label: string;
  light: ThemeColors;
  dark: ThemeColors;
};

export const PALETTES: Record<PaletteId, Palette> = {
  default: {
    id: 'default',
    label: 'Default',
    light: {
      background: '#F7F8FA', surface: '#FFFFFF', card: '#FFFFFF', border: '#E5E7EB', inputBackground: '#F3F4F6', overlay: 'rgba(10,12,18,0.5)',
      primaryText: '#1A1A2E', secondaryText: '#6B7280', mutedText: '#9CA3AF', icon: '#1A1A2E', iconMuted: '#9CA3AF',
      primary: '#1D9E75', accent: '#E8692A', navy: '#1E3A5F',
      success: '#1D9E75', warning: '#E8A93D', danger: '#D94040', dangerBg: '#FEF2F2',
      chartTrack: '#EDEFF3', chartGrid: '#E5E7EB', chartPush: '#E8692A', chartPull: '#1D9E75', chartLegs: '#7C3AED', chartWater: '#3B8BD4',
      chartPositive: '#1D9E75', chartNegative: '#D94040', chartPositiveBg: '#1D9E7518', chartNegativeBg: '#D9404018', chartPR: '#7C3AED',
    },
    dark: {
      background: '#0E1116', surface: '#171B22', card: '#1C212B', border: '#2B3140', inputBackground: '#232833', overlay: 'rgba(0,0,0,0.65)',
      primaryText: '#F2F4F7', secondaryText: '#9AA4B2', mutedText: '#6E7684', icon: '#F2F4F7', iconMuted: '#6E7684',
      primary: '#2ED996', accent: '#FF8A50', navy: '#1E3A5F',
      success: '#2ED996', warning: '#F0BE5C', danger: '#F26868', dangerBg: '#3A1D1D',
      chartTrack: '#232833', chartGrid: '#2B3140', chartPush: '#FF8A50', chartPull: '#2ED996', chartLegs: '#B18CFF', chartWater: '#5FB4F5',
      chartPositive: '#2ED996', chartNegative: '#F26868', chartPositiveBg: '#2ED99626', chartNegativeBg: '#F2686826', chartPR: '#B18CFF',
    },
  },
  pink: {
    id: 'pink',
    label: 'Pink',
    light: {
      background: '#FFF0F7', surface: '#FFFFFF', card: '#FFFFFF', border: '#F5D9E8', inputBackground: '#FCEBF4', overlay: 'rgba(45,10,30,0.5)',
      primaryText: '#2D0A1E', secondaryText: '#8A6478', mutedText: '#C79BB4', icon: '#2D0A1E', iconMuted: '#C79BB4',
      primary: '#E91E8C', accent: '#FF6BAE', navy: '#2D0A1E',
      success: '#1D9E75', warning: '#E8A93D', danger: '#D94040', dangerBg: '#FEF2F2',
      chartTrack: '#FCEBF4', chartGrid: '#F5D9E8', chartPush: '#FF6BAE', chartPull: '#1D9E75', chartLegs: '#9B4DCA', chartWater: '#3B8BD4',
      chartPositive: '#1D9E75', chartNegative: '#D94040', chartPositiveBg: '#1D9E7518', chartNegativeBg: '#D9404018', chartPR: '#9B4DCA',
    },
    dark: {
      background: '#170A12', surface: '#211018', card: '#2A141F', border: '#3D1E2C', inputBackground: '#2A141F', overlay: 'rgba(0,0,0,0.65)',
      primaryText: '#FBE9F1', secondaryText: '#C79BB4', mutedText: '#8A6478', icon: '#FBE9F1', iconMuted: '#8A6478',
      primary: '#FF57A8', accent: '#FF8CC3', navy: '#2D0A1E',
      success: '#2ED996', warning: '#F0BE5C', danger: '#F26868', dangerBg: '#3A1D1D',
      chartTrack: '#2A141F', chartGrid: '#3D1E2C', chartPush: '#FF8CC3', chartPull: '#2ED996', chartLegs: '#C79BFF', chartWater: '#5FB4F5',
      chartPositive: '#2ED996', chartNegative: '#F26868', chartPositiveBg: '#2ED99626', chartNegativeBg: '#F2686826', chartPR: '#C79BFF',
    },
  },
  military: {
    id: 'military',
    label: 'Military',
    light: {
      background: '#F4F5F0', surface: '#FFFFFF', card: '#FFFFFF', border: '#DDE0D4', inputBackground: '#ECEEE4', overlay: 'rgba(20,24,15,0.5)',
      primaryText: '#2C3A20', secondaryText: '#6E765F', mutedText: '#A3AB93', icon: '#2C3A20', iconMuted: '#A3AB93',
      primary: '#4A5E3A', accent: '#8B8B6B', navy: '#2C3A20',
      success: '#4A7E3A', warning: '#C79A3B', danger: '#B84A3A', dangerBg: '#FBEEEC',
      chartTrack: '#ECEEE4', chartGrid: '#DDE0D4', chartPush: '#B4762E', chartPull: '#4A7E3A', chartLegs: '#6B5B95', chartWater: '#3B7B8B',
      chartPositive: '#4A7E3A', chartNegative: '#B84A3A', chartPositiveBg: '#4A7E3A18', chartNegativeBg: '#B84A3A18', chartPR: '#6B5B95',
    },
    dark: {
      background: '#12150E', surface: '#191D12', card: '#212617', border: '#333C22', inputBackground: '#212617', overlay: 'rgba(0,0,0,0.65)',
      primaryText: '#EDEFE2', secondaryText: '#A3AB93', mutedText: '#6E765F', icon: '#EDEFE2', iconMuted: '#6E765F',
      primary: '#8CB56E', accent: '#C9C99B', navy: '#2C3A20',
      success: '#8CC56E', warning: '#DDB25C', danger: '#E17A64', dangerBg: '#3A231D',
      chartTrack: '#212617', chartGrid: '#333C22', chartPush: '#D99A5C', chartPull: '#8CC56E', chartLegs: '#A594D9', chartWater: '#5FADC0',
      chartPositive: '#8CC56E', chartNegative: '#E17A64', chartPositiveBg: '#8CC56E26', chartNegativeBg: '#E17A6426', chartPR: '#A594D9',
    },
  },
  mono: {
    id: 'mono',
    label: 'Mono',
    light: {
      background: '#F5F5F5', surface: '#FFFFFF', card: '#FFFFFF', border: '#DEDEDE', inputBackground: '#EDEDED', overlay: 'rgba(0,0,0,0.5)',
      primaryText: '#111111', secondaryText: '#666666', mutedText: '#999999', icon: '#111111', iconMuted: '#999999',
      primary: '#111111', accent: '#555555', navy: '#000000',
      success: '#3A7D5C', warning: '#8A7A2E', danger: '#B23A3A', dangerBg: '#F5EAEA',
      chartTrack: '#EDEDED', chartGrid: '#DEDEDE', chartPush: '#555555', chartPull: '#111111', chartLegs: '#8A8A8A', chartWater: '#3A6E8A',
      chartPositive: '#3A7D5C', chartNegative: '#B23A3A', chartPositiveBg: '#3A7D5C18', chartNegativeBg: '#B23A3A18', chartPR: '#8A8A8A',
    },
    dark: {
      background: '#0D0D0D', surface: '#161616', card: '#1E1E1E', border: '#333333', inputBackground: '#1E1E1E', overlay: 'rgba(0,0,0,0.7)',
      primaryText: '#F2F2F2', secondaryText: '#A6A6A6', mutedText: '#6E6E6E', icon: '#F2F2F2', iconMuted: '#6E6E6E',
      primary: '#EDEDED', accent: '#B8B8B8', navy: '#000000',
      success: '#6FBF95', warning: '#D8C267', danger: '#E17A7A', dangerBg: '#3A1F1F',
      chartTrack: '#1E1E1E', chartGrid: '#333333', chartPush: '#B8B8B8', chartPull: '#EDEDED', chartLegs: '#8A8A8A', chartWater: '#6FA8C2',
      chartPositive: '#6FBF95', chartNegative: '#E17A7A', chartPositiveBg: '#6FBF9526', chartNegativeBg: '#E17A7A26', chartPR: '#8A8A8A',
    },
  },
  midnight: {
    id: 'midnight',
    label: 'Midnight',
    light: {
      background: '#F0F0FF', surface: '#FFFFFF', card: '#FFFFFF', border: '#DCDCF5', inputBackground: '#E8E8FB', overlay: 'rgba(13,13,43,0.5)',
      primaryText: '#0D0D2B', secondaryText: '#6B6B94', mutedText: '#A5A5CC', icon: '#0D0D2B', iconMuted: '#A5A5CC',
      primary: '#4B4BFF', accent: '#A78BFA', navy: '#0D0D2B',
      success: '#1D9E75', warning: '#E8A93D', danger: '#D94040', dangerBg: '#FEF2F2',
      chartTrack: '#E8E8FB', chartGrid: '#DCDCF5', chartPush: '#E8692A', chartPull: '#1D9E75', chartLegs: '#A78BFA', chartWater: '#4B4BFF',
      chartPositive: '#1D9E75', chartNegative: '#D94040', chartPositiveBg: '#1D9E7518', chartNegativeBg: '#D9404018', chartPR: '#A78BFA',
    },
    dark: {
      background: '#0A0A1F', surface: '#12122E', card: '#181839', border: '#2B2B57', inputBackground: '#181839', overlay: 'rgba(0,0,0,0.65)',
      primaryText: '#EAEAFF', secondaryText: '#A5A5CC', mutedText: '#6B6B94', icon: '#EAEAFF', iconMuted: '#6B6B94',
      primary: '#8080FF', accent: '#C4AEFF', navy: '#0D0D2B',
      success: '#2ED996', warning: '#F0BE5C', danger: '#F26868', dangerBg: '#3A1D1D',
      chartTrack: '#181839', chartGrid: '#2B2B57', chartPush: '#FF8A50', chartPull: '#2ED996', chartLegs: '#C4AEFF', chartWater: '#7B9BFF',
      chartPositive: '#2ED996', chartNegative: '#F26868', chartPositiveBg: '#2ED99626', chartNegativeBg: '#F2686826', chartPR: '#C4AEFF',
    },
  },
};

export const PALETTE_LIST = Object.values(PALETTES);
