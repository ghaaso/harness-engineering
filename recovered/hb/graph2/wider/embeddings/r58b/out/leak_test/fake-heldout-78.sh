W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
S=$W/r58b/out/fstage
RUN="docker run -d --name kge-H1 \
 -v $S/facts:/gt/facts:ro -v $S/common:/gt/common:ro img true"
