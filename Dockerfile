FROM php:8.4-fpm-alpine

# deps system (minimum)
RUN apk add --no-cache \
    bash git unzip \
    nginx \
    $PHPIZE_DEPS

# php extensions (minimum)
RUN docker-php-ext-install pdo pdo_mysql opcache
RUN php -m | grep -i pdo_mysql

#check DUR casse le build si pdo_mysql absent
RUN php -v && php -m
RUN php -m | grep -i pdo_mysql


# mongodb extension (NoSQL)
RUN pecl install mongodb \
 && docker-php-ext-enable mongodb

# verify MySQL drivers are installed (PDO + mysqlnd)
RUN php -m | grep -E 'pdo_mysql|mysqlnd' || (php -m && exit 1)

WORKDIR /var/www/html

# copy app
COPY . .

# PHP/FPM logs -> Render stdout/stderr
COPY docker/php.ini /usr/local/etc/php/conf.d/zz-render.ini

ENV APP_ENV=prod
ENV APP_DEBUG=0

# composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# install vendors
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

# nginx conf
COPY docker/nginx.conf.template /etc/nginx/http.d/default.conf.template

RUN mkdir -p /run/nginx && chown -R nginx:nginx /run/nginx

# permissions
RUN mkdir -p var && chown -R www-data:www-data var

# entrypoint (migrations on startup)
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
