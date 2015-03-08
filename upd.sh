#! /bin/sh

cd /home/sl/sublayers

REV1=`hg identify | awk '{print $1}'`

hg pull
hg update

REV2=`hg identify | awk '{print $1}'`

[ "$REV1" = "$REV2" ] && echo 'no changes' || echo 'update'
