import { createTheme } from '@mantine/core';

/** Tema simple y amable: tipografía grande, botones cómodos. Para recepción, no para programadores. */
export const theme = createTheme({
  primaryColor: 'teal',
  defaultRadius: 'md',
  fontSizes: {
    md: '1rem',
    lg: '1.125rem',
  },
  components: {
    Button: {
      defaultProps: { size: 'md' },
    },
  },
});
