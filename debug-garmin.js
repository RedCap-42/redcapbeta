import { supabase } from './utils/supabase';

// Script de test pour diagnostiquer les données Garmin
// À exécuter dans la console du navigateur

async function debugGarminData() {
  console.log('=== DEBUG GARMIN DATA ===');
  
  // Vérifier l'utilisateur connecté
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log('Current user:', user?.id, userError);
  
  if (!user) {
    console.log('❌ No user logged in');
    return;
  }
  
  // Test 1: Compter toutes les activités
  const { count: totalCount, error: countError } = await supabase
    .from('garmin_activities')
    .select('*', { count: 'exact', head: true });
  
  console.log('Total activities in database:', totalCount, countError);
  
  // Test 2: Compter les activités de l'utilisateur
  const { count: userCount, error: userCountError } = await supabase
    .from('garmin_activities')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);
    
  console.log('User activities count:', userCount, userCountError);
  
  // Test 3: Récupérer quelques activités de l'utilisateur
  const { data: userActivities, error: userActivitiesError } = await supabase
    .from('garmin_activities')
    .select('*')
    .eq('user_id', user.id)
    .limit(5);
    
  console.log('User activities sample:', userActivities, userActivitiesError);
  
  // Test 4: Vérifier les dates
  if (userActivities && userActivities.length > 0) {
    console.log('Activity dates:');
    userActivities.forEach(activity => {
      console.log(`- ${activity.activity_name}: ${activity.start_time} (duration: ${activity.duration})`);
    });
  }
  
  // Test 5: Vérifier les activités pour 2025
  const { data: activities2025, error: error2025 } = await supabase
    .from('garmin_activities')
    .select('*')
    .eq('user_id', user.id)
    .gte('start_time', '2025-01-01T00:00:00.000Z')
    .lt('start_time', '2026-01-01T00:00:00.000Z');
    
  console.log('Activities for 2025:', activities2025?.length || 0, error2025);
  
  return {
    totalCount,
    userCount,
    userActivities,
    activities2025
  };
}

// Exposer la fonction globalement pour l'utiliser dans la console
window.debugGarminData = debugGarminData;
