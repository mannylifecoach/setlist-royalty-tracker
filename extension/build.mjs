import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const buildOptions = {
  bundle: true,
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  target: ['chrome120'],
  outdir: 'dist',
  entryPoints: [
    { in: 'popup/popup.ts', out: 'popup/popup' },
    { in: 'content/bmi-filler.ts', out: 'content/bmi-filler' },
    { in: 'background/service-worker.ts', out: 'background/service-worker' },
    { in: 'options/options.ts', out: 'options/options' },
  ],
};

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(buildOptions);

  // Copy static files to dist
  const fs = await import('fs');
  const path = await import('path');

  const staticFiles = [
    'manifest.json',
    'popup/popup.html',
    'popup/popup.css',
    'content/bmi-filler.css',
    'options/options.html',
    'options/options.css',
  ];

  for (const file of staticFiles) {
    const src = path.resolve(file);
    const dest = path.resolve('dist', file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }

  // Copy icons if they exist
  const iconsDir = path.resolve('icons');
  const destIconsDir = path.resolve('dist', 'icons');
  if (fs.existsSync(iconsDir)) {
    fs.mkdirSync(destIconsDir, { recursive: true });
    for (const icon of fs.readdirSync(iconsDir)) {
      fs.copyFileSync(path.join(iconsDir, icon), path.join(destIconsDir, icon));
    }
  }

  console.log('Build complete → dist/');
}
