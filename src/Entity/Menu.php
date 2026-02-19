<?php

namespace App\Entity;

use App\Repository\MenuRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: MenuRepository::class)]
class Menu
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $description = null;

    #[ORM\Column(length: 50)]
    private ?string $theme = null;

    #[ORM\Column(length: 50)]
    private ?string $regime = null;

    #[ORM\Column]
    private ?int $minPersons = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private ?string $basePrice = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $conditionsText = null;

    #[ORM\Column]
    private ?int $stock = null;

    #[ORM\Column]
    private ?bool $isActive = null;

    // ✅ Galerie images (rapide: JSON array)
    #[ORM\Column(type: Types::JSON)]
    private array $images = [];

    // ✅ Plats liés
    #[ORM\ManyToMany(targetEntity: Dish::class)]
    #[ORM\JoinTable(name: 'menu_dish')]
    private Collection $dishes;

    // ✅ Allergènes
    #[ORM\ManyToMany(targetEntity: Allergen::class)]
    #[ORM\JoinTable(name: 'menu_allergen')]
    private Collection $allergens;

    public function __construct()
    {
        $this->dishes = new ArrayCollection();
        $this->allergens = new ArrayCollection();
        $this->isActive = true;
        $this->stock = $this->stock ?? 0;
        $this->minPersons = $this->minPersons ?? 1;
        $this->regime = $this->regime ?? 'NONE';
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }
    public function setTitle(string $title): static
    {
        $this->title = $title;
        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }
    public function setDescription(string $description): static
    {
        $this->description = $description;
        return $this;
    }

    public function getTheme(): ?string
    {
        return $this->theme;
    }
    public function setTheme(string $theme): static
    {
        $this->theme = $theme;
        return $this;
    }

    public function getRegime(): ?string
    {
        return $this->regime;
    }
    public function setRegime(string $regime): static
    {
        $this->regime = $regime;
        return $this;
    }

    public function getMinPersons(): ?int
    {
        return $this->minPersons;
    }
    public function setMinPersons(int $minPersons): static
    {
        $this->minPersons = max(1, $minPersons);
        return $this;
    }

    public function getBasePrice(): ?string
    {
        return $this->basePrice;
    }
    public function setBasePrice(string $basePrice): static
    {
        $this->basePrice = $basePrice;
        return $this;
    }

    public function getConditionsText(): ?string
    {
        return $this->conditionsText;
    }
    public function setConditionsText(?string $conditionsText): static
    {
        $this->conditionsText = $conditionsText;
        return $this;
    }

    public function getStock(): ?int
    {
        return $this->stock;
    }
    public function setStock(int $stock): static
    {
        $this->stock = max(0, $stock);
        return $this;
    }

    public function isActive(): ?bool
    {
        return $this->isActive;
    }
    public function setIsActive(bool $isActive): static
    {
        $this->isActive = $isActive;
        return $this;
    }

    // ✅ Images
    public function getImages(): array
    {
        return $this->images;
    }
    public function setImages(array $images): static
    {
        $this->images = array_values(array_filter($images, fn($v) => is_string($v) && trim($v) !== ''));
        return $this;
    }
    public function addImage(string $image): static
    {
        $image = trim($image);
        if ($image !== '' && !in_array($image, $this->images, true)) {
            $this->images[] = $image;
        }
        return $this;
    }
    public function removeImage(string $image): static
    {
        $this->images = array_values(array_filter($this->images, fn($v) => $v !== $image));
        return $this;
    }

    /** @return Collection<int, Dish> */
    public function getDishes(): Collection
    {
        return $this->dishes;
    }
    public function addDish(Dish $dish): static
    {
        if (!$this->dishes->contains($dish))
            $this->dishes->add($dish);
        return $this;
    }
    public function removeDish(Dish $dish): static
    {
        $this->dishes->removeElement($dish);
        return $this;
    }

    /** @return Collection<int, Allergen> */
    public function getAllergens(): Collection
    {
        return $this->allergens;
    }
    public function addAllergen(Allergen $allergen): static
    {
        if (!$this->allergens->contains($allergen))
            $this->allergens->add($allergen);
        return $this;
    }
    public function removeAllergen(Allergen $allergen): static
    {
        $this->allergens->removeElement($allergen);
        return $this;
    }
}
