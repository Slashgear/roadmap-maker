# TODO

## Documentation

- [x] Ajouter un schéma Mermaid ER de la base de données dans la section **Team mode** du README
- [x] Ajouter un schéma d'architecture Mermaid (flowchart) montrant les deux modes côte à côte (localStorage vs Hono → PostgreSQL → SSE)
- [x] Documenter tous les événements SSE (types + payload) dans le README → déjà couvert dans CONTRIBUTING.md
- [x] Ajouter un tableau de référence rapide des endpoints API (méthode + description) en complément du Swagger
- [x] Documenter le champ `version` (optimistic locking) dans la section **Data format** du README
- [x] Vérifier et compléter CONTRIBUTING.md avec le workflow de dev complet → déjà complet

## Quick wins

- [ ] Ajouter les indexes SQL manquants (`roadmaps.slug`, `sections.roadmap_id`, `tasks.section_id`)
- [ ] Afficher un toast d'erreur sur les échecs API (mode team) — actuellement les erreurs sont avalées silencieusement
- [ ] Améliorer les messages d'erreur Zod lors d'un import invalide (message technique exposé à l'utilisateur)
- [ ] Extraire les statuts (`confirmed | started | pending | critical | done`) en constantes partagées
- [ ] Ajouter des états de chargement sur les boutons async (export PNG/SVG, actions mode team)

## Performance

- [ ] Corriger le pattern N+1 queries dans `getSectionsByRoadmapId` (1 query par section → remplacer par un JOIN)
- [ ] Ajouter de la pagination sur la liste des roadmaps (chargement intégral → risque de freeze avec 100+)

## Robustesse / UX

- [ ] Implémenter la reconnexion automatique du SSE avec backoff exponentiel
- [ ] Afficher un feedback utilisateur sur les conflits de version 409 (actuellement ignoré silencieusement)
- [ ] Valider les variables d'environnement au démarrage du serveur (Zod) — `AUTH_TOKEN` manquant détecté trop tard

## Fonctionnalités

- [ ] Tri et recherche de roadmaps (actuellement ordre d'insertion uniquement)
- [ ] Undo/redo en mode team (présent en mode static, absent en mode team)

## Code quality

- [ ] Extraire les helpers communs d'`App.tsx` et `AppTeam.tsx` vers `/client/src/lib/` (slugify, localISO, états des modals…)
- [ ] Rendre les sessions persistantes (actuellement `Map<sessionId, Date>` en mémoire, perdu au redémarrage)
