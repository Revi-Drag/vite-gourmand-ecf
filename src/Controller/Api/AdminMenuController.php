<?php

namespace App\Controller\Api;

use App\Repository\MenuRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;

class AdminMenuController extends AbstractController
{
    #[Route('/api/admin/menus', name: 'api_admin_menus_list', methods: ['GET'])]
    public function list(MenuRepository $menuRepository): JsonResponse
    {
        $menus = $menuRepository->findBy([], ['id' => 'DESC']); // admin voit tout (actifs + inactifs)

        $items = array_map(static fn($menu) => [
            'id' => $menu->getId(),
            'title' => $menu->getTitle(),
            'theme' => $menu->getTheme(),
            'regime' => $menu->getRegime(),
            'minPersons' => $menu->getMinPersons(),
            'basePrice' => (float) $menu->getBasePrice(),
            'stock' => $menu->getStock(),
            'isActive' => $menu->isActive(),
        ], $menus);

        return $this->json(['success' => true, 'items' => $items]);
    }

    #[Route('/api/admin/menus/{id<\d+>}', name: 'api_admin_menus_show', methods: ['GET'])]
    public function show(int $id, MenuRepository $menuRepository): JsonResponse
    {
        $menu = $menuRepository->find($id);
        if (!$menu) {
            throw new NotFoundHttpException('Menu not found');
        }

        return $this->json([
            'success' => true,
            'item' => [
                'id' => $menu->getId(),
                'title' => $menu->getTitle(),
                'description' => $menu->getDescription(),
                'theme' => $menu->getTheme(),
                'regime' => $menu->getRegime(),
                'minPersons' => $menu->getMinPersons(),
                'basePrice' => (float) $menu->getBasePrice(),
                'conditionsText' => $menu->getConditionsText(),
                'stock' => $menu->getStock(),
                'isActive' => $menu->isActive(),
            ],
        ]);
    }
}
