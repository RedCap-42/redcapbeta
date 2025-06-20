-- Insérer quelques aliments publics d'exemple
INSERT INTO public_aliment (nom, calories_kcal, proteines_g, glucides_g, dont_sucres_g, lipides_g, dont_satures_g, fibres_g, sel_sodium_g, type_aliment, vitamines, note_supplementaire) VALUES
('Pomme', 52, 0.3, 14, 10, 0.2, 0.1, 2.4, 0.001, 'fruit', 'Vitamine C, Vitamine K', 'Riche en fibres et antioxydants'),
('Banane', 89, 1.1, 23, 12, 0.3, 0.1, 2.6, 0.001, 'fruit', 'Vitamine B6, Vitamine C, Potassium', 'Excellente source de potassium'),
('Brocoli', 34, 2.8, 7, 1.5, 0.4, 0.1, 2.6, 0.033, 'legume', 'Vitamine C, Vitamine K, Folate', 'Très riche en vitamine C'),
('Riz blanc cuit', 130, 2.7, 28, 0.1, 0.3, 0.1, 0.4, 0.005, 'cereale', 'Thiamine, Niacine', 'Source d\'énergie rapide'),
('Saumon atlantique', 208, 25, 0, 0, 12, 3.1, 0, 0.3, 'poisson', 'Vitamine D, Vitamine B12, Oméga-3', 'Excellente source d\'oméga-3'),
('Œuf de poule', 155, 13, 1.1, 1.1, 11, 3.3, 0, 0.124, 'autre', 'Vitamine A, Vitamine D, Vitamine B12', 'Protéine complète'),
('Lait entier', 61, 3.2, 4.8, 4.8, 3.3, 2.1, 0, 0.044, 'produit_laitier', 'Vitamine D, Vitamine B12, Calcium', 'Source de calcium'),
('Pain complet', 247, 13, 41, 6, 4.2, 0.8, 7, 1.2, 'cereale', 'Vitamine B, Fer, Magnésium', 'Riche en fibres');

-- Note: Pour les aliments privés, ils seront ajoutés par les utilisateurs connectés
-- car ils nécessitent un user_id valide
