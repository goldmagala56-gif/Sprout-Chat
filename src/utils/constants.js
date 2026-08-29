// WhatsApp-inspired design tokens with Sprout green identity
export const COLORS = {
  // Primary palette
  primary: '#146C43',
  primaryDark: '#0F5132',
  primaryLight: '#1B8A56',
  accent: '#5FBE87',
  accentSoft: '#DCF4E3',

  // Backgrounds
  bg: '#FFFFFF',
  bgSecondary: '#F5FAF7',
  bgTertiary: '#FBFEFC',
  chatBg: '#EFEAE2', // WhatsApp-style chat background

  // Surfaces
  panel: '#F5FAF7',
  panelBorder: '#E3EFE8',
  divider: '#EAF3EE',

  // Messages
  sentBubble: '#DCF4E3',
  receivedBubble: '#FFFFFF',
  sentTail: '#DCF4E3',
  receivedTail: '#FFFFFF',

  // Text
  text: '#1B2B22',
  textSecondary: '#6E8A7A',
  textMuted: '#8696A0',
  textInverse: '#FFFFFF',

  // Status
  online: '#5FBE87',
  offline: '#8696A0',

  // Badges
  badge: '#146C43',
  badgeText: '#FFFFFF',

  // Checkmarks
  checkSent: '#8696A0',
  checkDelivered: '#8696A0',
  checkRead: '#53BDEB',

  // Overlays
  overlay: 'rgba(0,0,0,0.4)',

  // Danger
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
};

export const SIZES = {
  sidebarWidth: 400,
  sidebarCollapsed: 80,
  headerHeight: 60,
  composerHeight: 64,
  avatarSmall: 40,
  avatarMedium: 48,
  avatarLarge: 56,
  avatarXL: 120,
  bottomNavHeight: 56,
};

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
};

export const ANIMATIONS = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
};
