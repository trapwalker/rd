#! /bin/sh

echo '------------------------------------'
echo `date --rfc-3339=seconds`
cd /home/sl/sublayers_test

REV1=`hg identify | awk '{print $1}'`

hg pull
hg update default

REV2=`hg identify | awk '{print $1}'`

[ "$REV1" = "$REV2" ] && echo 'no changes' || service sl_test restart
