<?php

namespace App\DataFixtures;

use App\Entity\Menu;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class MenuFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $menus = [
            [
                "title" => "Menu Classique Bordeaux",
                "description" => "Un menu traditionnel complet pour vos événements.",
                "theme" => "Classique",
                "regime" => "Classique",
                "minPersons" => 10,
                "basePrice" => 25.00,
                "conditionsText" => "Commande 3 jours à l’avance minimum.",
                "stock" => 5,
            ],
            [
                "title" => "Menu Noël Prestige",
                "description" => "Un menu festif haut de gamme spécial Noël.",
                "theme" => "Noel",
                "regime" => "Classique",
                "minPersons" => 8,
                "basePrice" => 40.00,
                "conditionsText" => "Commande 2 semaines à l’avance.",
                "stock" => 3,
            ],
            [
                "title" => "Menu Vegan Fraîcheur",
                "description" => "Un menu 100% vegan, léger et moderne.",
                "theme" => "Evenement",
                "regime" => "Vegan",
                "minPersons" => 6,
                "basePrice" => 30.00,
                "conditionsText" => null,
                "stock" => 10,
            ],
            [
                "title" => "Menu Pâques Tradition",
                "description" => "Menu spécial Pâques avec produits locaux.",
                "theme" => "Paques",
                "regime" => "Classique",
                "minPersons" => 12,
                "basePrice" => 28.00,
                "conditionsText" => "Commande 7 jours avant.",
                "stock" => 4,
            ],
            [
                "title" => "Menu Végétarien Gourmand",
                "description" => "Menu végétarien complet et généreux.",
                "theme" => "Classique",
                "regime" => "Vegetarien",
                "minPersons" => 5,
                "basePrice" => 22.00,
                "conditionsText" => null,
                "stock" => 7,
            ],
        ];

        foreach ($menus as $data) {
            $menu = new Menu();
            $menu->setTitle($data["title"]);
            $menu->setDescription($data["description"]);
            $menu->setTheme($data["theme"]);
            $menu->setRegime($data["regime"]);
            $menu->setMinPersons($data["minPersons"]);
            $menu->setBasePrice((string) $data["basePrice"]);
            $menu->setConditionsText($data["conditionsText"]);
            $menu->setStock($data["stock"]);
            $menu->setIsActive(true);

            $manager->persist($menu);
        }

        $manager->flush();
    }
}
