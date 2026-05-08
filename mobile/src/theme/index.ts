import { Colors } from './colors';

export const Theme = {
  colors: Colors,

  spacing: {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  32,
    xxl: 48,
  },

  radius: {
    sm:   8,
    md:   12,
    lg:   16,
    xl:   24,
    full: 9999,
  },

  font: {
    sizeXs:  11,
    sizeSm:  13,
    sizeMd:  15,
    sizeLg:  17,
    sizeXl:  20,
    size2xl: 24,
    size3xl: 30,

    weightRegular: '400' as const,
    weightMedium:  '500' as const,
    weightSemibold:'600' as const,
    weightBold:    '700' as const,
  },

  shadow: {
    sm: {
      shadowColor: '#1e3c22',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#1e3c22',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 12,
      elevation: 5,
    },
  },
} as const;

export { Colors };
export type ThemeColors = typeof Colors;
