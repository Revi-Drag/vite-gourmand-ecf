<?php

namespace App\Controller;

use App\Entity\Review;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/reviews')]
class ApiReviewController extends AbstractController
{
    #[Route('', name: 'app_api_reviews_list', methods: ['GET'])]
    public function list(EntityManagerInterface $em): JsonResponse
    {
        $reviews = $em->getRepository(Review::class)->findBy(
            ['status' => 'APPROVED'],
            ['createdAt' => 'DESC']
        );

        $data = [];
        foreach ($reviews as $r) {
            $data[] = [
                'id' => $r->getId(),
                'rating' => $r->getRating(),
                'comment' => $r->getComment(),
                'createdAt' => $r->getCreatedAt()->format('Y-m-d H:i'),
                'authorEmail' => $r->getUser()->getEmail(),
            ];
        }

        return $this->json(['success' => true, 'reviews' => $data]);
    }

    #[Route('', name: 'app_api_reviews_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['success' => false, 'error' => 'Not authenticated.'], 401);
        }

        $payload = json_decode($request->getContent() ?: '[]', true) ?: [];

        $ratingRaw = $payload['rating'] ?? null;
        $comment = trim((string) ($payload['comment'] ?? ''));

        // ✅ Ultra-robuste : accepte int / string numérique / float 5.0 etc.
        $rating = filter_var($ratingRaw, FILTER_VALIDATE_INT);

        if ($rating === false || $rating < 1 || $rating > 5) {
            return $this->json([
                'success' => false,
                'error' => 'Rating must be an integer between 1 and 5.',
            ], 400);
        }

        if ($comment === '') {
            return $this->json([
                'success' => false,
                'error' => 'Comment is required.'
            ], 400);
        }

        // 1 avis max par user (simple, ECF-friendly)
        $existing = $em->getRepository(Review::class)->findOneBy(['user' => $user]);
        if ($existing) {
            return $this->json([
                'success' => false,
                'error' => 'You already submitted a review.'
            ], 409);
        }

        $review = new Review();
        $review->setUser($user);
        $review->setRating((int) $rating);
        $review->setComment($comment);
        // status + createdAt set by constructor

        $em->persist($review);
        $em->flush();

        return $this->json([
            'success' => true,
            'id' => $review->getId(),
            'status' => $review->getStatus(),
        ], 201);
    }
}
