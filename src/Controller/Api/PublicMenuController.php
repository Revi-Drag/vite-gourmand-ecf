<?php

namespace App\Controller\Api;

use App\Repository\MenuRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class PublicMenuController extends AbstractController
{
    #[Route('/api/menus', name: 'api_public_menus_list', methods: ['GET'])]
    public function list(Request $request, MenuRepository $repo): JsonResponse
    {
        $filters = [
            'priceMin' => $request->query->get('priceMin'),
            'priceMax' => $request->query->get('priceMax'),
            'theme' => $request->query->get('theme'),
            'diet' => $request->query->get('diet'),       // mappe vers regime
            'minPersons' => $request->query->get('minPersons'),
        ];

        $menus = $repo->searchPublic($filters);

        $items = array_map(function ($m) {
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

                'allergens' => $m->getAllergens()->map(fn($a) => $a->getName())->toArray(),
            ];
        }, $menus);

        return $this->json(['success' => true, 'items' => $items]);
    }

    #[Route('/api/menus/{id}', name: 'api_public_menus_show', methods: ['GET'])]
    public function show(int $id, MenuRepository $repo): JsonResponse
    {
        $m = $repo->find($id);

        if (!$m || !$m->isActive()) {
            return $this->json(['success' => false, 'error' => 'Menu not found.'], 404);
        }

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
