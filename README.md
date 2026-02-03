# GDC2 — Application de gestion de courses

Application web pour enregistrer vos achats, conserver un historique et analyser les tendances (statistiques). Le projet comprend :
- **Frontend** : HTML/CSS/JS (Bootstrap + Chart.js)
- **Backend** : API Flask + SQLite (persistant, fichier `data/db.sqlite3`)
- **Déploiement** : Dockerfile, Procfile (Heroku), prêt pour Render/Railway

## Fonctionnalités
- Ajouter un achat (date, plusieurs produits avec qty & prix)
- Lister l'historique (recherche, tri)
- Total des dépenses (période configurable)
- Statistiques : produits les plus achetés, graphique des dépenses
- Import / Export JSON

## Installation locale
1. (Option virtuelle) Créez et activez un venv :
   python -m venv venv && venv\Scripts\activate
2. Installez les dépendances :
   pip install -r requirements.txt
3. Lancez le serveur :
   python backend/app.py
4. Ouvrez `http://localhost:5000`

## Déploiement rapide
- Avec Docker :
  docker build -t courses-app .
  docker run -p 5000:5000 courses-app

- Heroku :
  heroku create
  git push heroku main
  (Heroku détectera le `Procfile` et déploiera l'app)

- Render / Railway : connecter le dépôt GitHub et configurer le déploiement automatique (Docker/Procfile supporté)

## Déployer uniquement le frontend
Si vous préférez héberger uniquement le frontend statique (sans backend) :
- GitHub Pages ou Netlify sont parfaits (poussez le contenu et activez Pages ou connectez le repo à Netlify).

## Notes techniques
- Base de données : `backend/schema.sql` (SQLite)
- API endpoints :
  - `GET /api/purchases` — lister achats
  - `POST /api/purchases` — créer un achat
  - `DELETE /api/purchases/<id>` — supprimer un achat
  - `GET /api/stats/total` — total dépenses
  - `GET /api/stats/top-products` — top produits
  - `GET /api/export` & `POST /api/import` — export/import JSON

## Aide & prochaines étapes
Je peux :
- Préparer le dépôt Git local et faire le premier commit & push vers votre repo GitHub ✅
- Ajouter un workflow GitHub Actions pour build & déploiement automatique
- Configurer un déploiement sur Heroku/Render et vérifier que tout fonctionne

Dites quelle action vous voulez que je fasse ensuite (par exemple : "commit & push maintenant").
