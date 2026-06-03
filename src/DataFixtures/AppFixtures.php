<?php

namespace App\DataFixtures;

use App\Entity\Allergen;
use App\Entity\Dish;
use App\Entity\Menu;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class AppFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        // -----------------------------
        // Allergens
        // -----------------------------
        $allergenNames = [
            'Gluten',
            'Lactose',
            'Arachides',
            'Œufs',
            'Fruits à coque',
            'Poisson',
            'Crustacés',
            'Soja',
            'Moutarde',
        ];

        $allergens = [];
        foreach ($allergenNames as $name) {
            $a = new Allergen();
            $a->setName($name);
            $manager->persist($a);
            $allergens[$name] = $a;
        }

        // -----------------------------
        // Dishes
        // -----------------------------
        $dishDefs = [
            // STARTERS
            ['Velouté de potimarron', 'Crème légère, noisettes torréfiées', Dish::TYPE_STARTER],
            ['Salade gourmande', 'Jeunes pousses, tomates, vinaigrette maison', Dish::TYPE_STARTER],
            ['Tartare de saumon', 'Citron vert, herbes fraîches', Dish::TYPE_STARTER],

            // MAINS
            ['Bœuf mijoté', 'Sauce au vin, légumes de saison', Dish::TYPE_MAIN],
            ['Poulet rôti', 'Herbes, pommes grenaille', Dish::TYPE_MAIN],
            ['Curry de légumes', 'Lait de coco, riz basmati', Dish::TYPE_MAIN],
            ['Lasagnes végétariennes', 'Légumes grillés, sauce tomate', Dish::TYPE_MAIN],

            // DESSERTS
            ['Tarte aux pommes', 'Pâte croustillante, cannelle', Dish::TYPE_DESSERT],
            ['Mousse chocolat', 'Chocolat noir intense', Dish::TYPE_DESSERT],
            ['Salade de fruits', 'Fruits frais, menthe', Dish::TYPE_DESSERT],
        ];

        $dishesByName = [];
        foreach ($dishDefs as [$name, $desc, $type]) {
            $d = new Dish();
            $d->setName($name);
            $d->setDescription($desc);
            $d->setType($type);
            $manager->persist($d);
            $dishesByName[$name] = $d;
        }

        // Helper: pick dish objects by name
        $pick = fn(array $names) => array_map(fn($n) => $dishesByName[$n], $names);

        // -----------------------------
        // Menus (6)
        // -----------------------------
        $menus = [];

        // 1) Classique
        $m = new Menu();
        $m->setTitle('Menu Classique');
        $m->setDescription('Un menu équilibré, parfait pour tous types d’événements.');
        $m->setTheme('Classique');
        $m->setRegime('NONE');
        $m->setMinPersons(2);
        $m->setBasePrice('79.90');
        $m->setStock(30);
        $m->setIsActive(true);
        $m->setConditionsText('Précommande 48h à l’avance. Livraison sur créneau.');
        $m->setImages([]); // ou ['https://picsum.photos/seed/menu1/800/500']
        foreach ($pick(['Velouté de potimarron', 'Poulet rôti', 'Tarte aux pommes']) as $dish) {
            $m->addDish($dish);
        }
        $m->addAllergen($allergens['Lactose'])->addAllergen($allergens['Œufs'])->addAllergen($allergens['Gluten']);
        $manager->persist($m);
        $menus[] = $m;

        // 2) Anniversaire
        $m = new Menu();
        $m->setTitle('Menu Anniversaire');
        $m->setDescription('Généreux et festif, idéal pour les grandes tablées.');
        $m->setTheme('Anniversaire');
        $m->setRegime('NONE');
        $m->setMinPersons(6);
        $m->setBasePrice('189.00');
        $m->setStock(12);
        $m->setIsActive(true);
        $m->setConditionsText('Précommande 72h. Options boisson sur demande.');
        $m->setImages([]);
        foreach ($pick(['Salade gourmande', 'Bœuf mijoté', 'Mousse chocolat']) as $dish) {
            $m->addDish($dish);
        }
        $m->addAllergen($allergens['Gluten'])->addAllergen($allergens['Lactose'])->addAllergen($allergens['Œufs']);
        $manager->persist($m);
        $menus[] = $m;

        // 3) Végétarien
        $m = new Menu();
        $m->setTitle('Menu Végétarien');
        $m->setDescription('100% gourmand, sans viande, avec des plats riches et savoureux.');
        $m->setTheme('Bien-être');
        $m->setRegime('VEGETARIAN');
        $m->setMinPersons(2);
        $m->setBasePrice('99.00');
        $m->setStock(20);
        $m->setIsActive(true);
        $m->setConditionsText('Précommande 48h. Peut contenir traces de gluten/lactose.');
        $m->setImages([]);
        foreach ($pick(['Salade gourmande', 'Curry de légumes', 'Salade de fruits']) as $dish) {
            $m->addDish($dish);
        }
        $m->addAllergen($allergens['Soja']);
        $manager->persist($m);
        $menus[] = $m;

        // 4) Halal
        $m = new Menu();
        $m->setTitle('Menu Halal');
        $m->setDescription('Sélection adaptée, simple et efficace pour événements familiaux.');
        $m->setTheme('Famille');
        $m->setRegime('HALAL');
        $m->setMinPersons(4);
        $m->setBasePrice('149.00');
        $m->setStock(15);
        $m->setIsActive(true);
        $m->setConditionsText('Précommande 72h. Certification sur demande.');
        $m->setImages([]);
        foreach ($pick(['Velouté de potimarron', 'Poulet rôti', 'Mousse chocolat']) as $dish) {
            $m->addDish($dish);
        }
        $m->addAllergen($allergens['Lactose'])->addAllergen($allergens['Œufs']);
        $manager->persist($m);
        $menus[] = $m;

        // 5) Sans gluten
        $m = new Menu();
        $m->setTitle('Menu Sans Gluten');
        $m->setDescription('Pensé pour limiter le gluten (attention traces possibles).');
        $m->setTheme('Spécial');
        $m->setRegime('GLUTEN_FREE');
        $m->setMinPersons(2);
        $m->setBasePrice('129.00');
        $m->setStock(10);
        $m->setIsActive(true);
        $m->setConditionsText('Précommande 72h. Nous faisons le maximum pour éviter la contamination croisée.');
        $m->setImages([]);
        foreach ($pick(['Tartare de saumon', 'Curry de légumes', 'Salade de fruits']) as $dish) {
            $m->addDish($dish);
        }
        $m->addAllergen($allergens['Poisson']);
        $manager->persist($m);
        $menus[] = $m;

        // 6) Entreprise
        $m = new Menu();
        $m->setTitle('Menu Entreprise');
        $m->setDescription('Pensé pour les réunions et événements professionnels, efficace et premium.');
        $m->setTheme('Entreprise');
        $m->setRegime('NONE');
        $m->setMinPersons(10);
        $m->setBasePrice('390.00');
        $m->setStock(8);
        $m->setIsActive(true);
        $m->setConditionsText('Précommande 5 jours ouvrés. Facturation possible.');
        $m->setImages([]);
        foreach ($pick(['Tartare de saumon', 'Bœuf mijoté', 'Tarte aux pommes']) as $dish) {
            $m->addDish($dish);
        }
        $m->addAllergen($allergens['Poisson'])->addAllergen($allergens['Gluten'])->addAllergen($allergens['Œufs']);
        $manager->persist($m);
        $menus[] = $m;

        $manager->flush();
    }
}
