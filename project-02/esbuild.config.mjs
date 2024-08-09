import esbuild from "esbuild";
import alias from "esbuild-plugin-alias";

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.js',
  minify: true,
  sourcemap: false,
  treeShaking: true,
  logLevel: "info",
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  plugins: [
    alias({
      '@': './src'
    })
  ]
}).catch(() => process.exit(1));
