
echo >> /etc/apt/sources.list
echo deb http://apt.izzysoft.de/ubuntu generic universe >> /etc/apt/sources.list
apt-key add izzysoft.key
apt update
apt install monitorix
