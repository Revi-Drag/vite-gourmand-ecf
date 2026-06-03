<?php

namespace App\Entity;

use App\Repository\AllergenRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AllergenRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_allergen_name', columns: ['name'])]
class Allergen
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 80)]
    private string $name;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }
    public function setName(string $name): self
    {
        $this->name = trim($name);
        return $this;
    }
}
