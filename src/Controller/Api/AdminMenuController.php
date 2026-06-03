<?php

namespace App\Controller\Api;

use App\Entity\Dish;
use App\Entity\Menu;
use App\Repository\MenuRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;

class AdminMenuController extends AbstractController
{
    #[Route('/api/admin/menus', name: 'api_admin_menus_list', methods: ['GET'])]
    public function list(MenuRepository $menuRepository): JsonResponse
    {
        /** @var \App\Entity\User|null $user */
        $user = $this->getUser();

        if (!$user || !$user->isActive()) {
            return $this->json([
                'success' => false,
                'error' => 'Account disabled.',
            ], 403);
        }

        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $menus = $menuRepository->findBy([], ['id' => 'DESC']);

        $items = array_map(static function ($menu) {
            $starter = null;
            $main = null;
            $dessert = null;

            foreach ($menu->getDishes() as $dish) {
                if ($dish->getType() === Dish::TYPE_STARTER) {
                    $starter = $dish->getName();
                }

                if ($dish->getType() === Dish::TYPE_MAIN) {
                    $main = $dish->getName();
                }

                if ($dish->getType() === Dish::TYPE_DESSERT) {
                    $dessert = $dish->getName();
                }


            }

            return [
                'id' => $menu->getId(),
                'title' => $menu->getTitle(),
                'description' => $menu->getDescription(),
                'theme' => $menu->getTheme(),
                'regime' => $menu->getRegime(),
                'starter' => $starter,
                'main' => $main,
                'dessert' => $dessert,
                'minPersons' => $menu->getMinPersons(),
                'basePrice' => (float) $menu->getBasePrice(),
                'conditionsText' => $menu->getConditionsText(),
                'stock' => $menu->getStock(),
                'isActive' => $menu->isActive(),
            ];
        }, $menus);

        return $this->json([
            'success' => true,
            'items' => $items,
        ]);
    }

