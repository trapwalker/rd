
# Install certbot #

Get from [https://certbot.eff.org/all-instructions/#ubuntu-16-04-xenial-nginx]

    $ sudo apt-get update
    $ sudo apt-get install software-properties-common
    $ sudo add-apt-repository ppa:certbot/certbot
    $ sudo apt-get update
    $ sudo apt-get install python-certbot-nginx 


Get started:

    $ sudo certbot --nginx


Need to seccure backup of /etc/letsencrypt folder.

Use special command to update settings without nginx configuration:

    $ sudo certbot --nginx certonly

# Automating renewal #

Test running:

    $ sudo certbot renew --dry-run

Command to crontab

    certbot renew


