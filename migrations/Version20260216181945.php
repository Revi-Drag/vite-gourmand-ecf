<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260216181945 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE customer_order (id INT AUTO_INCREMENT NOT NULL, event_address VARCHAR(255) NOT NULL, event_city VARCHAR(100) NOT NULL, envent_date DATETIME NOT NULL, event_phone VARCHAR(30) NOT NULL, persons INT NOT NULL, menu_price NUMERIC(10, 2) NOT NULL, delivery_price NUMERIC(10, 2) NOT NULL, total_price NUMERIC(10, 2) NOT NULL, status VARCHAR(30) NOT NULL, created_at DATETIME NOT NULL, user_id INT NOT NULL, menu_id INT NOT NULL, INDEX IDX_3B1CE6A3A76ED395 (user_id), INDEX IDX_3B1CE6A3CCD7E912 (menu_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE menu (id INT AUTO_INCREMENT NOT NULL, title VARCHAR(255) NOT NULL, description LONGTEXT NOT NULL, theme VARCHAR(50) NOT NULL, regime VARCHAR(50) NOT NULL, min_persons INT NOT NULL, base_price NUMERIC(10, 2) NOT NULL, conditions_text LONGTEXT DEFAULT NULL, stock INT NOT NULL, is_active TINYINT NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE customer_order ADD CONSTRAINT FK_3B1CE6A3A76ED395 FOREIGN KEY (user_id) REFERENCES `user` (id)');
        $this->addSql('ALTER TABLE customer_order ADD CONSTRAINT FK_3B1CE6A3CCD7E912 FOREIGN KEY (menu_id) REFERENCES menu (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE customer_order DROP FOREIGN KEY FK_3B1CE6A3A76ED395');
        $this->addSql('ALTER TABLE customer_order DROP FOREIGN KEY FK_3B1CE6A3CCD7E912');
        $this->addSql('DROP TABLE customer_order');
        $this->addSql('DROP TABLE menu');
    }
}
