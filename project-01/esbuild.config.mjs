import esbuild from "esbuild";

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
}).catch(() => process.exit(1));
