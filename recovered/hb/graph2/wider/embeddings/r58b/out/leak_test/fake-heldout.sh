W=C:/x/hb/graph2/build
docker run --rm -v $W/sealed/refs:/s:ro -v $W/tasks/tasks.jsonl:/t:ro img true
