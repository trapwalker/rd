#! /bin/sh

BRANCHE=test
SUFFIX='_test'


echo '------------------------------------'
echo `date --rfc-3339=seconds`
cd /home/sl/sublayers$SUFFIX

REV1=`hg identify | awk '{print $1}'`
REV1w=`hg identify sublayers_server/world | awk '{print $1}'`

hg pull
hg update @BRANCHE

cd world

hg pull
hg update @BRANCHE

cd ..

REV2=`hg identify | awk '{print $1}'`
REV2w==`hg identify sublayers_server/world | awk '{print $1}'`

[ "$REV1" = "$REV2" ] || echo "Server source changed: $REV1 != $REV2"
[ "$REV1w" = "$REV2w" ] || echo "Server world changed: $REV1w != $REV2w"

[ "$REV1" = "$REV2" ] && [ "$REV1w" = "$REV2w" ] && echo 'no changes' || service sl$SUFFIX restart
