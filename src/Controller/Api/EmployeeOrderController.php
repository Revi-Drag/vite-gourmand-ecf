<?php

namespace App\Controller\Api;

use App\Repository\CustomerOrderRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class EmployeeOrderController extends AbstractController
{
    // --- EMPLOYEE ORDER MANAGEMENT ---
    #[Route('/api/employee/orders', methods: ['GET'])]

    // List tous les orders, avec les infos clients (email) et menu (title) pour que les employés puissent les traiter
    public function list(CustomerOrderRepository $repo): JsonResponse
    {
        // on vérifie que l'utilisateur est bien un employé ou un admin, et qu'il est actif
        /** @var \App\Entity\User $user */
        $user = $this->getUser();
        // si l'utilisateur n'est pas actif, on lui refuse l'accès
        if (!$user || !$user->isActive()) {
            return $this->json(['success' => false, 'error' => 'Account disabled.'], 403);
        }

        // seuls les employés et admins peuvent accéder à cette route
        if (
            !$this->isGranted('ROLE_EMPLOYEE')
            && !$this->isGranted('ROLE_ADMIN')
        ) {
            // si l'utilisateur n'est pas employé ni admin, on lui refuse l'accès
            throw $this->createAccessDeniedException('Access denied.');
        }
        // on récupère tous les orders, triés par date de création décroissante pour que les plus récents soient en premier
        $orders = $repo->findBy([], ['createdAt' => 'DESC']);
        $data = [];

        // pour chaque order, on prépare les données à retourner, en incluant les infos du client (email) et du menu (title)
        foreach ($orders as $o) {
            $data[] = [
                'id' => $o->getId(),
                'status' => $o->getStatus(),
                'persons' => $o->getPersons(),
                'eventDate' => $o->getEventDate()?->format('Y-m-d'),
                'eventCity' => $o->getEventCity(),
                'eventAddress' => $o->getEventAddress(),
                'menu' => [
                    'id' => $o->getMenu()->getId(),
                    'title' => $o->getMenu()->getTitle(),
                ],
                'totalPrice' => $o->getTotalPrice(),
                'createdAt' => $o->getCreatedAt()->format('Y-m-d H:i'),
                'customerEmail' => $o->getUser()->getEmail(),
            ];
        }

        return $this->json($data);
    }

    // Update le status d'un order (ex: ACCEPTED, PREPARING, DELIVERING, DELIVERED, DONE)
    #[Route('/api/employee/orders/{id}/status', methods: ['PATCH'])]
    // le status doit être envoyé dans le body de la requête au format JSON, ex: { "status": "ACCEPTED" }
    public function updateStatus(
        int $id,
        Request $request,
        CustomerOrderRepository $repo,
        EntityManagerInterface $em
    ): JsonResponse {

        // on vérifie que l'utilisateur est bien un employé ou un admin, et qu'il est actif
        /** @var \App\Entity\User $user */
        $user = $this->getUser();
        // si l'utilisateur n'est pas actif, on lui refuse l'accès
        if (!$user || !$user->isActive()) {
            return $this->json(['success' => false, 'error' => 'Account disabled.'], 403);
        }

        // seuls les employés et admins peuvent accéder à cette route
        if (
            !$this->isGranted('ROLE_EMPLOYEE')
            && !$this->isGranted('ROLE_ADMIN')
        ) {

            // si l'utilisateur n'est pas employé ni admin, on lui refuse l'accès
            throw $this->createAccessDeniedException('Access denied.');
        }

        // on récupère l'order à mettre à jour
        $order = $repo->find($id);
        // si l'order n'existe pas, on retourne une erreur 404
        if (!$order) {
            return $this->json(["error" => "Order not found"], 404);
        }

        // on récupère le nouveau status depuis le body de la requête
        $payload = json_decode($request->getContent(), true) ?? [];
        // on vérifie que le body contient bien une clé "status"
        $newStatus = $payload["status"] ?? null;

        // on vérifie que le nouveau status est valide (doit être dans la liste des status autorisés)
        $allowed = ["ACCEPTED", "PREPARING", "DELIVERING", "DELIVERED", "DONE"];

        // si le nouveau status n'est pas valide, on retourne une erreur 400
        if (!is_string($newStatus) || !in_array($newStatus, $allowed, true)) {
            return $this->json([
                "error" => "Invalid status",
                "allowed" => $allowed
            ], 400);
        }

        // on vérifie que le changement de status est autorisé (ex: on ne peut pas passer de PENDING à DELIVERING directement, il faut d'abord passer par ACCEPTED et PREPARING)
        $current = $order->getStatus();
        // si l'order est déjà dans un status final (CANCELLED ou DONE), on n'autorise aucun changement de status
        if (in_array($current, ["CANCELLED", "DONE"], true)) {
            return $this->json([
                "error" => "Order cannot be updated from current status",
                "current" => $current
            ], 400);
        }

        // règles de transition de status
        $order->setStatus($newStatus);
        $em->flush();

        // on retourne les infos de l'order mis à jour
        return $this->json([
            "success" => true,
            "id" => $order->getId(),
            "status" => $order->getStatus(),
        ]);
    }

    // Cancel un order (status = CANCELLED)
    #[Route('/api/employee/orders/{id}/cancel', methods: ['PATCH'])]
    public function cancel(
        int $id,
        Request $request,
        CustomerOrderRepository $repo,
        EntityManagerInterface $em
    ): JsonResponse {
        // on vérifie que l'utilisateur est bien un employé ou un admin, et qu'il est actif
        /** @var \App\Entity\User|null $user */
        $user = $this->getUser();

        // si l'utilisateur n'est pas actif, on lui refuse l'accès
        if (!$user || !$user->isActive()) {
            return $this->json(['success' => false, 'error' => 'Account disabled.'], 403);
        }

        // seuls les employés et admins peuvent accéder à cette route
        if (
            !$this->isGranted('ROLE_EMPLOYEE')
            && !$this->isGranted('ROLE_ADMIN')
        ) {
            // si l'utilisateur n'est pas employé ni admin, on lui refuse l'accès
            throw $this->createAccessDeniedException('Access denied.');
        }

        // on récupère l'order à annuler
        $order = $repo->find($id);
        // si l'order n'existe pas, on retourne une erreur 404
        if (!$order) {
            return $this->json(['error' => 'Order not found'], 404);
        }

        // on vérifie que l'order n'est pas déjà dans un status final (CANCELLED ou DONE), car dans ce cas on n'autorise pas l'annulation
        $current = $order->getStatus();
        // si l'order est déjà dans un status final, on retourne une erreur 400
        if (in_array($current, ['CANCELLED', 'DONE'], true)) {
            return $this->json([
                'error' => 'Order cannot be cancelled from current status',
                'current' => $current,
            ], 400);
        }

        // on récupère le mode de contact et la raison d'annulation depuis le body de la requête
        $payload = json_decode($request->getContent(), true) ?? [];
        // le mode de contact doit être soit "GSM" soit "MAIL", et la raison d'annulation ne doit pas être vide
        $contactMode = $payload['contactMode'] ?? null;
        // on nettoie la raison d'annulation en supprimant les espaces inutiles et en s'assurant que c'est une chaîne de caractères
        $reason = trim((string) ($payload['reason'] ?? ''));

        // on vérifie que le mode de contact est valide (doit être dans la liste des modes de contact autorisés)
        $allowedContactModes = ['GSM', 'MAIL'];

        // si le mode de contact n'est pas valide, on retourne une erreur 400
        if (!is_string($contactMode) || !in_array($contactMode, $allowedContactModes, true)) {
            return $this->json([
                'error' => 'Invalid contact mode',
                'allowed' => $allowedContactModes,
            ], 400);
        }

        // si la raison d'annulation est vide, on retourne une erreur 400
        if ($reason === '') {
            return $this->json([
                'error' => 'Cancellation reason is required',
            ], 400);
        }

        // si toutes les validations sont passées, on peut annuler l'order en mettant à jour son status à "CANCELLED", et en enregistrant le mode de contact et la raison d'annulation si tu as ajouté ces champs dans l'entité CustomerOrder
        $order->setStatus('CANCELLED');

        // À décommenter plus tard si tu ajoutes les champs dans CustomerOrder
        // $order->setCancellationContactMode($contactMode);
        // $order->setCancellationReason($reason);

        // on enregistre les changements en base de données
        $em->flush();

        // on retourne les infos de l'order annulé, en incluant le mode de contact et la raison d'annulation pour que l'employé puisse les voir dans l'interface et suivre les annulations de manière efficace     
        return $this->json([
            'success' => true,
            'id' => $order->getId(),
            'status' => $order->getStatus(),
            'contactMode' => $contactMode,
            'reason' => $reason,
        ]);
    }
}
