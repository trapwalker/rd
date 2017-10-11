
# Первичная настройка сервера (ubuntu)

## Создание пользователя

- useradd sl
- usermod -aG sudo sl  ## useradd sl sudo

## Создание SWAP-файла

- sudo -s
- fallocate -l 1024M /root/swapfile
- chmod 600 /root/swapfile
- mkswap /root/swapfile
- swapon /root/swapfile
- echo >> /etc/fstab
- echo /root/swapfile   none    swap    sw    0   0 >> /etc/fstab
- reboot

## Установка пакетов (от имени пользователя "sl")

- apt update
- apt upgrade -y
- apt install -y  mc python python-pip mercurial htop nginx mongodb
- pip install --upgrade pip

## Deploy server soft

- ssh-keygen -f ~/.ssh/rd -C "rd" 
- cat ~/.ssh/rd.pub
- echo                                      >> ~/.ssh/config
- echo Host bitbucket.org                   >> ~/.ssh/config
- echo   HostName bitbucket.org             >> ~/.ssh/config
- echo   PreferredAuthentications publickey >> ~/.ssh/config
- echo   IdentityFile ~/.ssh/rd             >> ~/.ssh/config
- echo "Зарегистрируйте этот публичный ключ в настройках репозиториев на bitbucket"
- echo "здесь   https://bitbucket.org/ANTiPodec/sublayers_world/admin/access-keys/"
- echo "и здесь https://bitbucket.org/ANTiPodec/sublayers/admin/access-keys/"

- hg clone ssh://hg@bitbucket.org/ANTiPodec/sublayers ~/rd
- hg clone ssh://hg@bitbucket.org/ANTiPodec/sublayers_world ~/rd/sublayers_world

- hg clone https://bitbucket.org/svp/flatcraft ~/flatcraft
- mkdir -p ~/rd/sublayers_common/static/ab-test/zoom
- ln -s ~/flatcraft/client/test_page ~/rd/sublayers_common/static/ab-test/zoom/svp

- ln -s ~/rd/sublayers_server/_stat ~/rd/sublayers_common/static/stat
- ln -s ~/rd/sublayers_server/log ~/rd/sublayers_common/static/log


## Установка monitorix

- sudo -s
- echo >> /etc/apt/sources.list
- echo deb http://apt.izzysoft.de/ubuntu generic universe >> /etc/apt/sources.list
- wget http://apt.izzysoft.de/izzysoft.asc && apt-key add izzysoft.asc && rm izzysoft.asc
- apt update && apt install -y  monitorix
- cp ~/rd/deploy/conf/etc/monitorix/monitorix.conf /etc/monitorix/monitorix.conf
- service monitorix restart
- echo "Теперь мониторинг доступен по ссылке http://127.0.0.1:8080/monitorix"


## Настройка nginx

- sudo -s
- echo "set \$rd_main_folder /home/sl/rd;" > /etc/nginx/rd_project_path.conf
- rm /etc/nginx/sites-enabled/default
- ln -s ~/rd/nginx_conf/sites-available/rd.conf /etc/nginx/sites-available/
- ln -s /etc/nginx/sites-available/rd.conf /etc/nginx/sites-enabled/
- touch /etc/nginx/ssl.conf
- touch /etc/nginx/ssl_redirect.conf
- nginx -t
- service nginx restart
- exit

## Настройка roaddogs

- cd ~/rd
- sudo pip install -r requirements.txt --upgrade
- sudo ln -s /home/sl/rd/deploy/srvcon /usr/bin/s

# Полезные команды

- free -h  # Показать использование оперативной памяти
- df -h    # Показать список разделов, занятое и свободное место на них
- rsync -zaP sl@eu.roaddogs.online:/home/sl/rd/sublayers_world/tiles/ /home/sl/rd/sublayers_world/tiles/  # -nvi - тестовый режим
