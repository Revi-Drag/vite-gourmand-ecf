<?php

namespace App\Repository;

use App\Entity\Menu;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Menu>
 */
class MenuRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Menu::class);
    }

    /**
     * Catalogue public avec filtres dynamiques.
     * Filtres attendus (query string côté front):
     * - theme
     * - diet  (mappe vers Menu.regime)
     * - minPersons
     * - priceMin (mappe vers Menu.basePrice)
     * - priceMax (mappe vers Menu.basePrice)
     */
    public function searchPublic(array $filters): array
    {
        $qb = $this->createQueryBuilder('m')
            ->leftJoin('m.dishes', 'd')->addSelect('d') // pour éviter le N+1 sur les plats
            ->leftJoin('m.allergens', 'a')->addSelect('a') // pour éviter le N+1 sur les allergènes
            ->andWhere('m.isActive = :active')
            ->setParameter('active', true);

        // theme exact (simple)
        if (!empty($filters['theme'])) {
            $qb->andWhere('m.theme = :theme')
                ->setParameter('theme', $filters['theme']);
        }

        // diet -> regime
        if (!empty($filters['diet'])) {
            $qb->andWhere('m.regime = :regime')
                ->setParameter('regime', $filters['diet']);
        }

        // minPersons : on veut les menus qui acceptent <= N (ex: user demande 10 pers => menu minPersons <= 10)
        if (isset($filters['minPersons']) && $filters['minPersons'] !== '' && $filters['minPersons'] !== null) {
            $qb->andWhere('m.minPersons <= :minPersons')
                ->setParameter('minPersons', (int) $filters['minPersons']);
        }

        // priceMin / priceMax sur basePrice (decimal string)
        if (isset($filters['priceMin']) && $filters['priceMin'] !== '' && $filters['priceMin'] !== null) {
            $qb->andWhere('m.basePrice >= :pmin')
                ->setParameter('pmin', (float) $filters['priceMin']);
        }

        if (isset($filters['priceMax']) && $filters['priceMax'] !== '' && $filters['priceMax'] !== null) {
            $qb->andWhere('m.basePrice <= :pmax')
                ->setParameter('pmax', (float) $filters['priceMax']);
        }

        // Optionnel: si tu veux masquer les menus en rupture de stock (à activer plus tard)
        // $qb->andWhere('m.stock > 0');

        return $qb->orderBy('m.id', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
