# Application de gestion de courses

Application web statique (JS + Bootstrap + Chart.js) stockant localement les achats (localStorage). Facile à héberger sur **GitHub Pages** ou **Netlify**.

## Choix d'hébergement
- **GitHub Pages** (recommandé pour cette version statique) : créez un dépôt, poussez ce dossier sur `main` et activez Pages dans les réglages -> Branch `main` / folder `/`.
- **Netlify** : connectez votre dépôt GitHub à Netlify et déployez; utile si vous voulez plus tard ajouter des fonctions serverless.

## Déploiement rapide (GitHub)
1. Initialisez git dans le dossier si nécessaire : `git init`.
2. `git add . && git commit -m "Initial commit"`
3. Poussez vers GitHub.

## Déploiement avec backend (suggestions)
- Heroku : `heroku create && git push heroku main` (Heroku détecte `Procfile` et déploie automatiquement). Pour un premier test c'est le plus simple.
- Render / Railway : connectez votre dépôt GitHub et autorisez le déploiement automatique; le `Dockerfile` ou `Procfile` sera utilisé.
- Docker : `docker build -t courses-app . && docker run -p 5000:5000 courses-app`

> L'application sert maintenant les fichiers statiques et l'API depuis le même serveur Flask. Utilisez le conteneur Docker ou Heroku/Render pour un déploiement simple.

## Utilisation locale
- Ouvrir `index.html` dans un navigateur moderne.

## Fonctionnalités
- Ajouter un achat (avec plusieurs produits)
- Historique triable/recherchable
- Total des dépenses (sur période)
- Top produits
- Export / import JSON

---

Si vous le souhaitez, je peux :
- Préparer un dépôt Git local et faire le premier commit dans votre workspace ✅
- Ajouter un fichier `404.html` et une action GitHub pour déploiement automatique
- Ajouter support pour stockage sur un backend (Netlify Functions ou Firebase)

Dites-moi l'action souhaitée.