import { execFileSync } from 'node:child_process';
import { copyFile, cp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourcePackage = JSON.parse(await readFile(resolve(rootDir, 'package.json'), 'utf8'));
const distDir = resolve(rootDir, 'dist');
const tempRoot = resolve(distDir, '.npm-package');
const packageDir = resolve(tempRoot, 'package');
const archiveName = `${sourcePackage.name}-${sourcePackage.version}-dist.tgz`;
const finalArchive = resolve(distDir, archiveName);

await rm(tempRoot, { force: true, recursive: true });
await rm(finalArchive, { force: true });
await mkdir(packageDir, { recursive: true });
await mkdir(resolve(packageDir, 'dist'), { recursive: true });

await cp(resolve(rootDir, 'bin'), resolve(packageDir, 'bin'), { recursive: true });
await cp(resolve(distDir, 'assets'), resolve(packageDir, 'dist/assets'), { recursive: true });
await copyFile(resolve(distDir, 'index.html'), resolve(packageDir, 'dist/index.html'));
await copyFile(resolve(rootDir, 'README.md'), resolve(packageDir, 'README.md'));

const releasePackage = {
  name: sourcePackage.name,
  version: sourcePackage.version,
  description: 'Interactive Mermaid diagram-as-code editor',
  type: 'module',
  bin: {
    'diagram-as-code': 'bin/diagram-as-code.js',
  },
  files: ['bin', 'dist', 'README.md'],
  engines: {
    node: '>=18',
  },
};

await writeFile(resolve(packageDir, 'package.json'), `${JSON.stringify(releasePackage, null, 2)}\n`);

execFileSync('npm', ['pack', packageDir, '--pack-destination', tempRoot], {
  cwd: rootDir,
  stdio: 'inherit',
});

const packedFiles = await readdir(tempRoot);
const packedArchive = packedFiles.find((file) => file.endsWith('.tgz'));

if (!packedArchive) {
  throw new Error('npm pack did not create a tgz archive.');
}

await rename(resolve(tempRoot, packedArchive), finalArchive);
await rm(tempRoot, { force: true, recursive: true });

console.log(`Created ${basename(finalArchive)}`);
