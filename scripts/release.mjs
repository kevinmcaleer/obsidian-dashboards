/**
 * Bump version, commit, tag, and push — triggering the GitHub Actions release workflow.
 *
 * Usage:
 *   npm run release          # bumps patch (1.0.0 → 1.0.1)
 *   npm run release minor    # bumps minor (1.0.0 → 1.1.0)
 *   npm run release major    # bumps major (1.0.0 → 2.0.0)
 *   npm run release 1.2.3    # sets exact version
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const arg = process.argv[2] || 'patch';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const oldVersion = pkg.version;

let newVersion;
if (/^\d+\.\d+\.\d+$/.test(arg)) {
  newVersion = arg;
} else {
  const parts = oldVersion.split('.').map(Number);
  if (arg === 'major') { parts[0]++; parts[1] = 0; parts[2] = 0; }
  else if (arg === 'minor') { parts[1]++; parts[2] = 0; }
  else { parts[2]++; }
  newVersion = parts.join('.');
}

pkg.version = newVersion;
manifest.version = newVersion;

writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
writeFileSync('manifest.json', JSON.stringify(manifest, null, 2) + '\n');

console.log(`Version: ${oldVersion} → ${newVersion}`);

console.log('Building...');
execSync('npm run build', { stdio: 'inherit' });

console.log('Committing and tagging...');
execSync('git add -A', { stdio: 'inherit' });
execSync(`git commit -m "Release ${newVersion}"`, { stdio: 'inherit' });
execSync(`git tag ${newVersion}`, { stdio: 'inherit' });

console.log('Pushing...');
execSync('git push && git push --tags', { stdio: 'inherit' });

console.log(`\nReleased ${newVersion} — GitHub Actions will create the release.`);
