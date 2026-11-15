import sys
p = sys.argv[1]; s = open(p).read()
a = 'mkdir -p "$TRAINB/stageB/tables" 2>/dev/null || mkdir -p "$(echo "$TRAINW" | sed \'s|^\([A-Za-z]\):|/\L\1|\')/stageB/tables"\n'
assert s.count(a) == 1, 'mk'
s = s.replace(a, 'mkdir -p "$TRAINB/stageB/tables" || fail 40 "cannot create $TRAINB/stageB/tables"\n')
a = "others=$(docker ps --format '{{.Names}}' | grep -E '^(kge-|ktest-)' | tr '\n' ' ')\n"
assert s.count(a) == 1, 'others'
s = s.replace(a, "others=$(docker ps --format '{{.Names}}' | grep -E '^(kge-|ktest-)' | grep -vE \"^(${EOR_TEST_IGNORE:-})\$\" | tr '\n' ' ')\n")
a = "#   EOR_LOGDIR (C:/ form, inside the lane root)  EOR_NAME (ktest-N)  EOR_TIMEOUT (s, default 3000)  EOR_MEM_TRIES\n"
assert s.count(a) == 1, 'doc'
s = s.replace(a, a + "#   EOR_TEST_IGNORE  (plumbing test ONLY: a container name the copy's run may ignore, i.e. the real kge-B1, which a\n#                    test never touches; the real run leaves it unset, so a running kge-B1 always stops step 1)\n")
open(p, 'w', newline='\n').write(s); print('ok')
