# Système de Dossiers pour Chaussures

Ce système permet d'organiser vos chaussures de course dans des dossiers personnalisés avec une interface drag & drop.

## Installation

1. Exécutez le script SQL de migration :
```sql
-- Exécutez le contenu du fichier migrations/create_shoes_folders.sql dans votre base Supabase
```

## Fonctionnalités

### 🗂️ Création de Dossiers
- Créez des dossiers thématiques (ex: "Chaussures de trail", "Chaussures de route", etc.)
- Personnalisez le nom, la description et la couleur de chaque dossier
- 8 couleurs prédéfinies disponibles

### 🏃‍♂️ Organisation par Drag & Drop
- Glissez-déposez vos chaussures dans les dossiers souhaités
- Réorganisez facilement vos chaussures entre les dossiers
- Les chaussures non organisées restent dans une section dédiée

### 🎯 Interface Intuitive
- Basculez entre la vue "Liste" (classique) et "Dossiers" (nouvelle)
- Interface moderne avec animations et feedback visuel
- Couleurs personnalisées pour identifier rapidement vos dossiers

## Structure des Tables

### `shoes_folders`
- `id` : Identifiant unique du dossier
- `user_id` : Référence vers l'utilisateur
- `name` : Nom du dossier
- `description` : Description optionnelle
- `color` : Couleur hex du dossier (#3B82F6 par défaut)
- `created_at` / `updated_at` : Horodatage

### `shoes_folder_items`
- `id` : Identifiant unique de l'association
- `user_id` : Référence vers l'utilisateur
- `folder_id` : Référence vers le dossier
- `shoe_id` : Référence vers la chaussure
- `order_position` : Position dans le dossier (pour le tri)

## Sécurité (RLS)

- Toutes les tables utilisent Row Level Security (RLS)
- Chaque utilisateur ne peut voir que ses propres dossiers et associations
- Policies complètes pour SELECT, INSERT, UPDATE, DELETE

## Utilisation

1. Accédez à la page "Chaussures" dans votre dashboard
2. Cliquez sur le bouton "Dossiers" en haut à droite
3. Créez vos premiers dossiers avec le bouton "+ Créer un dossier"
4. Glissez-déposez vos chaussures dans les dossiers appropriés
5. Utilisez les couleurs pour identifier visuellement vos catégories

## Contraintes

- Un utilisateur ne peut pas avoir deux dossiers avec le même nom
- Une chaussure ne peut être que dans un seul dossier à la fois
- Suppression en cascade : supprimer un dossier libère automatiquement ses chaussures
