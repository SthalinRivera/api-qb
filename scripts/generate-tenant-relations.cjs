// Genera metadatos de FK: el DMMF reducido de Prisma 7 omite relationFromFields.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
const relations = {};
const listRelations = {};
for (const model of schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
  relations[model[1]] = [];
  listRelations[model[1]] = [];
  for (const line of model[2].split('\n')) {
    const list = line.match(/^\s*(\w+)\s+\w+\[\]/);
    if (list) listRelations[model[1]].push(list[1]);
    const match = line.match(/^\s*(\w+)\s+(\w+)[?\[\]]*\s+.*@relation\([^\n]*fields:\s*\[([^\]]+)\][^\n]*references:\s*\[([^\]]+)\]/);
    if (match) relations[model[1]].push({ name: match[1], type: match[2], from: match[3].split(',').map(s=>s.trim()), to: match[4].split(',').map(s=>s.trim()) });
  }
}
fs.writeFileSync(path.join(root, 'src/common/security/tenant-relations.generated.ts'), '// Generado por scripts/generate-tenant-relations.cjs. No editar a mano.\nexport const tenantRelations: Record<string, { name: string; type: string; from: string[]; to: string[] }[]> = '+JSON.stringify(relations,null,2)+';\n');

fs.appendFileSync(path.join(root, 'src/common/security/tenant-relations.generated.ts'), 'export const listRelations: Record<string, string[]> = '+JSON.stringify(listRelations,null,2)+';\n');
