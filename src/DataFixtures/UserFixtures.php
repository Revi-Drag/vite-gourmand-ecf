<?php

namespace App\DataFixtures;

use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UserFixtures extends Fixture
{
    public function __construct(
        private UserPasswordHasherInterface $passwordHasher
    ) {
    }

    public function load(ObjectManager $manager): void
    {
        // ADMIN (ECF)
        $admin = new User();
        $admin->setEmail('admin@vitegourmand.fr');
        $admin->setRoles(['ROLE_ADMIN']);
        $admin->setPassword(
            $this->passwordHasher->hashPassword($admin, 'Admin-123!')
        );
        $manager->persist($admin);

        // EMPLOYEE (ECF) — back-office commandes
        $employee = new User();
        $employee->setEmail('employee@vitegourmand.fr');
        $employee->setRoles(['ROLE_EMPLOYEE']);
        $employee->setPassword(
            $this->passwordHasher->hashPassword($employee, 'Employee-123!')
        );
        $manager->persist($employee);

        // USER (client)
        $user = new User();
        $user->setEmail('user@vitegourmand.fr');
        $user->setRoles(['ROLE_USER']);
        $user->setPassword(
            $this->passwordHasher->hashPassword($user, 'User-123!')
        );
        $manager->persist($user);

        $manager->flush();
    }
}
