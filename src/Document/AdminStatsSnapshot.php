<?php

namespace App\Document;

use Doctrine\ODM\MongoDB\Mapping\Annotations as MongoDB;

#[MongoDB\Document(collection: 'admin_stats_snapshots')]
class AdminStatsSnapshot
{
    #[MongoDB\Id]
    private ?string $id = null;

    #[MongoDB\Field(type: 'string')]
    private string $scope;

    #[MongoDB\Field(type: 'string')]
    private string $periodKey;

    #[MongoDB\Field(type: 'float')]
    private float $revenue;

    #[MongoDB\Field(type: 'int')]
    private int $ordersCount;

    #[MongoDB\Field(type: 'date_immutable')]
    private \DateTimeImmutable $generatedAt;

    public function getId(): ?string
    {
        return $this->id;
    }

    public function getScope(): string
    {
        return $this->scope;
    }

    public function setScope(string $scope): self
    {
        $this->scope = $scope;
        return $this;
    }

    public function getPeriodKey(): string
    {
        return $this->periodKey;
    }

    public function setPeriodKey(string $periodKey): self
    {
        $this->periodKey = $periodKey;
        return $this;
    }

    public function getRevenue(): float
    {
        return $this->revenue;
    }

    public function setRevenue(float $revenue): self
    {
        $this->revenue = $revenue;
        return $this;
    }

    public function getOrdersCount(): int
    {
        return $this->ordersCount;
    }

    public function setOrdersCount(int $ordersCount): self
    {
        $this->ordersCount = $ordersCount;
        return $this;
    }

    public function getGeneratedAt(): \DateTimeImmutable
    {
        return $this->generatedAt;
    }

    public function setGeneratedAt(\DateTimeImmutable $generatedAt): self
    {
        $this->generatedAt = $generatedAt;
        return $this;
    }
}