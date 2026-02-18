<?php

namespace App\Controller;

use App\Entity\ContactMessage;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\Routing\Attribute\Route;

class ApiContactController extends AbstractController
{
    #[Route('/api/contact', name: 'api_contact', methods: ['POST'])]
    public function contact(
        Request $request,
        EntityManagerInterface $em,
        MailerInterface $mailer,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true) ?? [];

        $title = trim((string) ($data['title'] ?? ''));
        $description = trim((string) ($data['description'] ?? ''));
        $fromEmail = trim((string) ($data['email'] ?? ''));

        $errors = [];
        if ($title === '')
            $errors['title'] = 'Title is required.';
        if ($description === '')
            $errors['description'] = 'Description is required.';
        if ($fromEmail === '' || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Valid email is required.';
        }

        if ($errors) {
            return $this->json(['success' => false, 'errors' => $errors], 422);
        }

        $msg = new ContactMessage();
        $msg->setTitle($title);
        $msg->setDescription($description);
        $msg->setEmail($fromEmail);

        $em->persist($msg);
        $em->flush();

        $to = $_ENV['MAIL_TO_CONTACT'] ?? null;
        $from = $_ENV['MAIL_FROM'] ?? null;

        if ($to && $from) {
            $email = (new Email())
                ->from($from)
                ->to($to)
                ->replyTo($fromEmail)
                ->subject('[Contact] ' . $title)
                ->text(
                    "Nouveau message contact\n\n" .
                    "De: $fromEmail\n" .
                    "Titre: $title\n\n" .
                    $description . "\n\n" .
                    "Message ID: " . $msg->getId()
                );

            $mailer->send($email);
        }

        return $this->json(['success' => true, 'id' => $msg->getId()], 201);
    }
}
