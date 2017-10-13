
# Install certbot #

Get from [https://certbot.eff.org/all-instructions/#ubuntu-16-04-xenial-nginx]

    $ sudo -s
    $ apt-get install software-properties-common && add-apt-repository ppa:certbot/certbot && apt-get update && apt-get install -y python-certbot-nginx
    $ exit


Get started:

    $ sudo certbot --nginx


Need to seccure backup of /etc/letsencrypt folder.

Use special command to update settings without nginx configuration:

    $ sudo certbot --nginx certonly --email svpmailbox@gmail.com -d test.roaddogs.online

# Automating renewal #

Test running:

    $ sudo certbot renew --dry-run

Command to crontab

    certbot renew


