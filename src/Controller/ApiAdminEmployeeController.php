<?php

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/admin/employees')]
class ApiAdminEmployeeController extends AbstractController
{
    /**
     * ✅ LISTE DES EMPLOYÉS (Admin only)
     * GET /api/admin/employees
     */
    #[Route('', name: 'app_api_admin_employees_list', methods: ['GET'])]
    public function list(EntityManagerInterface $em): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $users = $em->getRepository(User::class)->findAll();

        $employees = [];
        foreach ($users as $user) {
            if (!in_array('ROLE_EMPLOYEE', $user->getRoles(), true)) {
                continue;
            }

            $employees[] = [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'isActive' => $user->isActive(),
            ];
        }

        return $this->json([
            'success' => true,
            'employees' => $employees,
        ]);
    }

    /**
     * ✅ CRÉATION D’UN EMPLOYÉ (Admin only)
     * POST /api/admin/employees
     */
    #[Route('', name: 'app_api_admin_employees_create', methods: ['POST'])]
    public function create(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $data = json_decode($request->getContent(), true);

        $email = strtolower(trim($data['email'] ?? ''));
        $password = $data['password'] ?? '';

        if ($email === '' || $password === '') {
            return $this->json([
                'success' => false,
                'error' => 'Email and password are required.'
            ], 400);
        }

        // ✅ Password strong rule (ECF)
        $strong = preg_match(
            '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,}$/',
            $password
        );

        if (!$strong) {
            return $this->json([
                'success' => false,
                'error' => 'Weak password: min 10 chars with upper/lower/digit/special.'
            ], 400);
        }

        // Email unique
        $existing = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if ($existing) {
            return $this->json([
                'success' => false,
                'error' => 'Email already used.'
            ], 409);
        }

        // ✅ Create employee
        $employee = new User();
        $employee->setEmail($email);
        $employee->setRoles(['ROLE_EMPLOYEE']);
        $employee->setIsActive(true);

        $employee->setPassword(
            $hasher->hashPassword($employee, $password)
        );

        $em->persist($employee);
        $em->flush();

        return $this->json([
            'success' => true,
            'id' => $employee->getId(),
            'email' => $employee->getEmail(),
            'isActive' => $employee->isActive(),
        ], 201);
    }

    /**
     * ✅ ACTIVER / DÉSACTIVER UN EMPLOYÉ (Admin only)
     * PATCH /api/admin/employees/{id}/toggle
     */
    #[Route('/{id}/toggle', name: 'app_api_admin_employees_toggle', methods: ['PATCH'])]
    public function toggle(int $id, EntityManagerInterface $em): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $employee = $em->getRepository(User::class)->find($id);

        if (!$employee || !in_array('ROLE_EMPLOYEE', $employee->getRoles(), true)) {
            return $this->json([
                'success' => false,
                'error' => 'Employee not found.'
            ], 404);
        }

        $employee->setIsActive(!$employee->isActive());
        $em->flush();

        return $this->json([
            'success' => true,
            'id' => $employee->getId(),
            'isActive' => $employee->isActive(),
        ]);
    }
}
