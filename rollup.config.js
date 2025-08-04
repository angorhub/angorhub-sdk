import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import { defineConfig } from 'rollup';

// Base config
const config = {
  input: 'src/index.ts',
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      useTsconfigDeclarationDir: true
    })
  ]
};

export default defineConfig([
  // Browser IIFE bundle - the simplest format for browsers
  {
    ...config,
    output: {
      file: 'dist/browser/angorhub-sdk.bundle.js',
      format: 'iife',
      name: 'AngorHubSDK', // This becomes the global variable name
      sourcemap: true,
      globals: {
        axios: 'axios' // We're expecting axios to be available globally
      }
    },
    external: ['axios'] // External as we're including it separately in HTML
  },
  // ESM module
  {
    ...config,
    output: {
      dir: 'dist/esm',
      format: 'esm',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src'
    },
    external: ['axios']
  },
  // CommonJS bundle
  {
    ...config,
    output: {
      file: 'dist/cjs/angorhub-sdk.cjs.js',
      format: 'cjs',
      sourcemap: true
    },
    external: ['axios']
  }
]);
