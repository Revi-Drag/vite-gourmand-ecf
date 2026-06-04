<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\Routing\Attribute\Route;

class HomeController extends AbstractController
{
    #[Route('/', name: 'app_home_home', methods: ['GET'])]
    public function home(): RedirectResponse
    {
        return $this->redirect('/app/home.html');
    }

    #[Route('/app/', name: 'app_front_home', methods: ['GET'])]
    public function appHome(): RedirectResponse
    {
        return $this->redirect('/app/home.html');
    }
}