<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260219144134 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE order_status_event (id INT AUTO_INCREMENT NOT NULL, status VARCHAR(30) NOT NULL, changed_at DATETIME NOT NULL, changed_by VARCHAR(180) DEFAULT NULL, note LONGTEXT DEFAULT NULL, customer_order_id INT NOT NULL, INDEX IDX_C834CF3DA15A2E17 (customer_order_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE order_status_event ADD CONSTRAINT FK_C834CF3DA15A2E17 FOREIGN KEY (customer_order_id) REFERENCES customer_order (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE order_status_event DROP FOREIGN KEY FK_C834CF3DA15A2E17');
        $this->addSql('DROP TABLE order_status_event');
    }
}
