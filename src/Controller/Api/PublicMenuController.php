<?php

namespace App\Controller\Api;

use App\Repository\MenuRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

// Ce controller gère les routes publiques d'affichage des menus, accessibles à tous les utilisateurs (connectés ou non)
class PublicMenuController extends AbstractController
{
    // --- PUBLIC MENU DISPLAY ---
    #[Route('/api/menus', name: 'api_public_menus_list', methods: ['GET'])]
    // List tous les menus actifs, avec leurs infos de base (sans description ni conditionsText) pour que les clients puissent les consulter
    public function list(Request $request, MenuRepository $repo): JsonResponse
    {
        // on récupère les paramètres de filtre envoyés dans la requête, ex: /api/menus?priceMin=20&priceMax=50&theme=italian&diet=vegan&minPersons=4 pour que les clients puissent filtrer les menus selon leurs critères
        $filters = [
            'priceMin' => $request->query->get('priceMin'),
            'priceMax' => $request->query->get('priceMax'),
            'theme' => $request->query->get('theme'),
            'diet' => $request->query->get('diet'),       // mappe vers regime
            'minPersons' => $request->query->get('minPersons'),
        ];

        // on récupère les menus actifs selon les critères de filtre, triés par date de création décroissante pour que les plus récents soient en premier
        $menus = $repo->searchPublic($filters);

        // on prépare les données à retourner, en incluant les infos de base du menu (sans description ni conditionsText) pour que les clients puissent les consulter
        $items = array_map(function ($m) {
            // on retourne les données du menu au format JSON, en incluant les infos de base du menu (sans description ni conditionsText) pour que les clients puissent les consulter, et en mappant les propriétés pour que le frontend ait des noms de champs plus clairs (ex: regime => diet, basePrice => price) pour que les clients puissent les consulter facilement
            return [
                'id' => $m->getId(),
                'title' => $m->getTitle(),
                'description' => $m->getDescription(),
                'theme' => $m->getTheme(),
                'diet' => $m->getRegime(),                 // ✅ mapping
                'price' => (float) $m->getBasePrice(),     // ✅ mapping
                'minPersons' => $m->getMinPersons(),
                'stock' => $m->getStock(),
                'conditions' => $m->getConditionsText(),
                'images' => $m->getImages(),

                // dishes/allergens : si tu n’as pas encore addSelect dans le repo, ça marchera quand même (lazy load)
                'dishes' => $m->getDishes()->map(fn($d) => [
                    'id' => $d->getId(),
                    'name' => $d->getName(),
                    'type' => $d->getType(),
                ])->toArray(),

                // les allergènes sont retournés sous forme de tableau de noms d'allergènes pour que les clients puissent les consulter facilement
                'allergens' => $m->getAllergens()->map(fn($a) => $a->getName())->toArray(),
            ];
        }, $menus);

        return $this->json(['success' => true, 'items' => $items]);
    }

    // Show les détails d'un menu actif (y compris description et conditionsText) pour que les clients puissent les consulter
    #[Route('/api/menus/{id}', name: 'api_public_menus_show', methods: ['GET'])]
    // le menu doit être actif pour être consultable, sinon on retourne une erreur 404 pour que les clients ne puissent pas consulter les menus inactifs
    public function show(int $id, MenuRepository $repo): JsonResponse
    {
        // on récupère le menu demandé, s'il n'existe pas ou s'il n'est pas actif, on retourne une erreur 404 pour que les clients ne puissent pas consulter les menus inactifs ou inexistants
        $m = $repo->find($id);

        // si les menus n'existent pas ou ne sont pas actifs, on retourne une erreur 404 pour que les clients ne puissent pas consulter les menus inactifs ou inexistants
        if (!$m || !$m->isActive()) {
            return $this->json(['success' => false, 'error' => 'Menu not found.'], 404);
        }

        // on retourne les données du menu au format JSON, en incluant les infos de base et les détails (description et conditionsText) pour que les clients puissent les consulter, et en mappant les propriétés pour que le frontend ait des noms de champs plus clairs (ex: regime => diet, basePrice => price) pour que les clients puissent les consulter facilement pour que les clients puissent les consulter facilement
        return $this->json([
            'success' => true,
            'item' => [
                'id' => $m->getId(),
                'title' => $m->getTitle(),
                'description' => $m->getDescription(),
                'theme' => $m->getTheme(),
                'diet' => $m->getRegime(),
                'price' => (float) $m->getBasePrice(),
                'minPersons' => $m->getMinPersons(),
                'stock' => $m->getStock(),
                'conditions' => $m->getConditionsText(),
                'images' => $m->getImages(),
                'dishes' => $m->getDishes()->map(fn($d) => [
                    'id' => $d->getId(),
                    'name' => $d->getName(),
                    'description' => $d->getDescription(),
                    'type' => $d->getType(),
                ])->toArray(),
                'allergens' => $m->getAllergens()->map(fn($a) => $a->getName())->toArray(),
            ],
        ]);
    }
}
