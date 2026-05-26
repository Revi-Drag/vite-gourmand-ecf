<?php

namespace App\Controller\Api\Admin;

use App\Document\AdminStatsSnapshot;
use Doctrine\ODM\MongoDB\DocumentManager;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin', name: 'app_api_admin_')]
final class AdminMongoTestController extends AbstractController
{
    #[Route('/mongo-test', name: 'mongo_test', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function test(DocumentManager $documentManager): JsonResponse
    {
        $snapshot = new AdminStatsSnapshot();
        $snapshot->setScope('test');
        $snapshot->setPeriodKey('manual-test');
        $snapshot->setRevenue(123.45);
        $snapshot->setOrdersCount(2);
        $snapshot->setGeneratedAt(new \DateTimeImmutable());

        $documentManager->persist($snapshot);
        $documentManager->flush();

        return $this->json([
            'success' => true,
            'message' => 'MongoDB write OK',
        ]);
    }
}