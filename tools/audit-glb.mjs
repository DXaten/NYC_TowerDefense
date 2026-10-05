// Quick geometry and payload audit for candidate enemy models.
// Usage: node tools/audit-glb.mjs [--triangles 3000] path/to/model.glb [...]
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

function readGlb(file) {
  const data = readFileSync(file);
  if (data.length < 20 || data.toString('ascii', 0, 4) !== 'glTF' || data.readUInt32LE(4) !== 2) {
    throw new Error('not a GLB 2.0 file');
  }
  if (data.readUInt32LE(8) !== data.length) throw new Error('invalid GLB length');
  const jsonLength = data.readUInt32LE(12);
  if (data.readUInt32LE(16) !== 0x4e4f534a || 20 + jsonLength > data.length) {
    throw new Error('missing or invalid JSON chunk');
  }
  return { data, gltf: JSON.parse(data.toString('utf8', 20, 20 + jsonLength)) };
}

function triangleCount(mode, count) {
  if (mode === undefined || mode === 4) return Math.floor(count / 3);
  if (mode === 5 || mode === 6) return Math.max(0, count - 2);
  return 0;
}

function audit(file, triangleBudget) {
  const { data, gltf } = readGlb(file);
  let triangles = 0;
  let vertices = 0;
  let draws = 0;
  const modes = new Set();
  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const vertexAccessor = gltf.accessors?.[primitive.attributes?.POSITION];
      const indexAccessor = gltf.accessors?.[primitive.indices];
      const count = indexAccessor?.count ?? vertexAccessor?.count ?? 0;
      vertices += vertexAccessor?.count ?? 0;
      triangles += triangleCount(primitive.mode, count);
      draws++;
      if (primitive.mode !== undefined && ![4, 5, 6].includes(primitive.mode)) modes.add(primitive.mode);
    }
  }
  const sizeMiB = data.length / 1048576;
  const warnings = [];
  if (triangles > triangleBudget) warnings.push(`over the ${triangleBudget} triangle game target`);
  if (draws > 2) warnings.push('more than 2 mesh primitives / draw calls');
  if (sizeMiB > 4) warnings.push('over 4 MiB on disk');
  if (modes.size) warnings.push(`non-triangle primitive modes: ${[...modes].join(', ')}`);
  if (!gltf.meshes?.length) warnings.push('no meshes');
  console.log(`${basename(file)}: ${triangles.toLocaleString()} triangles, ${vertices.toLocaleString()} vertices, ${draws} primitives, ${sizeMiB.toFixed(2)} MiB`);
  console.log(`  ${gltf.materials?.length ?? 0} materials, ${gltf.textures?.length ?? 0} textures, ${gltf.images?.length ?? 0} images, ${gltf.animations?.length ?? 0} animations`);
  for (const warning of warnings) console.log(`  REVIEW: ${warning}`);
  return warnings.length ? 1 : 0;
}

let args = process.argv.slice(2);
let triangleBudget = 3000;
if (args[0] === '--triangles') {
  triangleBudget = Number(args[1]);
  args = args.slice(2);
}
if (!args.length || !Number.isInteger(triangleBudget) || triangleBudget < 1) {
  console.error('Usage: node tools/audit-glb.mjs [--triangles 3000] model.glb [...]');
  process.exit(2);
}

let failures = 0;
for (const file of args) {
  try { failures += audit(file, triangleBudget); }
  catch (error) { console.error(`${basename(file)}: ${error.message}`); failures++; }
}
process.exitCode = failures ? 1 : 0;
