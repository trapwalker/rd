#! /bin/sh

echo '------------------------------------'
echo `date --rfc-3339=seconds`
cd /home/sl/sublayers

REV1=`hg identify | awk '{print $1}'`

hg pull
hg update release -C

REV2=`hg identify | awk '{print $1}'`

[ "$REV1" = "$REV2" ] && echo 'no changes' || service sl restart
