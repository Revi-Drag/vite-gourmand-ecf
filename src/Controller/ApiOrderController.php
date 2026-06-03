<?php

namespace App\Controller;

use App\Entity\CustomerOrder;
use App\Entity\User;
use App\Repository\CustomerOrderRepository;
use App\Repository\MenuRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use App\Entity\OrderStatusEvent;
use App\Repository\OrderStatusEventRepository;

class ApiOrderController extends AbstractController
{
    #[Route('/api/orders', name: 'api_orders_create', methods: ['POST'])]
    public function create(
        Request $request,
        MenuRepository $menuRepository,
        EntityManagerInterface $em
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return new JsonResponse(['success' => false, 'error' => 'Not authenticated'], 401);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return new JsonResponse(['success' => false, 'error' => 'Invalid JSON'], 400);
        }

        $menuId = (int) ($data['menuId'] ?? 0);
        $persons = (int) ($data['persons'] ?? 0);
        $eventAddress = trim((string) ($data['eventAddress'] ?? ''));
        $eventCity = trim((string) ($data['eventCity'] ?? ''));
        $eventDateStr = (string) ($data['eventDate'] ?? '');
        $eventPhone = trim((string) ($data['eventPhone'] ?? ''));
        $distanceKm = isset($data['distanceKm']) ? (float) $data['distanceKm'] : 0.0;

        if ($menuId <= 0 || $persons <= 0 || $eventAddress === '' || $eventCity === '' || $eventDateStr === '' || $eventPhone === '') {
            return new JsonResponse(['success' => false, 'error' => 'Missing fields'], 400);
        }

        $menu = $menuRepository->find($menuId);
        if (!$menu || !$menu->isActive()) {
            return new JsonResponse(['success' => false, 'error' => 'Menu not found'], 404);
        }

        if ($persons < $menu->getMinPersons()) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Persons must be >= menu minPersons',
                'minPersons' => $menu->getMinPersons(),
            ], 400);
        }

        if ($menu->getStock() <= 0) {
            return new JsonResponse(['success' => false, 'error' => 'Menu out of stock'], 400);
        }

        try {
            $eventDate = new \DateTime($eventDateStr);
        } catch (\Throwable) {
            return new JsonResponse(['success' => false, 'error' => 'Invalid date'], 400);
        }

        // Pricing
        $basePrice = (float) $menu->getBasePrice(); // for minPersons
        $minPersons = (int) $menu->getMinPersons();
        $unitPrice = $basePrice / max($minPersons, 1);
        $menuPrice = $unitPrice * $persons;

        $discountApplied = false;
        if ($persons >= ($minPersons + 5)) {
            $menuPrice *= 0.90;
            $discountApplied = true;
        }

        $isBordeaux = mb_strtolower($eventCity) === 'bordeaux';
        $deliveryPrice = 0.0;

        if (!$isBordeaux) {
            if ($distanceKm < 0) {
                return new JsonResponse(['success' => false, 'error' => 'distanceKm must be >= 0'], 400);
            }
            $deliveryPrice = 5.00 + (0.59 * $distanceKm);
        }

        $totalPrice = $menuPrice + $deliveryPrice;

        $order = new CustomerOrder();
        $order->setUser($user);
        $order->setMenu($menu);
        $order->setEventAddress($eventAddress);
        $order->setEventCity($eventCity);
        $order->setEventDate($eventDate);
        $order->setEventPhone($eventPhone);
        $order->setPersons($persons);
        $order->setMenuPrice(number_format($menuPrice, 2, '.', ''));
        $order->setDeliveryPrice(number_format($deliveryPrice, 2, '.', ''));
        $order->setTotalPrice(number_format($totalPrice, 2, '.', ''));
        $order->setStatus('PENDING');
        $order->setCreatedAt(new \DateTimeImmutable());

        // Decrement stock
        $menu->setStock($menu->getStock() - 1);

        $em->persist($order);

        // Timeline event: PENDING
        $ev = new OrderStatusEvent();
        $ev->setCustomerOrder($order);
        $ev->setStatus('PENDING');
        $ev->setChangedAt($order->getCreatedAt());
        $ev->setChangedBy($user->getEmail());
        $em->persist($ev);

        $em->flush();

        return new JsonResponse([
            'success' => true,
            'order' => [
                'id' => $order->getId(),
                'status' => $order->getStatus(),
                'menuId' => $menu->getId(),
                'persons' => $order->getPersons(),
                'menuPrice' => (float) $order->getMenuPrice(),
                'deliveryPrice' => (float) $order->getDeliveryPrice(),
                'totalPrice' => (float) $order->getTotalPrice(),
                'discountApplied' => $discountApplied,
            ],
        ], 201);
    }

    #[Route('/api/orders/mine', name: 'api_orders_mine', methods: ['GET'])]
    public function mine(CustomerOrderRepository $repo, OrderStatusEventRepository $evRepo): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return new JsonResponse(['success' => false, 'error' => 'Not authenticated'], 401);
        }

        $orders = $repo->findBy(['user' => $user], ['id' => 'DESC']);

        $out = [];
        foreach ($orders as $o) {

            // Timeline events (suivi commande)
            $events = $evRepo->findBy(['customerOrder' => $o], ['changedAt' => 'ASC']);
            $history = [];

            foreach ($events as $e) {
                $history[] = [
                    'status' => $e->getStatus(),
                    'changedAt' => $e->getChangedAt()->format('Y-m-d H:i'),
                ];
            }

            $out[] = [
                'id' => $o->getId(),
                'status' => $o->getStatus(),
                'createdAt' => $o->getCreatedAt()->format('Y-m-d H:i'),
                'history' => $history,

                'persons' => $o->getPersons(),
                'eventCity' => $o->getEventCity(),
                'eventAddress' => $o->getEventAddress(),
                'eventDate' => $o->getEventDate()->format('Y-m-d H:i'),

                'menu' => [
                    'id' => $o->getMenu()->getId(),
                    'title' => $o->getMenu()->getTitle(),
                ],

                'menuPrice' => (float) $o->getMenuPrice(),
                'deliveryPrice' => (float) $o->getDeliveryPrice(),
                'totalPrice' => (float) $o->getTotalPrice(),
            ];
        }

        return new JsonResponse($out);
    }
    #[Route('/api/orders/{id}', name: 'api_orders_delete', methods: ['DELETE'])]
    public function delete(
        int $id,
        CustomerOrderRepository $repo,
        EntityManagerInterface $em
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return new JsonResponse(['success' => false, 'error' => 'Not authenticated'], 401);
        }

        $order = $repo->find($id);
        if (!$order) {
            return new JsonResponse(['success' => false, 'error' => 'Order not found'], 404);
        }

        // sécurité : seulement le propriétaire
        if ($order->getUser()->getId() !== $user->getId()) {
            return new JsonResponse(['success' => false, 'error' => 'Forbidden'], 403);
        }

        // règle métier : annulation seulement si PENDING
        if ($order->getStatus() !== 'PENDING') {
            return new JsonResponse([
                'success' => false,
                'error' => 'Only pending orders can be cancelled'
            ], 400);
        }

        // remettre le stock du menu
        $menu = $order->getMenu();
        $menu->setStock($menu->getStock() + 1);

        $em->remove($order);
        $em->flush();

        return new JsonResponse(['success' => true]);
    }


}
