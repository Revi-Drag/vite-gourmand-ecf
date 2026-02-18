<?php

namespace App\Controller\Api;

use App\Entity\Review;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class EmployeeReviewController extends AbstractController
{
    #[Route('/api/employee/reviews', name: 'app_api_employee_reviews_list', methods: ['GET'])]
    public function list(Request $request, EntityManagerInterface $em): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();
        if (!$user || !$user->isActive()) {
            return $this->json(['success' => false, 'error' => 'Account disabled.'], 403);
        }
        $this->denyAccessUnlessGranted('ROLE_EMPLOYEE');

        $status = strtoupper(trim((string) $request->query->get('status', 'PENDING')));
        if (!in_array($status, ['PENDING', 'APPROVED', 'REJECTED'], true)) {
            $status = 'PENDING';
        }

        $reviews = $em->getRepository(Review::class)->findBy(
            ['status' => $status],
            ['createdAt' => 'DESC']
        );

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

        return $this->json(['success' => true, 'reviews' => $data]);
    }

    #[Route('/api/employee/reviews/{id}/approve', name: 'app_api_employee_reviews_approve', methods: ['PATCH'])]
    public function approve(int $id, EntityManagerInterface $em): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();
        if (!$user || !$user->isActive()) {
            return $this->json(['success' => false, 'error' => 'Account disabled.'], 403);
        }
        $this->denyAccessUnlessGranted('ROLE_EMPLOYEE');

        $review = $em->getRepository(Review::class)->find($id);
        if (!$review) {
            return $this->json(['success' => false, 'error' => 'Review not found.'], 404);
        }

        $review->setStatus('APPROVED');
        $review->setRejectReason(null);
        $em->flush();

        return $this->json(['success' => true, 'id' => $review->getId(), 'status' => $review->getStatus()]);
    }

    #[Route('/api/employee/reviews/{id}/reject', name: 'app_api_employee_reviews_reject', methods: ['PATCH'])]
    public function reject(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();
        if (!$user || !$user->isActive()) {
            return $this->json(['success' => false, 'error' => 'Account disabled.'], 403);
        }
        $this->denyAccessUnlessGranted('ROLE_EMPLOYEE');

        $review = $em->getRepository(Review::class)->find($id);
        if (!$review) {
            return $this->json(['success' => false, 'error' => 'Review not found.'], 404);
        }

        $payload = json_decode($request->getContent() ?: '[]', true) ?: [];
        $reason = trim((string) ($payload['reason'] ?? ''));

        $review->setStatus('REJECTED');
        $review->setRejectReason($reason === '' ? 'Rejected by employee' : $reason);
        $em->flush();

        return $this->json(['success' => true, 'id' => $review->getId(), 'status' => $review->getStatus()]);
    }
}
