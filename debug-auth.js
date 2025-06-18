// Script de débogage pour nettoyer l'état d'authentification
// Utiliser ce script en cas de problème de boucle d'authentification

import { supabase, forceAuthCleanup } from '../src/utils/supabase.js';

async function debugAuth() {
  console.log('=== Débogage de l\'authentification ===');
  
  try {
    // 1. Vérifier l'état actuel
    console.log('1. Vérification de l\'état actuel...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('Session actuelle:', sessionData.session ? 'existe' : 'null');
    console.log('Erreur session:', sessionError?.message || 'aucune');
    
    // 2. Forcer la déconnexion
    console.log('2. Déconnexion forcée...');
    await supabase.auth.signOut();
    
    // 3. Nettoyage complet
    console.log('3. Nettoyage complet...');
    await forceAuthCleanup();
    
    // 4. Vérifier que tout est nettoyé
    console.log('4. Vérification du nettoyage...');
    const { data: cleanSessionData, error: cleanSessionError } = await supabase.auth.getSession();
    console.log('Session après nettoyage:', cleanSessionData.session ? 'existe encore' : 'null');
    console.log('Erreur après nettoyage:', cleanSessionError?.message || 'aucune');
    
    console.log('=== Nettoyage terminé ===');
    console.log('Vous pouvez maintenant redémarrer l\'application.');
    
  } catch (error) {
    console.error('Erreur pendant le débogage:', error);
  }
}

// Exécuter le script
debugAuth();
