<?php

namespace App\Controller;

use App\Entity\PasswordResetToken;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/password')]
class ApiPasswordController extends AbstractController
{
    private function isStrongPassword(string $pw): bool
    {
        return (bool) preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,}$/', $pw);
    }

    private function genericForgotResponse(): JsonResponse
    {
        // Anti-enumération: même réponse dans tous les cas
        return $this->json([
            'success' => true,
            'message' => 'If the email exists, a reset link has been sent.',
        ]);
    }

    /**
     * POST /api/password/forgot  (PUBLIC)
     * Body: { "email": "..." }
     * Response is ALWAYS success (anti-enumeration)
     */
    #[Route('/forgot', name: 'app_api_password_forgot', methods: ['POST'])]
    public function forgot(
        Request $request,
        EntityManagerInterface $em,
        MailerInterface $mailer
    ): JsonResponse {
        $payload = json_decode($request->getContent() ?: '[]', true) ?: [];
        $email = strtolower(trim((string) ($payload['email'] ?? '')));

        if ($email === '') {
            return $this->genericForgotResponse();
        }

        /** @var User|null $user */
        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if (!$user) {
            return $this->genericForgotResponse();
        }

        // 1 token max par user (contrainte UNIQUE sur user_id)
        $repo = $em->getRepository(PasswordResetToken::class);
        $prt = $repo->findOneBy(['user' => $user]) ?? new PasswordResetToken();
        $prt->setUser($user);

        // Génère un token unique (collision ultra rare, mais on sécurise)
        do {
            $token = bin2hex(random_bytes(32)); // 64 hex
            $exists = $repo->findOneBy(['token' => $token]);
        } while ($exists);

        $now = new \DateTimeImmutable();
        $prt->setToken($token);
        $prt->setCreatedAt($now);
        $prt->setExpiresAt($now->modify('+1 hour'));

        $em->persist($prt);
        $em->flush();

        // URL côté navigateur (public/app/reset-password.html => /app/reset-password.html)
        $resetLink = sprintf(
            '%s/app/reset-password.html?token=%s',
            $request->getSchemeAndHttpHost(),
            $token
        );

        $from = $_ENV['MAIL_FROM'] ?? 'no-reply@vitegourmand.fr';

        $emailMsg = (new Email())
            ->from($from)
            ->to($user->getEmail())
            ->subject('Réinitialisation de mot de passe — Vite & Gourmand')
            ->text(
                "Bonjour,\n\n" .
                "Pour réinitialiser votre mot de passe, cliquez sur ce lien :\n" .
                $resetLink . "\n\n" .
                "Ce lien expire dans 1 heure.\n"
            );

        $mailer->send($emailMsg);

        return $this->genericForgotResponse();
    }

    /**
     * POST /api/password/reset  (PUBLIC)
     * Body: { "token": "...", "password": "NewPass!1234" }
     */
    #[Route('/reset', name: 'app_api_password_reset', methods: ['POST'])]
    public function reset(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher
    ): JsonResponse {
        $payload = json_decode($request->getContent() ?: '[]', true) ?: [];
        $token = trim((string) ($payload['token'] ?? ''));
        $newPassword = (string) ($payload['password'] ?? '');

        if ($token === '' || $newPassword === '') {
            return $this->json(['success' => false, 'error' => 'Token and password are required.'], 400);
        }

        if (!$this->isStrongPassword($newPassword)) {
            return $this->json([
                'success' => false,
                'error' => 'Weak password: min 10 chars with upper/lower/digit/special.'
            ], 400);
        }

        /** @var PasswordResetToken|null $prt */
        $prt = $em->getRepository(PasswordResetToken::class)->findOneBy(['token' => $token]);
        if (!$prt) {
            return $this->json(['success' => false, 'error' => 'Invalid token.'], 400);
        }

        $now = new \DateTimeImmutable();
        if ($prt->getExpiresAt() < $now) {
            // token expiré => on supprime
            $em->remove($prt);
            $em->flush();

            return $this->json(['success' => false, 'error' => 'Token expired.'], 400);
        }

        $user = $prt->getUser();
        $user->setPassword($hasher->hashPassword($user, $newPassword));

        // One-time use
        $em->remove($prt);
        $em->flush();

        return $this->json(['success' => true]);
    }
}
