import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const version = JSON.parse(await readFile('package.json', 'utf8')).version;
const files = [];
for (const extension of ['AppImage', 'deb']) {
  const name = `Animer-${version}-linux-x86_64.${extension}`;
  files.push({ name, bytes: (await stat(`dist/linux/${name}`)).size, sha256: createHash('sha256').update(await readFile(`dist/linux/${name}`)).digest('hex') });
}
await writeFile('dist/linux/SHA256SUMS.txt', files.map(file => `${file.sha256}  ${file.name}`).join('\n') + '\n');
await writeFile('dist/linux/linux-artifacts.json', JSON.stringify({ app: 'Animer', version, architecture: 'x86_64', files }, null, 2));
console.log(JSON.stringify(files));
