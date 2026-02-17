<?php

namespace App\Controller\Api;

use App\Entity\Menu;
use App\Repository\MenuRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

class EmployeeMenuController extends AbstractController
{
    #[Route('/api/employee/menus', methods: ['GET'])]
    public function list(MenuRepository $repo): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_EMPLOYEE');

        $menus = $repo->findBy([], ['id' => 'DESC']);

        $data = [];
        foreach ($menus as $m) {
            $data[] = [
                "id" => $m->getId(),
                "title" => $m->getTitle(),
                "theme" => $m->getTheme(),
                "regime" => $m->getRegime(),
                "minPersons" => $m->getMinPersons(),
                "basePrice" => (float) $m->getBasePrice(),
                "stock" => $m->getStock(),
                "isActive" => $m->isActive(),
            ];
        }

        return $this->json($data);
    }

    #[Route('/api/employee/menus', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_EMPLOYEE');

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(["success" => false, "error" => "Invalid JSON"], 400);
        }

        $title = trim((string) ($payload['title'] ?? ''));
        if ($title === '') {
            return $this->json(["success" => false, "error" => "title is required"], 400);
        }

        $menu = new Menu();
        $menu->setTitle($title);
        $menu->setDescription((string) ($payload['description'] ?? ''));
        $menu->setTheme((string) ($payload['theme'] ?? 'Classique'));
        $menu->setRegime((string) ($payload['regime'] ?? 'Classique'));
        $menu->setMinPersons((int) ($payload['minPersons'] ?? 1));
        $menu->setBasePrice((string) ($payload['basePrice'] ?? '0')); // decimal -> string OK
        $menu->setConditionsText((string) ($payload['conditionsText'] ?? ''));
        $menu->setStock((int) ($payload['stock'] ?? 0));
        $menu->setIsActive((bool) ($payload['isActive'] ?? true));

        $em->persist($menu);
        $em->flush();

        return $this->json([
            "success" => true,
            "id" => $menu->getId(),
        ], 201);
    }

    #[Route('/api/employee/menus/{id<\d+>}', methods: ['PATCH'])]
    public function update(
        int $id,
        Request $request,
        MenuRepository $repo,
        EntityManagerInterface $em
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_EMPLOYEE');

        $menu = $repo->find($id);
        if (!$menu) {
            return $this->json(["success" => false, "error" => "Menu not found"], 404);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(["success" => false, "error" => "Invalid JSON"], 400);
        }

        if (array_key_exists('title', $payload)) {
            $menu->setTitle(trim((string) $payload['title']));
        }
        if (array_key_exists('description', $payload)) {
            $menu->setDescription((string) $payload['description']);
        }
        if (array_key_exists('theme', $payload)) {
            $menu->setTheme((string) $payload['theme']);
        }
        if (array_key_exists('regime', $payload)) {
            $menu->setRegime((string) $payload['regime']);
        }
        if (array_key_exists('minPersons', $payload)) {
            $menu->setMinPersons((int) $payload['minPersons']);
        }
        if (array_key_exists('basePrice', $payload)) {
            $menu->setBasePrice((string) $payload['basePrice']);
        }
        if (array_key_exists('conditionsText', $payload)) {
            $menu->setConditionsText((string) $payload['conditionsText']);
        }
        if (array_key_exists('stock', $payload)) {
            $menu->setStock((int) $payload['stock']);
        }
        if (array_key_exists('isActive', $payload)) {
            $menu->setIsActive((bool) $payload['isActive']);
        }

        $em->flush();

        return $this->json(["success" => true]);
    }

    #[Route('/api/employee/menus/{id<\d+>}/toggle', methods: ['PATCH'])]
    public function toggle(
        int $id,
        MenuRepository $repo,
        EntityManagerInterface $em
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_EMPLOYEE');

        $menu = $repo->find($id);
        if (!$menu) {
            return $this->json(["success" => false, "error" => "Menu not found"], 404);
        }

        $menu->setIsActive(!$menu->isActive());
        $em->flush();

        return $this->json([
            "success" => true,
            "id" => $menu->getId(),
            "isActive" => $menu->isActive(),
        ]);
    }

    #[Route('/api/employee/menus/{id<\d+>}/stock', methods: ['PATCH'])]
    public function updateStock(
        int $id,
        Request $request,
        MenuRepository $repo,
        EntityManagerInterface $em
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_EMPLOYEE');

        $menu = $repo->find($id);
        if (!$menu) {
            return $this->json(["success" => false, "error" => "Menu not found"], 404);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(["success" => false, "error" => "Invalid JSON"], 400);
        }

        $stock = $payload['stock'] ?? null;
        if (!is_numeric($stock)) {
            return $this->json(["success" => false, "error" => "stock must be a number"], 400);
        }

        $menu->setStock((int) $stock);
        $em->flush();

        return $this->json(["success" => true, "stock" => $menu->getStock()]);
    }
}
