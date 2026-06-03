<?php

namespace App\Repository;

use App\Entity\CustomerOrder;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CustomerOrder>
 */
class CustomerOrderRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CustomerOrder::class);
    }
    // ==========================================================================================================================
    public function sumAndCountByPeriod(
        ?\DateTimeImmutable $from,
        ?\DateTimeImmutable $to,
        array $statuses
    ): array {
        $qb = $this->createQueryBuilder('o')
            ->select('COALESCE(SUM(o.totalPrice), 0) as totalSum')
            ->addSelect('COUNT(o.id) as totalCount')
            ->andWhere('o.status IN (:statuses)')
            ->setParameter('statuses', $statuses);

        if ($from) {
            $qb->andWhere('o.createdAt >= :from')->setParameter('from', $from);
        }

        if ($to) {
            $qb->andWhere('o.createdAt < :to')->setParameter('to', $to);
        }

        $row = $qb->getQuery()->getSingleResult();

        // totalPrice est DECIMAL => Doctrine renvoie souvent une string
        return [
            'sum' => (string) ($row['totalSum'] ?? '0'),
            'count' => (int) ($row['totalCount'] ?? 0),
        ];
    }

    //    /**
    //     * @return CustomerOrder[] Returns an array of CustomerOrder objects
    //     */
    //    public function findByExampleField($value): array
    //    {
    //        return $this->createQueryBuilder('c')
    //            ->andWhere('c.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->orderBy('c.id', 'ASC')
    //            ->setMaxResults(10)
    //            ->getQuery()
    //            ->getResult()
    //        ;
    //    }

    //    public function findOneBySomeField($value): ?CustomerOrder
    //    {
    //        return $this->createQueryBuilder('c')
    //            ->andWhere('c.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->getQuery()
    //            ->getOneOrNullResult()
    //        ;
    //    }
}
