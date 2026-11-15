#!/bin/bash
# Audit-selection lane, check 5: three from-scratch store builds of one graph arm, the frozen
# configuration (hops=4, hash 6b70cc1222745385) on 30 seeded random TUNE T1 tasks each time; for
# LadybugDB also the configuration that reads the stored community prior (hybrid ppr+x_comm).
# Each build gets an empty store folder on the container filesystem; the LadybugDB prior folder is a
# copy in /tmp, so a build could never write into arms/ladybug/priors.
#   bash run_repro.sh <arm>
ARM=$1
T=/build/tmp/audit-selection
export GT_BUILD=/build GT_REPO=/repo GT_SRCSTORE=/tmp/src GT_TMP=/tmp/gt
mkdir -p $GT_SRCSTORE $GT_TMP $T/repro
if [ "$ARM" = ladybug ]; then cp -r /build/arms/ladybug/priors /tmp/priors; export LB_PRIORS_DIR=/tmp/priors; ls /tmp/priors | wc -l > $T/repro/ladybug.priors_before.txt; fi
cd /build
for K in 1 2 3; do
  export GT_STORE=/tmp/store$K
  rm -rf $GT_STORE; mkdir -p $GT_STORE
  S=$(date +%s)
  node arms/common/run.js run --arm $ARM --config hops=4 --sets T1 --split tune --tasks-file $T/repro30.txt --out $T/repro/$ARM/b$K >> $T/repro/$ARM.log 2>&1
  if [ "$ARM" = ladybug ]; then
    node arms/common/run.js run --arm $ARM --config "s2 hops=null native rank=hybrid ppr+x_comm" --sets T1 --split tune --tasks-file $T/repro30.txt --out $T/repro/$ARM/b$K >> $T/repro/$ARM.log 2>&1
  fi
  echo "build $K exit $? wall $(( $(date +%s) - S )) s store $(du -sh $GT_STORE | cut -f1)" >> $T/repro/$ARM.log
done
if [ "$ARM" = ladybug ]; then ls /tmp/priors | wc -l > $T/repro/ladybug.priors_after.txt; diff -r /build/arms/ladybug/priors /tmp/priors > $T/repro/ladybug.priors_diff.txt; echo "priors diff exit $?" >> $T/repro/$ARM.log; fi
tail -4 $T/repro/$ARM.log
