<?php

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/register')]
class ApiRegisterController extends AbstractController
{
    #[Route('', name: 'app_api_register', methods: ['POST'])]
    public function register(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher,
        MailerInterface $mailer,
    ): JsonResponse {
        $payload = json_decode($request->getContent() ?: '[]', true) ?: [];

        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $password = (string) ($payload['password'] ?? '');

        $firstName = trim((string) ($payload['firstName'] ?? ''));
        $lastName = trim((string) ($payload['lastName'] ?? ''));
        $phone = trim((string) ($payload['phone'] ?? ''));
        $address = trim((string) ($payload['address'] ?? ''));
        $city = trim((string) ($payload['city'] ?? ''));

        if ($email === '' || $password === '') {
            return $this->json(['success' => false, 'error' => 'Email and password are required.'], 400);
        }

        // Champs obligatoires énoncé
        if ($firstName === '' || $lastName === '' || $phone === '' || $address === '' || $city === '') {
            return $this->json([
                'success' => false,
                'error' => 'firstName, lastName, phone, address and city are required.'
            ], 400);
        }

        // Mot de passe fort (min 10 + upper/lower/digit/special)
        $strong = preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,}$/', $password);
        if (!$strong) {
            return $this->json([
                'success' => false,
                'error' => 'Weak password: min 10 chars with upper/lower/digit/special.'
            ], 400);
        }

        // Email unique
        $existing = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if ($existing) {
            return $this->json(['success' => false, 'error' => 'Email already used.'], 409);
        }

        $user = new User();
        $user->setEmail($email);
        $user->setRoles(['ROLE_USER']);
        $user->setIsActive(true);

        $user->setFirstName($firstName);
        $user->setLastName($lastName);
        $user->setPhone($phone);
        $user->setAddress($address);
        $user->setCity($city);

        $user->setPassword($hasher->hashPassword($user, $password));

        $em->persist($user);
        $em->flush();

        // Mail de bienvenue
        $from = $_ENV['MAIL_FROM'] ?? 'no-reply@vitegourmand.fr';

        $welcome = (new Email())
            ->from($from)
            ->to($user->getEmail())
            ->subject('Bienvenue chez Vite & Gourmand')
            ->text(
                "Bonjour {$firstName},\n\n" .
                "Votre compte Vite & Gourmand a bien été créé.\n" .
                "Vous pouvez maintenant vous connecter et commander un menu.\n\n" .
                "À bientôt,\nVite & Gourmand"
            );

        $mailer->send($welcome);

        return $this->json([
            'success' => true,
            'id' => $user->getId(),
            'email' => $user->getEmail(),
        ], 201);
    }
}
