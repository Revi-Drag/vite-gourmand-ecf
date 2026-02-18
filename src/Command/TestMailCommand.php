<?php

namespace App\Command;

use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

#[AsCommand(
    name: 'app:test-mail',
    description: 'Send a test email using Symfony Mailer (Mailtrap SMTP).'
)]
class TestMailCommand extends Command
{
    public function __construct(
        private readonly MailerInterface $mailer
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $email = (new Email())
            ->from('no-reply@vitegourmand.fr')
            ->to('contact@vitegourmand.fr')
            ->subject('[Vite & Gourmand] Test Mailtrap OK')
            ->text('Symfony Mailer fonctionne correctement avec Mailtrap.');

        $this->mailer->send($email);

        $output->writeln('<info>OK: email sent (Mailtrap)</info>');

        return Command::SUCCESS;
    }
}
