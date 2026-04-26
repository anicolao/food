import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

// Setup mocks for SvelteKit aliases
const appDir = join('node_modules', '$app');
const pathsDir = join(appDir, 'paths');

mkdirSync(pathsDir, { recursive: true });
writeFileSync(join(pathsDir, 'index.js'), "export const base = '';");
writeFileSync(join(appDir, 'package.json'), JSON.stringify({
    name: '$app',
    type: 'module'
}));

console.log('Mocks for $app/paths created.');

try {
    execSync('npx tsx --test tests/unit/*.test.ts', { stdio: 'inherit' });
} catch (e) {
    process.exit(1);
}
