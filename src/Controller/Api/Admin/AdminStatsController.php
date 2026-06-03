<?php

namespace App\Controller\Api\Admin;

use App\Repository\CustomerOrderRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use App\Document\AdminStatsSnapshot;
use Doctrine\ODM\MongoDB\DocumentManager;

#[Route('/api/admin', name: 'app_api_admin_')]
final class AdminStatsController extends AbstractController
{
    #[Route('/stats', name: 'stats', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function stats(CustomerOrderRepository $customerOrderRepository, DocumentManager $documentManager): JsonResponse
    {
        $now = new \DateTimeImmutable();

        $startOfToday = $now->setTime(0, 0, 0);
        $startOfTomorrow = $startOfToday->modify('+1 day');

        $startOfMonth = $now->modify('first day of this month')->setTime(0, 0, 0);
        $startOfNextMonth = $startOfMonth->modify('+1 month');

        // Status de la column "status" de CustomerOrder à prendre en compte pour les stats
        $includedStatuses = ['PREPARING', 'DELIVERING', 'DONE'];

        $totalStats = $customerOrderRepository->sumAndCountByPeriod(
            null,
            null,
            $includedStatuses
        );

        $todayStats = $customerOrderRepository->sumAndCountByPeriod(
            $startOfToday,
            $startOfTomorrow,
            $includedStatuses
        );

        $monthStats = $customerOrderRepository->sumAndCountByPeriod(
            $startOfMonth,
            $startOfNextMonth,
            $includedStatuses
        );

        // Enregistrement d'un snapshot dans MongoDB
        $mongoAvailable = true;
        $mongoError = null;

        try {
            $scope = 'admin_dashboard';
            $periodKey = date('Y-m-d-H');

            $existingSnapshot = $documentManager
                ->getRepository(AdminStatsSnapshot::class)
                ->findOneBy([
                    'scope' => $scope,
                    'periodKey' => $periodKey,
                ]);

            if (!$existingSnapshot) {
                $snapshot = new AdminStatsSnapshot();
                $snapshot->setScope($scope);
                $snapshot->setPeriodKey($periodKey);
                $snapshot->setRevenue((float) ($totalStats['sum'] ?? 0));
                $snapshot->setOrdersCount((int) ($totalStats['count'] ?? 0));
                $snapshot->setGeneratedAt(new \DateTimeImmutable());

                $documentManager->persist($snapshot);
                $documentManager->flush();
            } else {
                $existingSnapshot->setRevenue((float) ($totalStats['sum'] ?? 0));
                $existingSnapshot->setOrdersCount((int) ($totalStats['count'] ?? 0));
                $existingSnapshot->setGeneratedAt(new \DateTimeImmutable());

                $documentManager->flush();
            }
        } catch (\Throwable $exception) {
            $mongoAvailable = false;
            $mongoError = $exception->getMessage();
        }

        return $this->json([
            'success' => true,
            'data' => [
                'revenueTotal' => $totalStats['sum'] ?? 0,
                'ordersTotal' => $totalStats['count'] ?? 0,
                'revenueToday' => $todayStats['sum'] ?? 0,
                'ordersToday' => $todayStats['count'] ?? 0,
                'revenueMonth' => $monthStats['sum'] ?? 0,
                'ordersMonth' => $monthStats['count'] ?? 0,
                'mongoAvailable' => $mongoAvailable,
                'mongoError' => $mongoError,
            ],
        ]);
    }

    // Récupération de l'historique des snapshots pour affichage dans un graphique sur le dashboard admin
    #[Route('/stats/history', name: 'stats_history', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function history(DocumentManager $documentManager): JsonResponse
    {
        try {
            $repository = $documentManager->getRepository(AdminStatsSnapshot::class);

            $snapshots = $repository->createQueryBuilder()
                ->sort('generatedAt', 'ASC')
                ->limit(50)
                ->getQuery()
                ->execute();

            $data = [];

            foreach ($snapshots as $snapshot) {
                $data[] = [
                    'date' => $snapshot->getGeneratedAt()->format('Y-m-d H:i'),
                    'revenue' => $snapshot->getRevenue(),
                    'orders' => $snapshot->getOrdersCount(),
                ];
            }

            return $this->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Throwable $exception) {
            return $this->json([
                'success' => true,
                'data' => [],
                'warning' => 'Historique MongoDB indisponible.',
                'error' => $exception->getMessage(),
            ]);
        }
    }
}