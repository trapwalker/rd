#! /bin/sh

SUFFIX=''

PTH=/home/sl/sublayers$SUFFIX
PTHW=$PTH/sublayers_server/world

echo `date --rfc-3339=seconds` Start update of $PTH

REV1=`hg identify -R $PTH | awk '{print $1}'`
REV1w=`hg identify -R $PTHW | awk '{print $1}'`
echo `date --rfc-3339=seconds` repo: $PTH revisions: [$REV1] [$REV1w]

hg pull -u -R $PTH
hg pull -u -R $PTHW

REV2=`hg identify -R $PTH | awk '{print $1}'`
REV2w=`hg identify -R $PTHW | awk '{print $1}'`
echo `date --rfc-3339=seconds` repo: $PTH new_revisions: [$REV2] [$REV2w]

[ "$REV1" = "$REV2" ] || echo "Server source changed: $REV1 != $REV2"
[ "$REV1w" = "$REV2w" ] || echo "Server world changed: $REV1w != $REV2w"
[ "$REV1" = "$REV2" ] && [ "$REV1w" = "$REV2w" ] && echo 'no changes' || service sl$SUFFIX restart
