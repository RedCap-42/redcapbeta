#!/usr/bin/env node

/**
 * Script pour nettoyer les tokens d'authentification corrompus
 * Utilisation: node clear-auth.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Nettoyage des tokens d\'authentification...');

// Nettoyer les fichiers de cache Next.js
const nextDir = path.join(__dirname, '.next');
if (fs.existsSync(nextDir)) {
  console.log('Suppression du cache Next.js...');
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log('✅ Cache Next.js supprimé');
}

// Nettoyer les fichiers de cache Node.js
const nodeModulesCache = path.join(__dirname, 'node_modules', '.cache');
if (fs.existsSync(nodeModulesCache)) {
  console.log('Suppression du cache Node.js...');
  fs.rmSync(nodeModulesCache, { recursive: true, force: true });
  console.log('✅ Cache Node.js supprimé');
}

console.log(`
✅ Nettoyage terminé !

Instructions supplémentaires :
1. Redémarrez votre serveur de développement
2. Ouvrez votre navigateur en mode privé/incognito
3. Ou effacez manuellement les cookies pour localhost dans votre navigateur
4. Les cookies à supprimer sont :
   - supabase-auth-token
   - sb-localhost-auth-token
   - sb-auth-token

Commande pour redémarrer le serveur :
npm run dev
`);
