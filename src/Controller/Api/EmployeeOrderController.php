<?php

namespace App\Controller\Api;

use App\Repository\CustomerOrderRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

class EmployeeOrderController extends AbstractController
{
    #[Route('/api/employee/orders', methods: ['GET'])]
    public function list(CustomerOrderRepository $repo): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_EMPLOYEE');

        $orders = $repo->findBy([], ['createdAt' => 'DESC']);
        $data = [];

        foreach ($orders as $o) {
            $data[] = [
                "id" => $o->getId(),
                "status" => $o->getStatus(),
                "persons" => $o->getPersons(),
                "eventDate" => $o->getEventDate()?->format('Y-m-d'),
                "eventCity" => $o->getEventCity(),
                "eventAddress" => $o->getEventAddress(),
                "menu" => [
                    "id" => $o->getMenu()->getId(),
                    "title" => $o->getMenu()->getTitle(),
                ],
                "totalPrice" => $o->getTotalPrice(),
                "createdAt" => $o->getCreatedAt()->format('Y-m-d H:i'),
                "customerEmail" => $o->getUser()->getEmail(),
            ];
        }

        return $this->json($data);
    }

    #[Route('/api/employee/orders/{id}/status', methods: ['PATCH'])]
    public function updateStatus(
        int $id,
        Request $request,
        CustomerOrderRepository $repo,
        EntityManagerInterface $em
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_EMPLOYEE');

        $order = $repo->find($id);
        if (!$order) {
            return $this->json(["error" => "Order not found"], 404);
        }

        $payload = json_decode($request->getContent(), true) ?? [];
        $newStatus = $payload["status"] ?? null;

        $allowed = ["ACCEPTED", "PREPARING", "DELIVERING", "DELIVERED", "DONE"];

        if (!is_string($newStatus) || !in_array($newStatus, $allowed, true)) {
            return $this->json([
                "error" => "Invalid status",
                "allowed" => $allowed
            ], 400);
        }

        $current = $order->getStatus();
        if (in_array($current, ["CANCELLED", "DONE"], true)) {
            return $this->json([
                "error" => "Order cannot be updated from current status",
                "current" => $current
            ], 400);
        }

        $order->setStatus($newStatus);
        $em->flush();

        return $this->json([
            "success" => true,
            "id" => $order->getId(),
            "status" => $order->getStatus(),
        ]);
    }
}
