# TODO

## Documentation

- [x] Ajouter un schéma Mermaid ER de la base de données dans la section **Team mode** du README
- [x] Ajouter un schéma d'architecture Mermaid (flowchart) montrant les deux modes côte à côte (localStorage vs Hono → PostgreSQL → SSE)
- [x] Documenter tous les événements SSE (types + payload) dans le README → déjà couvert dans CONTRIBUTING.md
- [x] Ajouter un tableau de référence rapide des endpoints API (méthode + description) en complément du Swagger
- [x] Documenter le champ `version` (optimistic locking) dans la section **Data format** du README
- [x] Vérifier et compléter CONTRIBUTING.md avec le workflow de dev complet → déjà complet

## Quick wins

- [x] Ajouter les indexes SQL manquants (`roadmaps.slug`, `sections.roadmap_id`, `tasks.section_id`)
- [ ] Afficher un toast d'erreur sur les échecs API (mode team) — actuellement les erreurs sont avalées silencieusement
- [x] Améliorer les messages d'erreur Zod lors d'un import invalide (message technique exposé à l'utilisateur)
- [x] Extraire les statuts (`confirmed | started | pending | critical | done`) en constantes partagées
- [x] Ajouter des états de chargement sur les boutons async (export PNG/SVG, actions mode team)

## Performance

- [x] Corriger le pattern N+1 queries dans `getSectionsByRoadmapId` (1 query par section → `WHERE section_id = ANY($ids)`)
- [ ] Ajouter de la pagination sur la liste des roadmaps (chargement intégral → risque de freeze avec 100+)

## Robustesse / UX

- [x] Feedback visuel quand le SSE se déconnecte — bandeau "reconnecting…" qui disparaît au retour de l'événement `init`
- [x] Afficher un feedback utilisateur sur les conflits de version 409 (bannière amber + fermeture du modal)
- [x] Valider les variables d'environnement au démarrage du serveur — `AUTH_TOKEN` et `DATABASE_URL` vérifiés ensemble, message clair avec les vars manquantes

## Fonctionnalités

- [x] Recherche de roadmaps — input de filtrage par titre, visible à partir de 6 roadmaps (static + team)
- [ ] Undo/redo en mode team (présent en mode static, absent en mode team)

## Code quality

- [x] Extraire les helpers communs d'`App.tsx` et `AppTeam.tsx` vers `/client/src/lib/` (slugify, localISO, états des modals…)
- [ ] Rendre les sessions persistantes (actuellement `Map<sessionId, Date>` en mémoire, perdu au redémarrage)
