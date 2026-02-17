<?php

namespace App\Controller;

use App\Entity\Menu;
use App\Repository\MenuRepository;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

class ApiMenuController extends AbstractController
{
    #[Route('/api/menus', name: 'api_menus_list', methods: ['GET'])]
    public function list(MenuRepository $menuRepository): JsonResponse
    {
        $menus = $menuRepository->findBy(['isActive' => true], ['id' => 'DESC']);

        $data = array_map(static fn($menu) => [
            'id' => $menu->getId(),
            'title' => $menu->getTitle(),
            'description' => $menu->getDescription(),
            'theme' => $menu->getTheme(),
            'regime' => $menu->getRegime(),
            'minPersons' => $menu->getMinPersons(),
            'basePrice' => (float) $menu->getBasePrice(),
            'stock' => $menu->getStock(),
        ], $menus);

        return new JsonResponse($data);
    }

    #[Route('/api/menus/{id<\d+>}', name: 'api_menus_show', methods: ['GET'])]
    public function show(int $id, MenuRepository $menuRepository): JsonResponse
    {
        $menu = $menuRepository->find($id);
        if (!$menu || !$menu->isActive()) {
            throw new NotFoundHttpException('Menu not found');
        }

        return new JsonResponse([
            'id' => $menu->getId(),
            'title' => $menu->getTitle(),
            'description' => $menu->getDescription(),
            'theme' => $menu->getTheme(),
            'regime' => $menu->getRegime(),
            'minPersons' => $menu->getMinPersons(),
            'basePrice' => (float) $menu->getBasePrice(),
            'conditionsText' => $menu->getConditionsText(),
            'stock' => $menu->getStock(),
        ]);
    }

}
