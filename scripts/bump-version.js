#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const type = process.argv[2] || 'patch'; // 'patch' | 'minor' | 'major'

const packageJsonPath = path.resolve(__dirname, '../package.json');
const versionTsPath = path.resolve(__dirname, '../src/config/version.ts');

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = pkg.version || '0.1.0';

const [major, minor, patch] = currentVersion.split('.').map(Number);

let newMajor = major;
let newMinor = minor;
let newPatch = patch;

if (type === 'major') {
  newMajor += 1;
  newMinor = 0;
  newPatch = 0;
} else if (type === 'minor') {
  newMinor += 1;
  newPatch = 0;
} else {
  newPatch += 1;
}

const newVersion = `${newMajor}.${newMinor}.${newPatch}`;
const stage = 'alpha';
const fullString = `v${newVersion}-${stage}`;

// Format date into DD/MM/YYYY
const now = new Date();
const day = String(now.getDate()).padStart(2, '0');
const month = String(now.getMonth() + 1).padStart(2, '0');
const year = now.getFullYear();
const buildDate = `${day}/${month}/${year}`;

// 1. Update package.json
pkg.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

// 2. Update src/config/version.ts
const versionTsContent = `export const APP_VERSION = {
  version: "${newVersion}",
  stage: "${stage}", // "alpha" | "beta" | "rc" | "stable"
  fullString: "${fullString}",
  buildDate: "${buildDate}",
};

/**
 * Format date string or Date object into standard Vietnamese date format DD/MM/YYYY
 */
export function formatDateVN(dateString?: string | Date | null): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return \`\${day}/\${month}/\${year}\`;
}
`;

fs.writeFileSync(versionTsPath, versionTsContent, 'utf8');

console.log(`✅ Version bumped successfully: ${currentVersion} -> ${newVersion} (${fullString}) [${buildDate}]`);
