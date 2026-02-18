#!/usr/bin/env node

const major = Number.parseInt(process.versions.node.split('.')[0], 10);

if (!Number.isFinite(major)) {
  console.error('Impossibile determinare la versione di Node.js in uso.');
  process.exit(1);
}

if (major < 20 || major > 22) {
  console.error(
    `Versione Node.js non supportata: v${process.versions.node}. Usa Node.js 20.x o 22.x LTS.`
  );
  process.exit(1);
}
