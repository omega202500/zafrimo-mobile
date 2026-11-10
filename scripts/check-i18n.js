const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../www/js/locales');
const LOCALES = ['it', 'fr', 'en'];

// Charger les fichiers de langue
function loadLocale(locale) {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

// Extraire toutes les clés d'un objet plat
function extractKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys.push(...extractKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Vérifier les clés manquantes
function checkMissingKeys() {
  console.log('=== Vérification des clés i18n ===\n');

  const locales = {};
  LOCALES.forEach(locale => {
    locales[locale] = loadLocale(locale);
  });

  const itKeys = new Set(extractKeys(locales.it));
  const frKeys = new Set(extractKeys(locales.fr));
  const enKeys = new Set(extractKeys(locales.en));

  // Clés manquantes dans fr
  const missingInFr = [...itKeys].filter(k => !frKeys.has(k));
  if (missingInFr.length > 0) {
    console.log(`❌ Clés manquantes dans fr.json (${missingInFr.length}):`);
    missingInFr.forEach(k => console.log(`   - ${k}`));
  } else {
    console.log('✅ fr.json : toutes les clés présentes');
  }

  // Clés manquantes dans en
  const missingInEn = [...itKeys].filter(k => !enKeys.has(k));
  if (missingInEn.length > 0) {
    console.log(`\n❌ Clés manquantes dans en.json (${missingInEn.length}):`);
    missingInEn.forEach(k => console.log(`   - ${k}`));
  } else {
    console.log('✅ en.json : toutes les clés présentes');
  }

  // Clés en trop dans fr
  const extraInFr = [...frKeys].filter(k => !itKeys.has(k));
  if (extraInFr.length > 0) {
    console.log(`\n⚠️  Clés en trop dans fr.json (${extraInFr.length}):`);
    extraInFr.forEach(k => console.log(`   - ${k}`));
  }

  // Clés en trop dans en
  const extraInEn = [...enKeys].filter(k => !itKeys.has(k));
  if (extraInEn.length > 0) {
    console.log(`\n⚠️  Clés en trop dans en.json (${extraInEn.length}):`);
    extraInEn.forEach(k => console.log(`   - ${k}`));
  }

  console.log(`\n=== Résumé ===`);
  console.log(`it.json : ${itKeys.size} clés`);
  console.log(`fr.json : ${frKeys.size} clés (diff: ${frKeys.size - itKeys.size})`);
  console.log(`en.json : ${enKeys.size} clés (diff: ${enKeys.size - itKeys.size})`);

  if (missingInFr.length === 0 && missingInEn.length === 0) {
    console.log('\n✅ Tous les fichiers sont synchronisés !');
    process.exit(0);
  } else {
    console.log('\n❌ Des clés sont manquantes. Corrigez les fichiers avant de continuer.');
    process.exit(1);
  }
}

checkMissingKeys();
