import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
const target = 'dist/linux-app';
const source = JSON.parse(await readFile('package.json', 'utf8'));
await mkdir(target, { recursive: true });
for (const [from, to] of [['desktop/main.cjs', 'main.cjs'], ['dist/server/index.js', 'worker.mjs'], ['public/icon.png', 'icon.png'], ['LICENSE', 'LICENSE'], ['THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.md']]) await copyFile(from, `${target}/${to}`);
await writeFile(`${target}/package.json`, JSON.stringify({ name: 'animer', version: source.version, desktopName: 'animer.desktop', main: 'main.cjs', description: 'Anime et bibliothèque locale sur Linux', license: 'ISC', author: { name: 'Animer', email: 'noreply@users.noreply.github.com' }, homepage: 'https://github.com/Jfdedit3/Animer' }, null, 2));
console.log(`Application Linux préparée : ${target}`);
