# Vite & Gourmand — Projet ECF Développeur Web & Web Mobile

Vite & Gourmand est une application web de gestion pour un service traiteur situé à Bordeaux, développée dans le cadre de l’ECF.
Elle permet aux clients de consulter des menus, passer des commandes en ligne et laisser des avis.
Elle permet également aux employés et administrateurs de gérer les commandes et les menus.

---

## Fonctionnalités principales

- Authentification via API (`/api/login`)
  - Inscription (/api/register)
  - Connexion (/api/login)
  - Deconnexion
  - Mot de passe oublié / réinitialisation
  - Route /api/me (utilisateur connecté)
- Gestion des menus:
  - Consultation des menus
  - Filtres (thème, régime, prix, nombre de personnes)
  - Détail d’un menu
  - Création / modification / suppression (ADMIN)
- Gestion des commandes:
  - Création de commande
  - Calcul automatique des frais de livraison
  - Validation par un employé
  - Historique client
  - Contrôle des permissions:
- Gestion des avis
  - Création d’avis client
  - Modération par employé
  - Affichage des avis validés uniquement
- Contact
  - Formulaire de contact via API
  - Validation backend
---

## Technologies utilisées

### Backend

- PHP 8.4
- Symfony 7
- Doctrine ORM
- API REST JSON
- MySQL

### Frontend

- HTML / CSS moderne
- JavaScript Vanilla (Fetch API)
- Interface disponible dans `public/app`

### Infrastructure

- Docker
- Nginx + PHP-FPM
- Railway (déploiement cloud)
- Variables d’environnement sécurisées
- Configuration dynamique du port

### Outils

- Postman (tests API)
- GitHub (versioning)
- GitHub Projects (gestion des étapes)
- Render (déploiement Docker)

---

## Liens du projet (ECF)

- Dépôt GitHub :  
  https://github.com/Revi-Drag/vite-gourmand-ecf

- Tableau de gestion de projet :  
  https://github.com/users/Revi-Drag/projects/1/views/1

- Déploiement Railway :  
  https://vite-gourmand-ecf-production.up.railway.app/app/login.html

---

## Compte administrateur (ECF)

Identifiants demandés dans le dossier de rendu :

- Email : **admin@vitegourmand.fr**
- Mot de passe : **Admin-123!**
- Rôle : **ROLE_ADMIN**

---

## Installation du projet (local)

### 1. Cloner le dépôt
```bash
git clone https://github.com/Revi-Drag/vite-gourmand-ecf.git
cd vite-gourmand-ecf

```
### Lancer Docker
```bash
docker compose up -d --build

```

### 2. Installer les dépendances
```bash
composer install

```
### 3. Configurer la base de données (local)
Créer un fichier `.env.local` à la racine du projet :
```env 
DATABASE_URL="mysql://root:password@127.0.0.1:3306/vite_gourmand"
```

### 4. Créer la base et exécuter les migrations
```bash
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
```

### 5. Charger les fixtures (local uniquement)
```bash
php bin/console doctrine:fixtures:load
```
---

## Comptes de test (local)

### Administrateur
Email : **admin@lifesync.local**
Mot de passe : **Admin-123!**
Rôle : **ROLE_ADMIN**

---

## Lancer le serveur Symfony
```bash
symfony serve
```

## Application disponible sur :

- API : http://127.0.0.1:8000/api

- Front : http://127.0.0.1:8000/app/login.html

### Routes API principales

|Méthode	|  Route	       |      Description               | 
|---------|----------------|--------------------------------|
|POST	    |  /api/login	   |  Connexion                     |
|GET 	    |   /api/me	     |  Infos utilisateur connecté    |
|GET	    |  /api/me/stats |    Statistiques utilisateur    |
|GET	    |  /api/tasks	   |    Liste des tâches            | 
|POST	    |/api/tasks	     |  Créer une tâche               |
|PATCH    |	/api/tasks/{id}|	   Modifier statut ou contenu |
|DELETE  	|/api/tasks/{id} |   Supprimer une tâche          |

---

## Sécurité
- Authentification via session Symfony (cookie PHPSESSID)
- Cookies sécurisés :
  - HttpOnly
  - SameSite=Lax

- Protection des routes API via firewall Symfony
- Validation backend des champs :
  - titre obligatoire
  - difficulté entre 1 et 5
  - statut contrôlé

- Contrôle des permissions :
  - suppression limitée au créateur
  - administrateur autorisé sur toutes les tâches

---

## Déploiement en production (Render)
Le projet est déployé via Docker sur Render :

https://lifesync-ecf.onrender.com

Base de données en production :

 - PostgreSQL (Render)
 - configurée via la variable DATABASE_URL

## Création des comptes en production (Seed)
En production, les comptes ne sont pas chargés par fixtures.
Cette route est utilisée uniquement dans le cadre de l'ECF pour initialiser les comptes en production.
Ils sont créés via une route de seed protégée :
```bash
POST /admin/_seed_user
```
Cette route nécessite un header obligatoire :
```bash
X-SEED-TOKEN: <token_secret>
```
Les identifiants sont définis via variables Render :
 - ADMIN_EMAIL
 - ADMIN_PASSWORD
 - USER_EMAIL
 - USER_PASSWORD
 - SEED_TOKEN

### Commande PowerShell utilisée :
```powershell
Invoke-WebRequest -UseBasicParsing `
  -Uri "https://lifesync-ecf.onrender.com/admin/_seed_user" `
  -Method Post `
  -Headers @{ "X-SEED-TOKEN" = "VOTRE_TOKEN" }
```


Projet réalisé par Guillaume VALSEMEY

ECF Développeur Web & Web Mobile