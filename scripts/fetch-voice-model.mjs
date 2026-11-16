#!/usr/bin/env node
/**
 * Autoaloja el reconocimiento de voz local de MIJIN (sin CDN, sin servidor de terceros en tiempo de uso).
 *
 * 1. Descarga desde huggingface.co los archivos mínimos de Whisper base (ONNX cuantizado q8) a
 *    public/models/onnx-community/whisper-base/ fijando la revisión (commit) para que sea reproducible.
 * 2. Copia el runtime WebAssembly de onnxruntime-web que usa @huggingface/transformers (paquete «webgpu»,
 *    variante asyncify) desde node_modules a public/ort/.
 * 3. Escribe public/models/onnx-community/whisper-base/manifest.json con tamaño y SHA-256 de cada archivo.
 *
 * Licencias: pesos «openai/whisper-base» Apache-2.0 (conversión ONNX de onnx-community, misma licencia);
 * onnxruntime-web MIT; @huggingface/transformers Apache-2.0. Ver docs/ASISTENTE_IA.md.
 *
 * Uso: node scripts/fetch-voice-model.mjs          (descarga lo que falte)
 *      node scripts/fetch-voice-model.mjs --check  (solo verifica tamaños/SHA-256, sale con 1 si algo falla)
 *      node scripts/fetch-voice-model.mjs --force  (vuelve a descargar todo)
 */
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, stat, writeFile, rename } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MODEL_ID = 'onnx-community/whisper-base';
/** Commit de huggingface.co/onnx-community/whisper-base revisado el 15-11-2026. */
export const MODEL_REVISION = '27a07b4b52b3a4c5886134bb4320e93e1a4bbc7c';
export const MODEL_FILES = [
  'config.json',
  'generation_config.json',
  'preprocessor_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_quantized.onnx',
];
/**
 * «asyncify» es el motor que transformers usa por defecto (su fábrica .mjs viene incluida en el paquete);
 * el básico (.wasm + .mjs) es el que transformers elige para Safari < 26 sin WebGPU (iPhone con iOS 18 o anterior).
 */
export const ORT_FILES = ['ort-wasm-simd-threaded.asyncify.wasm', 'ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs'];

const modelDir = join(ROOT, 'public', 'models', ...MODEL_ID.split('/'));
const ortDir = join(ROOT, 'public', 'ort');
const args = new Set(process.argv.slice(2));
const sha256 = async path => createHash('sha256').update(await readFile(path)).digest('hex');
const exists = async path => { try { return (await stat(path)).size > 0; } catch { return false; } };
const mb = bytes => `${(bytes / 1048576).toFixed(1)} MB`;

async function download(file) {
  const target = join(modelDir, ...file.split('/'));
  if (!args.has('--force') && await exists(target)) return target;
  await mkdir(dirname(target), { recursive: true });
  const url = `https://huggingface.co/${MODEL_ID}/resolve/${MODEL_REVISION}/${file}`;
  process.stdout.write(`Descargando ${file}… `);
  const response = await fetch(url, { headers: { 'User-Agent': 'chulla-vida-build-script' } });
  if (!response.ok) throw new Error(`${url} respondió ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(`${target}.part`, buffer); await rename(`${target}.part`, target);
  console.log(mb(buffer.length));
  return target;
}

async function main() {
  const manifestPath = join(modelDir, 'manifest.json');
  if (args.has('--check')) {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    let ok = true;
    for (const entry of manifest.files) {
      const path = join(ROOT, 'public', ...entry.path.split('/'));
      const actual = (await exists(path)) ? await sha256(path) : 'falta';
      if (actual !== entry.sha256) { ok = false; console.error(`✗ ${entry.path}: ${actual}`); }
    }
    console.log(ok ? `✓ ${manifest.files.length} archivos de voz local verificados (${mb(manifest.totalBytes)})` : 'Archivos de voz local incompletos: ejecuta node scripts/fetch-voice-model.mjs');
    process.exit(ok ? 0 : 1);
  }
  const files = [];
  for (const file of MODEL_FILES) {
    const path = await download(file);
    files.push({ path: `models/${MODEL_ID}/${file}`, bytes: (await stat(path)).size, sha256: await sha256(path) });
  }
  await mkdir(ortDir, { recursive: true });
  for (const file of ORT_FILES) {
    const source = join(ROOT, 'node_modules', 'onnxruntime-web', 'dist', file);
    const target = join(ortDir, file);
    await copyFile(source, target);
    files.push({ path: `ort/${file}`, bytes: (await stat(target)).size, sha256: await sha256(target) });
  }
  const ortVersion = JSON.parse(await readFile(join(ROOT, 'node_modules', 'onnxruntime-web', 'package.json'), 'utf8')).version;
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
  const manifest = {
    model: MODEL_ID, revision: MODEL_REVISION, dtype: 'q8', language: 'spanish', task: 'transcribe',
    licenses: { weights: 'Apache-2.0 (openai/whisper-base; conversión ONNX onnx-community)', runtime: `MIT (onnxruntime-web ${ortVersion})`, library: 'Apache-2.0 (@huggingface/transformers)' },
    totalBytes, files,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Listo: ${files.length} archivos, ${mb(totalBytes)} en total (se descargan una sola vez por dispositivo).`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
