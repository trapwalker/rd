#! /bin/sh

echo 0.`hg log -b release | grep changeset | wc -l`.`hg log -b default | grep changeset | wc -l`
