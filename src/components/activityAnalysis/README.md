# Composants d'Analyse d'Activité

## Allure.tsx

Ce composant affiche un graphique d'allure en temps réel basé sur les données FIT de l'activité.

### Fonctionnalités

- **Graphique d'allure brute** : Affiche tous les points de données sans lissage
- **Axe Y inversé** : Plus rapide en haut, plus lent en bas (convention standard)
- **Calcul précis** : Utilise les données de distance et de vitesse des fichiers FIT
- **Filtrage intelligent** : Élimine les valeurs aberrantes (allures > 30 min/km)

### Algorithme de calcul

1. **Priorité aux données enhanced** : Utilise `enhanced_speed` et `enhanced_distance` si disponibles
2. **Méthode basée sur la distance** : Si la distance cumulée est disponible dans le FIT
3. **Méthode basée sur la vitesse** : Estime la distance à partir de la vitesse et du temps

### Données affichées

- **Allure moyenne** : Calculée à partir de la distance totale et du temps total
- **Distance totale** : En kilomètres
- **Graphique interactif** : Survol pour voir l'allure exacte à chaque point

### Structure des données

```typescript
interface PaceDataPoint {
  distance: number; // en km
  pace: number;     // en secondes par km
  speed: number;    // en m/s
}
```

### Gestion des erreurs

- Affichage d'un message d'erreur si le fichier FIT n'est pas accessible
- Indicateur de chargement pendant le traitement
- Message informatif si aucune donnée d'allure n'est disponible
