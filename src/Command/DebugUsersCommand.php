<?php

namespace App\Command;

use App\Repository\UserRepository;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'app:debug-users',
    description: 'Affiche les utilisateurs (email + roles) en base'
)]
class DebugUsersCommand extends Command
{
    public function __construct(
        private UserRepository $userRepository
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $users = $this->userRepository->findAll();

        if (!$users) {
            $output->writeln("Aucun utilisateur en base.");
            return Command::SUCCESS;
        }

        foreach ($users as $u) {
            $output->writeln(sprintf(
                "ID: %s | %s | roles=%s",
                $u->getId(),
                $u->getEmail(),
                json_encode($u->getRoles(), JSON_UNESCAPED_SLASHES)
            ));
        }

        return Command::SUCCESS;
    }
}
