<?php

namespace App\Controller\Api;

use App\Entity\Review;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

// Ce controller gère les routes d'administration des reviews, accessibles uniquement aux employés et admins
class EmployeeReviewController extends AbstractController
{
    // --- EMPLOYEE REVIEW MANAGEMENT ---
    #[Route('/api/employee/reviews', name: 'app_api_employee_reviews_list', methods: ['GET'])]
    public function list(Request $request, EntityManagerInterface $em): JsonResponse
    {
        // on vérifie que l'utilisateur est bien un employé ou un admin, et qu'il est actif
        /** @var User|null $user */
        $user = $this->getUser();
        if (!$user || !$user->isActive()) {
            return $this->json(['success' => false, 'error' => 'Account disabled.'], 403);
        }
        // seuls les employés et admins peuvent accéder à cette route
        if (
            !$this->isGranted('ROLE_EMPLOYEE')
            && !$this->isGranted('ROLE_ADMIN')
        ) {
            throw $this->createAccessDeniedException('Access denied. Employee or admin role required.');
        }

        // on récupère le paramètre de filtre "status" (PENDING, APPROVED, REJECTED), par défaut PENDING pour que les employés voient d'abord les reviews en attente de validation  
        $status = strtoupper(trim((string) $request->query->get('status', 'PENDING')));
        // si le statut n'est pas valide, on le remet à PENDING pour éviter les erreurs et pour que les employés voient d'abord les reviews en attente de validation
        if (!in_array($status, ['PENDING', 'APPROVED', 'REJECTED'], true)) {
            $status = 'PENDING';
        }

        // on récupère les reviews selon le statut demandé, triées par date de création décroissante pour que les plus récentes soient en premier
        $reviews = $em->getRepository(Review::class)->findBy(
            ['status' => $status],
            ['createdAt' => 'DESC']
        );

        // on prépare les données à retourner, en incluant les infos de base du review (rating, comment, status) et l'email de l'auteur pour que les employés puissent les gérer
        $data = [];
        foreach ($reviews as $r) {
            $data[] = [
                'id' => $r->getId(),
                'rating' => $r->getRating(),
                'comment' => $r->getComment(),
                'status' => $r->getStatus(),
                'rejectReason' => $r->getRejectReason(),
                'createdAt' => $r->getCreatedAt()->format('Y-m-d H:i'),
                'authorEmail' => $r->getUser()->getEmail(),
            ];
        }

        // on retourne les données au format JSON
        return $this->json(['success' => true, 'reviews' => $data]);
    }

    // Approve une review en changeant son statut à APPROVED et en supprimant la raison de rejet (s'il y en avait une) pour que les employés puissent valider les reviews
    #[Route('/api/employee/reviews/{id}/approve', name: 'app_api_employee_reviews_approve', methods: ['PATCH'])]
    // on vérifie que l'utilisateur est bien un employé ou un admin, et qu'il est actif
    public function approve(int $id, EntityManagerInterface $em): JsonResponse
    {
        // on vérifie que l'utilisateur est bien un employé ou un admin, et qu'il est actif
        /** @var User|null $user */
        $user = $this->getUser();
        // si l'utilisateur n'est pas actif, on lui refuse l'accès
        if (!$user || !$user->isActive()) {
            return $this->json(['success' => false, 'error' => 'Account disabled.'], 403);
        }
        // seuls les employés et admins peuvent accéder à cette route
        if (!$this->isGranted('ROLE_EMPLOYEE') && !$this->isGranted('ROLE_ADMIN')) {

            throw $this->createAccessDeniedException('Access denied. Employee or admin role required.');
        }

        // on récupère la review à approuver, si elle n'existe pas, on retourne une erreur 404
        $review = $em->getRepository(Review::class)->find($id);
        if (!$review) {
            return $this->json(['success' => false, 'error' => 'Review not found.'], 404);
        }

        // on approuve la review en changeant son statut à APPROVED et en supprimant la raison de rejet (s'il y en avait une) pour que les employés puissent valider les reviews
        $review->setStatus('APPROVED');
        $review->setRejectReason(null);
        $em->flush();

        // on retourne les données de la review approuvée au format JSON, en incluant son id et son nouveau statut pour que les employés puissent voir le résultat de leur action
        return $this->json(['success' => true, 'id' => $review->getId(), 'status' => $review->getStatus()]);
    }

    // Reject une review en changeant son statut à REJECTED et en enregistrant la raison de rejet (optionnelle) pour que les employés puissent rejeter les reviews
    #[Route('/api/employee/reviews/{id}/reject', name: 'app_api_employee_reviews_reject', methods: ['PATCH'])]
    // on vérifie que l'utilisateur est bien un employé ou un admin, et qu'il est actif, et que la raison de rejet (optionnelle) est envoyée dans le body de la requête au format JSON, ex: { "reason": "Inappropriate content" } pour que les employés puissent rejeter les reviews avec une raison
    public function reject(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        // on vérifie que l'utilisateur est bien un employé ou un admin, et qu'il est actif
        /** @var User|null $user */
        $user = $this->getUser();
        // si l'utilisateur n'est pas actif, on lui refuse l'accès
        if (!$user || !$user->isActive()) {
            // si l'utilisateur n'est pas actif, on lui refuse l'accès
            return $this->json(['success' => false, 'error' => 'Account disabled.'], 403);
        }
        // seuls les employés et admins peuvent accéder à cette route
        if (!$this->isGranted('ROLE_EMPLOYEE') && !$this->isGranted('ROLE_ADMIN')) {

            throw $this->createAccessDeniedException('Access denied. Employee or admin role required.');
        }

        // on récupère la review à rejeter, si elle n'existe pas, on retourne une erreur 404
        $review = $em->getRepository(Review::class)->find($id);
        // si la review n'existe pas, on retourne une erreur 404
        if (!$review) {
            return $this->json(['success' => false, 'error' => 'Review not found.'], 404);
        }

        // on vérifie que la review n'est pas déjà dans un statut final (APPROVED ou REJECTED), car dans ce cas on n'autorise pas le rejet
        $payload = json_decode($request->getContent() ?: '[]', true) ?: [];
        // si la review est déjà dans un statut final, on retourne une erreur 400
        $reason = trim((string) ($payload['reason'] ?? ''));

        // 
        $review->setStatus('REJECTED');
        // on enregistre la raison de rejet (optionnelle) pour que les employés puissent rejeter les reviews avec une raison, ou mettre une raison par défaut si aucune n'est fournie
        $review->setRejectReason($reason === '' ? 'Rejected by employee' : $reason);
        $em->flush();

        // on retourne les données de la review rejetée au format JSON, en incluant son id et son nouveau statut pour que les employés puissent voir le résultat de leur action ainsi que la raison de rejet pour que les employés puissent voir la raison du rejet qu'ils ont enregistrée  
        return $this->json(['success' => true, 'id' => $review->getId(), 'status' => $review->getStatus()]);
    }
}
