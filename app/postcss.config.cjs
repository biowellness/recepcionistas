/**
 * Configuración PostCSS de Mantine (setup recomendado por la doc).
 *
 * `postcss-preset-mantine` habilita las mixins/funciones de Mantine y
 * `postcss-simple-vars` resuelve los breakpoints `$mantine-breakpoint-*` que
 * trae el CSS de Mantine y de `@medplum/react` a valores reales (`em`). Sin
 * esto, esos tokens se cuelan al CSS final y un minificador estricto
 * (lightningcss, usado por Vite/rolldown) falla con "Invalid media query".
 */
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};
