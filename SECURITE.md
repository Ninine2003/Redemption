# Sécurité — Verrouillage des données (RLS + auth admin)

Ce document décrit le nouveau modèle de sécurité et la procédure de déploiement.

## Ce qui a changé

**Avant :** la clé publique `anon` (visible dans le code) avait un accès complet
(lecture/écriture/suppression) à toutes les tables. N'importe qui pouvait lire les
commandes, messages et abonnés (noms, téléphones, emails, adresses, GPS). Le mot de
passe admin était en clair dans `dashboard.html`.

**Après :**
- `anon` ne peut plus que **lire le catalogue public** (produits, collections,
  arrivages, vidéos, bestsellers actifs) et **insérer les soumissions publiques**
  (commandes, messages, newsletter, paiements Wave, paniers abandonnés, push).
- Les **données clients ne sont plus lisibles** avec la clé publique.
- Le dashboard lit/écrit ces données via des **Netlify Functions authentifiées**
  (`admin-api`) utilisant la clé `service_role`, derrière une **session admin signée**
  (cookie HttpOnly HMAC). Aucun identifiant ni clé secrète n'est dans le navigateur.

### Fichiers ajoutés
- `netlify/functions/lib/session.js` — signature/vérif des sessions (HMAC).
- `netlify/functions/admin-login.js` — login → cookie de session signé.
- `netlify/functions/admin-logout.js` — fin de session.
- `netlify/functions/admin-session.js` — vérification de session au chargement.
- `netlify/functions/admin-api.js` — CRUD authentifié (service_role).

### Fichiers modifiés
- `dashboard.html` — login/session serveur + `dashboardApi` branché sur `admin-api`.
- `supabase_schema.sql` — RLS verrouillé (réécriture propre, sans contradictions).
- `supabase_restore_anon.sql` — neutralisé (rouvrait tous les droits).
- `scripts/build.js` — plus d'injection d'identifiants dans le HTML.
- `netlify/functions/api.js` — `bestsellers` retiré des écritures publiques.

## Variables d'environnement Netlify (Site settings → Environment variables)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé **service_role** (secrète) — utilisée par admin-api et le webhook |
| `SUPABASE_ANON_KEY` | Clé publishable/anon — utilisée par l'API publique (`api.js`) |
| `ADMIN_USERNAME` | Identifiant admin du dashboard |
| `ADMIN_PASSWORD_HASH` | SHA-256 (hex) du **nouveau** mot de passe admin |
| `ADMIN_SESSION_SECRET` | Chaîne aléatoire longue pour signer les sessions |

> ⚠️ L'ancien mot de passe (`Ninine2003@`) est **compromis** : il était en clair et
> reste dans l'historique Git. Choisis un **nouveau** mot de passe.

### Générer `ADMIN_PASSWORD_HASH` (remplace TONMOTDEPASSE)
```bash
node -e "console.log(require('crypto').createHash('sha256').update('TONMOTDEPASSE').digest('hex'))"
```

### Générer `ADMIN_SESSION_SECRET`
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Procédure de déploiement (sans coupure)

L'ordre évite toute interruption : `service_role` contourne déjà le RLS, donc le
dashboard fonctionne dès que les fonctions sont déployées, et le site public continue
de tourner sous l'ancien RLS jusqu'au verrouillage final.

1. **Définir les variables d'environnement** ci-dessus sur Netlify.
2. **Déployer** le site (`npm run build` puis déploiement Netlify, ou push Git).
3. **Vérifier le dashboard** : `/dashboard.html` → se connecter avec
   `ADMIN_USERNAME` + nouveau mot de passe. Les commandes/paiements doivent s'afficher.
4. **Verrouiller la base** : ouvrir Supabase → SQL Editor → coller **tout**
   `supabase_schema.sql` → Run.
5. **Contrôle final** :
   - Site public : la boutique, les commandes et les formulaires marchent.
   - Test fuite : `GET https://<projet>.supabase.co/rest/v1/orders?select=*` avec la
     clé `anon` doit renvoyer **0 ligne** (ou une erreur de permission), plus la liste
     des clients.

## Points à durcir ensuite (non bloquants)

- **Uploads Storage** (images/vidéos) encore ouverts à `anon`. Risque = vandalisme de
  contenu (pas de fuite de données clients). À router via des URLs signées générées
  côté serveur dans un second temps.
- **Rotation des clés Supabase** recommandée (la clé publishable a circulé ; idéalement
  régénérer aussi le projet si la service_role a pu fuiter).
- **Historique Git** : l'ancien mot de passe et les clés sont dans les commits passés.
  Après rotation, envisager un nettoyage d'historique (git filter-repo / BFG).
- Ajouter `node_modules/`, `dist/`, `debug.log`, `.netlify/` au `.gitignore`.