    #[Route('/api/admin/menus/{id<\d+>}', name: 'api_admin_menus_show', methods: ['GET'])]
    public function show(int $id, MenuRepository $menuRepository): JsonResponse
    {
        /** @var \App\Entity\User|null $user */
        $user = $this->getUser();

        if (!$user || !$user->isActive()) {
            return $this->json([
                'success' => false,
                'error' => 'Account disabled.',
            ], 403);
        }

        $this->denyAccessUnlessGranted('ROLE_ADMIN');

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
                'dishes' => $menu->getDishes()->map(fn($d) => [
                    'id' => $d->getId(),
                    'description' => $d->getDescription(),
                    'name' => $d->getName(),
                    'type' => $d->getType(),
                ])->toArray(),
            ],

        ]);
    }

    #[Route('/api/admin/menus', name: 'api_admin_menus_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        /** @var \App\Entity\User|null $user */
        $user = $this->getUser();

        if (!$user || !$user->isActive()) {
            return $this->json([
                'success' => false,
                'error' => 'Account disabled.',
            ], 403);
        }

        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $payload = json_decode($request->getContent() ?: '[]', true) ?: [];

        $title = trim((string) ($payload['title'] ?? ''));
        if ($title === '') {
            return $this->json([
                'success' => false,
                'error' => 'Le titre est obligatoire.',
            ], 400);
        }

        $menu = new Menu();
        $menu->setTitle($title);
        $menu->setDescription((string) ($payload['description'] ?? ''));
        $menu->setTheme((string) ($payload['theme'] ?? ''));
        $menu->setRegime((string) ($payload['regime'] ?? ''));
        $menu->setMinPersons((int) ($payload['minPersons'] ?? 1));
        $menu->setBasePrice((string) ($payload['basePrice'] ?? 0));
        $menu->setConditionsText(
            array_key_exists('conditionsText', $payload) && $payload['conditionsText'] !== null
            ? (string) $payload['conditionsText']
            : null
        );
        $menu->setStock((int) ($payload['stock'] ?? 0));
        $menu->setIsActive((bool) ($payload['isActive'] ?? true));

        if (array_key_exists('images', $payload) && is_array($payload['images'])) {
            $menu->setImages($payload['images']);
        }

        $em->persist($menu);
        //$em->flush();

        //Récupération des plats envoyés par le front
        $starter = trim((string) ($payload['starter'] ?? ''));
        $main = trim((string) ($payload['main'] ?? ''));
        $dessert = trim((string) ($payload['dessert'] ?? ''));

        //Entrée
        if ($starter !== '') {
            $dish = new Dish();
            $dish->setName($starter);
            $dish->setType(Dish::TYPE_STARTER);
            $em->persist($dish);
            $menu->addDish($dish);
        }

        //Plat
        if ($main !== '') {
            $dish = new Dish();
            $dish->setName($main);
            $dish->setType(Dish::TYPE_MAIN);
            $em->persist($dish);
            $menu->addDish($dish);
        }

        //Dessert
        if ($dessert !== '') {
            $dish = new Dish();
            $dish->setName($dessert);
            $dish->setType(Dish::TYPE_DESSERT);
            $em->persist($dish);
            $menu->addDish($dish);
        }

        //Allergènes
        $allergens = $payload['allergens'] ?? [];

        if (is_array($allergens)) {
            $seen = [];


            foreach ($allergens as $allergenName) {
                $allergenName = trim((string) $allergenName);

                if ($allergenName === '') {
                    continue;
                }
                // Éviter les doublons
                $normalized = mb_strtolower($allergenName);
                if (isset($seen[$normalized])) {
                    continue;
                }
                $seen[$normalized] = true;

                $allergen = $em->getRepository(\App\Entity\Allergen::class)
                    ->findOneBy(['name' => $allergenName]);

                //si non trouvé exactement, on cherche en ignorant la casse
                if (!$allergen) {
                    $allergen = $em->getRepository(\App\Entity\Allergen::class)
                        ->createQueryBuilder('a')
                        ->where('LOWER(a.name) = LOWER(:name)')
                        ->setParameter('name', $allergenName)
                        ->getQuery()
                        ->getOneOrNullResult();
                }

                // si toujours absent, on le crée
                if (!$allergen) {
                    $allergen = new \App\Entity\Allergen();
                    $allergen->setName($allergenName);
                    $em->persist($allergen);
                }

                $menu->addAllergen($allergen);
            }
        }

        $em->flush();

        return $this->json([
            'success' => true,
            'item' => [
                'id' => $menu->getId(),
                'title' => $menu->getTitle(),
                'description' => $menu->getDescription(),
                'theme' => $menu->getTheme(),
                'regime' => $menu->getRegime(),
                'starter' => $starter,
                'main' => $main,
                'dessert' => $dessert,
                'minPersons' => $menu->getMinPersons(),
                'basePrice' => (float) $menu->getBasePrice(),
                'conditionsText' => $menu->getConditionsText(),
                'stock' => $menu->getStock(),
                'isActive' => $menu->isActive(),
            ],
        ], 201);
    }

    #[Route('/api/admin/menus/{id<\d+>}', name: 'api_admin_menus_update', methods: ['PATCH'])]
    public function update(
        int $id,
        Request $request,
        MenuRepository $menuRepository,
        EntityManagerInterface $em
    ): JsonResponse {
        /** @var \App\Entity\User|null $user */
        $user = $this->getUser();

        if (!$user || !$user->isActive()) {
            return $this->json([
                'success' => false,
                'error' => 'Account disabled.',
            ], 403);
        }

        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $menu = $menuRepository->find($id);
        if (!$menu) {
            throw new NotFoundHttpException('Menu not found');
        }

        $payload = json_decode($request->getContent() ?: '[]', true) ?: [];

        if (array_key_exists('title', $payload)) {
            $menu->setTitle((string) $payload['title']);
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
            $menu->setConditionsText($payload['conditionsText'] !== null ? (string) $payload['conditionsText'] : null);
        }

        if (array_key_exists('stock', $payload)) {
            $menu->setStock((int) $payload['stock']);
        }

        if (array_key_exists('isActive', $payload)) {
            $menu->setIsActive((bool) $payload['isActive']);
        }

        if (array_key_exists('images', $payload) && is_array($payload['images'])) {
            $menu->setImages($payload['images']);
        }

        $em->flush();

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
            ]
        ]);
    }

    #[Route('/api/admin/menus/{id<\d+>}', name: 'api_admin_menus_delete', methods: ['DELETE'])]
    public function delete(
        int $id,
        MenuRepository $menuRepository,
        EntityManagerInterface $em
    ): JsonResponse {
        /** @var \App\Entity\User|null $user */
        $user = $this->getUser();

        if (!$user || !$user->isActive()) {
            return $this->json([
                'success' => false,
                'error' => 'Account disabled.',
            ], 403);
        }

        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $menu = $menuRepository->find($id);
        if (!$menu) {
            throw new NotFoundHttpException('Menu not found');
        }

        $em->remove($menu);
        $em->flush();

        return $this->json([
            'success' => true,
            'id' => $id,
        ]);
    }
}