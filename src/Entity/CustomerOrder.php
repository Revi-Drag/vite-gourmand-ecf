<?php

namespace App\Entity;

use App\Repository\CustomerOrderRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CustomerOrderRepository::class)]
class CustomerOrder
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $user = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?Menu $menu = null;

    #[ORM\Column(length: 255)]
    private ?string $eventAddress = null;

    #[ORM\Column(length: 100)]
    private ?string $eventCity = null;

    #[ORM\Column]
    private ?\DateTime $eventDate = null;

    #[ORM\Column(length: 30)]
    private ?string $eventPhone = null;

    #[ORM\Column]
    private ?int $persons = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private ?string $menuPrice = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private ?string $deliveryPrice = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private ?string $totalPrice = null;

    #[ORM\Column(length: 30)]
    private ?string $status = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getMenu(): ?Menu
    {
        return $this->menu;
    }

    public function setMenu(?Menu $menu): static
    {
        $this->menu = $menu;

        return $this;
    }

    public function getEventAddress(): ?string
    {
        return $this->eventAddress;
    }

    public function setEventAddress(string $eventAddress): static
    {
        $this->eventAddress = $eventAddress;

        return $this;
    }

    public function getEventCity(): ?string
    {
        return $this->eventCity;
    }

    public function setEventCity(string $eventCity): static
    {
        $this->eventCity = $eventCity;

        return $this;
    }

    public function getEventDate(): ?\DateTime
    {
        return $this->eventDate;
    }

    public function setEventDate(\DateTime $eventDate): static
    {
        $this->eventDate = $eventDate;

        return $this;
    }

    public function getEventPhone(): ?string
    {
        return $this->eventPhone;
    }

    public function setEventPhone(string $eventPhone): static
    {
        $this->eventPhone = $eventPhone;

        return $this;
    }

    public function getPersons(): ?int
    {
        return $this->persons;
    }

    public function setPersons(int $persons): static
    {
        $this->persons = $persons;

        return $this;
    }

    public function getMenuPrice(): ?string
    {
        return $this->menuPrice;
    }

    public function setMenuPrice(string $menuPrice): static
    {
        $this->menuPrice = $menuPrice;

        return $this;
    }

    public function getDeliveryPrice(): ?string
    {
        return $this->deliveryPrice;
    }

    public function setDeliveryPrice(string $deliveryPrice): static
    {
        $this->deliveryPrice = $deliveryPrice;

        return $this;
    }

    public function getTotalPrice(): ?string
    {
        return $this->totalPrice;
    }

    public function setTotalPrice(string $totalPrice): static
    {
        $this->totalPrice = $totalPrice;

        return $this;
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;

        return $this;
    }
}
