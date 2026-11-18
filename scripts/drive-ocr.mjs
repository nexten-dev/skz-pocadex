// Diagnóstico: lê o TEXTO escrito em cada imagem das pastas do Drive (OCR com tesseract),
// para descobrir qual membro/álbum/versão cada template mostra.
// Não salva as imagens: baixa para uma pasta temporária, lê o texto e apaga.
// Uso (no GitHub Actions, com tesseract instalado): node scripts/drive-ocr.mjs [idDaPasta...]
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crawl, driveImage } from './drive.mjs';

const cfg = JSON.parse(readFileSync(new URL('../data/drive-sources.json', import.meta.url), 'utf-8'));
const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const roots = ids.length ? ids : cfg.folders;
const dir = mkdtempSync(join(tmpdir(), 'ocr-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function dims(buf) {
  // PNG: largura/altura nos bytes 16–23; JPEG: procura o marcador SOF
  if (buf[0] === 0x89) return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
  for (let i = 2; i < buf.length - 9; ) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return `${buf.readUInt16BE(i + 7)}x${buf.readUInt16BE(i + 5)}`;
    i += 2 + len;
  }
  return '?';
}

for (const root of roots) {
  console.log(`\n================ pasta ${root}`);
  const files = await crawl(root);
  for (const f of files) {
    if (!/\.(png|jpe?g)$/i.test(f.name)) continue;
    await sleep(300);
    let text = '';
    let size = '?';
    try {
      const res = await fetch(driveImage(f.id).url, { headers: { 'User-Agent': 'Mozilla/5.0 (skz-pocadex; projeto de fã)' } });
      const buf = Buffer.from(await res.arrayBuffer());
      size = dims(buf);
      const file = join(dir, 'img');
      writeFileSync(file, buf);
      text = execFileSync('tesseract', [file, 'stdout', '-l', 'eng', '--psm', '11'], { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .replace(/\s+/g, ' ')
        .trim();
      rmSync(file, { force: true });
    } catch (e) {
      text = `(erro: ${e.message.slice(0, 80)})`;
    }
    console.log(`• ${f.path.join(' / ')} / ${f.name}  [${size}]  id=${f.id}`);
    console.log(`    texto: ${text.slice(0, 500)}`);
  }
}
rmSync(dir, { recursive: true, force: true });
