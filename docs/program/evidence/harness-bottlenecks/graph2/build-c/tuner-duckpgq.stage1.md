# duckpgq: stage-1 TUNE score table (aggregates only)

List hash 0cef37d35583a845; 40 configurations; sets T1 (388 tasks, 65 commits), T1x (144 tasks, 17 commits), T2 (240 tasks, 47 commits). Scored by the grader with arms/common/score.js, rule content.

Columns: **primary** = recall of the reference files and definitions shown in the 8,000-token answer (0 to 1), averaged per commit; **se** = its standard error over commits; **r2k/r4k/r16k** = the same recall at 2,000, 4,000 and 16,000 tokens; **auc** = area under recall against tokens up to 16,000 (0 to 1); **def** = definition-only recall at 8,000; **fr10** = share of reference files among the first 10 distinct files; **ndcg** = nDCG@10 over files; **mrr** = reciprocal rank of the first reference file; **tok** = median tokens used by the 8,000-token answer; **t80** = median tokens of whole items until recall reaches 0.8 (16,000 when never reached); **ms** = median engine milliseconds per query; **cx** = complexity (addendum 3 item 10: ranking parts, +1 each for budget or metapath traversal, unbounded or more than 3 hops, hub cut, padding, symbol granularity, engine-only native mode; for search: +rounds beyond the first, routes, BM25, import following, padding, symbol granularity). Paths and range forms have no primary (scored on file ranking only).

## T1

| name | cx | primary | se | r2k | r4k | r16k | auc | def | fr10 | ndcg | mrr | tok | t80 | ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| base | 1 | 0.664 | 0.033 | 0.478 | 0.608 | 0.680 | 0.593 | 0.622 | 0.512 | 0.467 | 0.602 | 5010 | 16000 | 52.3 |
| hops=1 | 1 | 0.438 | 0.036 | 0.371 | 0.428 | 0.438 | 0.401 | 0.432 | 0.416 | 0.408 | 0.585 | 1877 | 16000 | 47.7 |
| hops=3 | 1 | 0.727 | 0.030 | 0.489 | 0.630 | 0.765 | 0.643 | 0.681 | 0.517 | 0.470 | 0.604 | 7998 | 8550 | 50.0 |
| hops=4 | 2 | 0.768 | 0.026 | 0.490 | 0.645 | 0.831 | 0.678 | 0.721 | 0.525 | 0.473 | 0.606 | 7999 | 7212 | 53.5 |
| hops=null | 2 | 0.784 | 0.025 | 0.490 | 0.646 | 0.870 | 0.694 | 0.737 | 0.525 | 0.473 | 0.606 | 7999 | 6294 | 70.5 |
| budget=B1 | 3 | 0.779 | 0.026 | 0.490 | 0.647 | 0.861 | 0.690 | 0.734 | 0.526 | 0.473 | 0.606 | 7999 | 6374 | 98.8 |
| metapath=defs>code1-2>tests | 3 | 0.615 | 0.034 | 0.450 | 0.567 | 0.625 | 0.549 | 0.579 | 0.461 | 0.412 | 0.533 | 4623 | 16000 | 70.1 |
| dir=dependents | 1 | 0.449 | 0.036 | 0.354 | 0.423 | 0.459 | 0.407 | 0.437 | 0.419 | 0.382 | 0.502 | 3162 | 16000 | 39.8 |
| dir=dependencies | 1 | 0.460 | 0.036 | 0.353 | 0.431 | 0.465 | 0.414 | 0.448 | 0.389 | 0.332 | 0.443 | 3380 | 16000 | 45.7 |
| classes=structure+imports+calls | 1 | 0.599 | 0.034 | 0.448 | 0.559 | 0.605 | 0.537 | 0.568 | 0.467 | 0.410 | 0.527 | 4091 | 16000 | 42.8 |
| classes=code (no history) | 1 | 0.609 | 0.034 | 0.452 | 0.564 | 0.614 | 0.544 | 0.576 | 0.473 | 0.422 | 0.555 | 4220 | 16000 | 48.2 |
| classes=base+capability | 1 | 0.663 | 0.033 | 0.477 | 0.608 | 0.680 | 0.592 | 0.621 | 0.511 | 0.467 | 0.602 | 5010 | 16000 | 49.5 |
| classes=base+capability+docs | 1 | 0.666 | 0.033 | 0.477 | 0.610 | 0.683 | 0.595 | 0.625 | 0.512 | 0.463 | 0.601 | 5185 | 16000 | 50.8 |
| minConf=0 | 1 | 0.666 | 0.033 | 0.478 | 0.608 | 0.684 | 0.595 | 0.624 | 0.512 | 0.467 | 0.602 | 5889 | 16000 | 48.5 |
| minConf=1 | 1 | 0.636 | 0.035 | 0.464 | 0.588 | 0.645 | 0.568 | 0.596 | 0.504 | 0.461 | 0.596 | 4564 | 16000 | 48.4 |
| rank=bfs | 1 | 0.651 | 0.033 | 0.490 | 0.598 | 0.680 | 0.587 | 0.608 | 0.503 | 0.387 | 0.436 | 5010 | 16000 | 26.0 |
| rank=degnorm | 1 | 0.665 | 0.033 | 0.499 | 0.616 | 0.680 | 0.597 | 0.623 | 0.509 | 0.446 | 0.566 | 5010 | 16000 | 37.6 |
| rank=ppr r0.15 | 1 | 0.662 | 0.033 | 0.465 | 0.595 | 0.680 | 0.588 | 0.620 | 0.513 | 0.469 | 0.595 | 5010 | 16000 | 48.6 |
| rank=ppr r0.50 | 1 | 0.665 | 0.033 | 0.491 | 0.610 | 0.680 | 0.595 | 0.623 | 0.515 | 0.460 | 0.590 | 5010 | 16000 | 49.0 |
| rank=ppr w3 | 1 | 0.655 | 0.034 | 0.481 | 0.607 | 0.680 | 0.590 | 0.613 | 0.520 | 0.469 | 0.595 | 5010 | 16000 | 49.7 |
| rank=cochange | 1 | 0.651 | 0.033 | 0.494 | 0.596 | 0.680 | 0.588 | 0.609 | 0.527 | 0.451 | 0.546 | 5010 | 16000 | 28.7 |
| rank=text | 1 | 0.660 | 0.033 | 0.484 | 0.597 | 0.680 | 0.590 | 0.618 | 0.510 | 0.423 | 0.540 | 5010 | 16000 | 32.6 |
| rank=hybrid ppr+text | 2 | 0.661 | 0.033 | 0.482 | 0.615 | 0.680 | 0.594 | 0.619 | 0.550 | 0.476 | 0.612 | 5010 | 16000 | 64.7 |
| hub=indeg>5 | 2 | 0.599 | 0.034 | 0.482 | 0.585 | 0.607 | 0.546 | 0.560 | 0.516 | 0.454 | 0.590 | 3181 | 16000 | 53.1 |
| hub=indeg>10 | 2 | 0.635 | 0.033 | 0.491 | 0.606 | 0.648 | 0.575 | 0.593 | 0.523 | 0.463 | 0.591 | 4115 | 16000 | 51.7 |
| hub=transport | 2 | 0.665 | 0.033 | 0.478 | 0.609 | 0.680 | 0.593 | 0.623 | 0.510 | 0.464 | 0.596 | 5010 | 16000 | 52.5 |
| pad=DIR | 2 | 0.764 | 0.026 | 0.490 | 0.646 | 0.859 | 0.684 | 0.719 | 0.531 | 0.474 | 0.606 | 7999 | 7417 | 52.3 |
| pad=CO | 2 | 0.771 | 0.025 | 0.491 | 0.652 | 0.867 | 0.690 | 0.727 | 0.533 | 0.476 | 0.607 | 7999 | 7111 | 52.3 |
| gran=symbol | 2 | 0.518 | 0.035 | 0.434 | 0.501 | 0.519 | 0.472 | 0.525 | 0.433 | 0.335 | 0.384 | 2651 | 16000 | 52.3 |
| form=paths | 1 | - | - | - | - | - | - | - | 0.512 | 0.467 | 0.602 | 385 | 16000 | 52.3 |
| form=snippet | 1 | 0.363 | 0.032 | 0.206 | 0.278 | 0.501 | 0.339 | 0.378 | 0.473 | 0.444 | 0.596 | 7999 | 16000 | 52.3 |
| native: rank=pagerank (duckpgq global) | 2 | 0.615 | 0.035 | 0.325 | 0.499 | 0.678 | 0.535 | 0.574 | 0.435 | 0.353 | 0.451 | 5010 | 16000 | 30.9 |
| native: rank=ppr lifted by pagerank^0.5 | 3 | 0.660 | 0.034 | 0.500 | 0.617 | 0.680 | 0.596 | 0.618 | 0.512 | 0.440 | 0.554 | 5010 | 16000 | 50.2 |
| native: rank=x_wsp (LadybugDB class costs) | 2 | 0.653 | 0.033 | 0.467 | 0.582 | 0.680 | 0.582 | 0.614 | 0.480 | 0.390 | 0.469 | 5010 | 16000 | 61.9 |
| native: rank=x_wsp, kind costs B | 2 | 0.649 | 0.034 | 0.487 | 0.597 | 0.680 | 0.586 | 0.607 | 0.518 | 0.430 | 0.524 | 5010 | 16000 | 65.3 |
| native: rank=hybrid ppr+x_wsp | 3 | 0.649 | 0.034 | 0.480 | 0.599 | 0.680 | 0.586 | 0.608 | 0.521 | 0.452 | 0.570 | 5010 | 16000 | 93.9 |
| native: rank=ppr + wcc community prior | 3 | 0.661 | 0.033 | 0.473 | 0.604 | 0.680 | 0.590 | 0.618 | 0.493 | 0.452 | 0.599 | 5010 | 16000 | 52.0 |
| native: hub=pagerank top 50 not expanded | 2 | 0.618 | 0.033 | 0.463 | 0.573 | 0.626 | 0.553 | 0.581 | 0.494 | 0.457 | 0.601 | 4041 | 16000 | 51.6 |
| metapath=defs>code0-1>http1-2>code0-1 | 3 | 0.360 | 0.031 | 0.321 | 0.353 | 0.360 | 0.331 | 0.368 | 0.334 | 0.331 | 0.507 | 1979 | 16000 | 76.8 |
| metapath=defs>code1>history0-1 | 2 | 0.461 | 0.034 | 0.377 | 0.438 | 0.464 | 0.418 | 0.452 | 0.415 | 0.405 | 0.562 | 2711 | 16000 | 62.7 |

## T1x

| name | cx | primary | se | r2k | r4k | r16k | auc | def | fr10 | ndcg | mrr | tok | t80 | ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| base | 1 | 0.447 | 0.042 | 0.273 | 0.383 | 0.476 | 0.393 | 0.439 | 0.337 | 0.382 | 0.629 | 6290 | 16000 | 52.1 |
| hops=1 | 1 | 0.308 | 0.036 | 0.236 | 0.299 | 0.308 | 0.278 | 0.300 | 0.291 | 0.348 | 0.624 | 2453 | 16000 | 51.9 |
| hops=3 | 1 | 0.486 | 0.043 | 0.280 | 0.398 | 0.561 | 0.432 | 0.469 | 0.341 | 0.385 | 0.631 | 7999 | 16000 | 53.4 |
| hops=4 | 2 | 0.530 | 0.044 | 0.281 | 0.406 | 0.666 | 0.476 | 0.516 | 0.342 | 0.386 | 0.632 | 7999 | 16000 | 59.1 |
| hops=null | 2 | 0.592 | 0.055 | 0.281 | 0.410 | 0.810 | 0.537 | 0.579 | 0.342 | 0.386 | 0.632 | 7999 | 15400 | 74.4 |
| budget=B1 | 3 | 0.574 | 0.051 | 0.281 | 0.412 | 0.778 | 0.522 | 0.565 | 0.343 | 0.386 | 0.632 | 7999 | 15753 | 116.2 |
| metapath=defs>code1-2>tests | 3 | 0.404 | 0.039 | 0.269 | 0.358 | 0.424 | 0.358 | 0.394 | 0.317 | 0.342 | 0.536 | 5575 | 16000 | 74.1 |
| dir=dependents | 1 | 0.341 | 0.048 | 0.206 | 0.300 | 0.353 | 0.298 | 0.332 | 0.276 | 0.338 | 0.583 | 4310 | 16000 | 42.5 |
| dir=dependencies | 1 | 0.352 | 0.046 | 0.214 | 0.292 | 0.361 | 0.304 | 0.345 | 0.254 | 0.272 | 0.437 | 4703 | 16000 | 49.0 |
| classes=structure+imports+calls | 1 | 0.370 | 0.041 | 0.257 | 0.338 | 0.380 | 0.329 | 0.366 | 0.307 | 0.333 | 0.528 | 4730 | 16000 | 45.9 |
| classes=code (no history) | 1 | 0.395 | 0.039 | 0.275 | 0.358 | 0.406 | 0.351 | 0.389 | 0.325 | 0.355 | 0.567 | 4947 | 16000 | 50.3 |
| classes=base+capability | 1 | 0.446 | 0.042 | 0.273 | 0.384 | 0.476 | 0.393 | 0.438 | 0.338 | 0.382 | 0.628 | 6290 | 16000 | 51.3 |
| classes=base+capability+docs | 1 | 0.452 | 0.042 | 0.278 | 0.386 | 0.482 | 0.397 | 0.446 | 0.333 | 0.378 | 0.629 | 6604 | 16000 | 54.2 |
| minConf=0 | 1 | 0.450 | 0.043 | 0.273 | 0.384 | 0.494 | 0.398 | 0.442 | 0.337 | 0.382 | 0.629 | 7996 | 16000 | 52.4 |
| minConf=1 | 1 | 0.402 | 0.039 | 0.267 | 0.366 | 0.415 | 0.356 | 0.397 | 0.328 | 0.377 | 0.634 | 5470 | 16000 | 52.0 |
| rank=bfs | 1 | 0.448 | 0.043 | 0.280 | 0.382 | 0.475 | 0.394 | 0.440 | 0.333 | 0.316 | 0.416 | 6290 | 16000 | 28.2 |
| rank=degnorm | 1 | 0.452 | 0.043 | 0.288 | 0.380 | 0.478 | 0.396 | 0.445 | 0.332 | 0.367 | 0.582 | 6290 | 16000 | 40.4 |
| rank=ppr r0.15 | 1 | 0.444 | 0.042 | 0.274 | 0.377 | 0.476 | 0.390 | 0.436 | 0.335 | 0.378 | 0.617 | 6290 | 16000 | 51.9 |
| rank=ppr r0.50 | 1 | 0.449 | 0.043 | 0.272 | 0.384 | 0.476 | 0.393 | 0.441 | 0.339 | 0.377 | 0.610 | 6290 | 16000 | 53.1 |
| rank=ppr w3 | 1 | 0.449 | 0.043 | 0.273 | 0.387 | 0.477 | 0.394 | 0.441 | 0.333 | 0.383 | 0.628 | 6290 | 16000 | 51.1 |
| rank=cochange | 1 | 0.449 | 0.043 | 0.290 | 0.380 | 0.475 | 0.395 | 0.441 | 0.333 | 0.361 | 0.562 | 6290 | 16000 | 31.0 |
| rank=text | 1 | 0.450 | 0.043 | 0.239 | 0.357 | 0.476 | 0.385 | 0.438 | 0.306 | 0.320 | 0.526 | 6290 | 16000 | 32.6 |
| rank=hybrid ppr+text | 2 | 0.448 | 0.043 | 0.264 | 0.369 | 0.476 | 0.389 | 0.439 | 0.342 | 0.381 | 0.637 | 6290 | 16000 | 68.8 |
| hub=indeg>5 | 2 | 0.373 | 0.040 | 0.265 | 0.356 | 0.373 | 0.333 | 0.365 | 0.329 | 0.368 | 0.607 | 3805 | 16000 | 53.0 |
| hub=indeg>10 | 2 | 0.425 | 0.040 | 0.267 | 0.373 | 0.438 | 0.372 | 0.417 | 0.322 | 0.365 | 0.602 | 4781 | 16000 | 54.2 |
| hub=transport | 2 | 0.448 | 0.043 | 0.270 | 0.384 | 0.476 | 0.393 | 0.441 | 0.335 | 0.376 | 0.618 | 6290 | 16000 | 53.7 |
| pad=DIR | 2 | 0.574 | 0.054 | 0.283 | 0.416 | 0.767 | 0.520 | 0.569 | 0.339 | 0.383 | 0.630 | 7999 | 13351 | 52.1 |
| pad=CO | 2 | 0.603 | 0.051 | 0.277 | 0.424 | 0.797 | 0.539 | 0.601 | 0.340 | 0.384 | 0.632 | 7999 | 12009 | 52.1 |
| gran=symbol | 2 | 0.355 | 0.035 | 0.286 | 0.331 | 0.356 | 0.320 | 0.349 | 0.294 | 0.271 | 0.384 | 3579 | 16000 | 52.1 |
| form=paths | 1 | - | - | - | - | - | - | - | 0.337 | 0.382 | 0.629 | 432 | 16000 | 52.1 |
| form=snippet | 1 | 0.225 | 0.032 | 0.110 | 0.168 | 0.317 | 0.209 | 0.225 | 0.303 | 0.352 | 0.626 | 7999 | 16000 | 52.1 |
| native: rank=pagerank (duckpgq global) | 2 | 0.422 | 0.040 | 0.213 | 0.336 | 0.476 | 0.367 | 0.417 | 0.303 | 0.282 | 0.384 | 6290 | 16000 | 31.2 |
| native: rank=ppr lifted by pagerank^0.5 | 3 | 0.448 | 0.042 | 0.274 | 0.384 | 0.476 | 0.393 | 0.440 | 0.325 | 0.356 | 0.586 | 6290 | 16000 | 52.5 |
| native: rank=x_wsp (LadybugDB class costs) | 2 | 0.436 | 0.040 | 0.279 | 0.369 | 0.475 | 0.386 | 0.431 | 0.333 | 0.325 | 0.450 | 6290 | 16000 | 73.6 |
| native: rank=x_wsp, kind costs B | 2 | 0.442 | 0.042 | 0.283 | 0.380 | 0.477 | 0.392 | 0.434 | 0.324 | 0.349 | 0.566 | 6290 | 16000 | 75.1 |
| native: rank=hybrid ppr+x_wsp | 3 | 0.441 | 0.041 | 0.285 | 0.376 | 0.476 | 0.390 | 0.433 | 0.344 | 0.382 | 0.617 | 6290 | 16000 | 112.2 |
| native: rank=ppr + wcc community prior | 3 | 0.443 | 0.042 | 0.269 | 0.363 | 0.476 | 0.387 | 0.434 | 0.312 | 0.363 | 0.629 | 6290 | 16000 | 53.3 |
| native: hub=pagerank top 50 not expanded | 2 | 0.401 | 0.040 | 0.265 | 0.356 | 0.416 | 0.354 | 0.395 | 0.320 | 0.371 | 0.628 | 5021 | 16000 | 54.4 |
| metapath=defs>code0-1>http1-2>code0-1 | 3 | 0.313 | 0.035 | 0.245 | 0.303 | 0.315 | 0.284 | 0.319 | 0.278 | 0.307 | 0.528 | 2209 | 16000 | 80.2 |
| metapath=defs>code1>history0-1 | 2 | 0.356 | 0.042 | 0.244 | 0.321 | 0.360 | 0.314 | 0.346 | 0.302 | 0.346 | 0.582 | 3847 | 16000 | 65.5 |

## T2

| name | cx | primary | se | r2k | r4k | r16k | auc | def | fr10 | ndcg | mrr | tok | t80 | ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| base | 1 | 0.677 | 0.035 | 0.418 | 0.571 | 0.706 | 0.590 | 0.662 | 0.477 | 0.334 | 0.367 | 5869 | 8535 | 51.2 |
| hops=1 | 1 | 0.463 | 0.041 | 0.352 | 0.442 | 0.463 | 0.416 | 0.442 | 0.431 | 0.318 | 0.357 | 2287 | 16000 | 50.0 |
| hops=3 | 1 | 0.769 | 0.036 | 0.422 | 0.593 | 0.837 | 0.662 | 0.761 | 0.479 | 0.335 | 0.369 | 7999 | 6060 | 53.6 |
| hops=4 | 2 | 0.808 | 0.032 | 0.425 | 0.616 | 0.912 | 0.700 | 0.808 | 0.481 | 0.335 | 0.371 | 7999 | 5586 | 53.9 |
| hops=null | 2 | 0.845 | 0.028 | 0.425 | 0.623 | 0.974 | 0.730 | 0.829 | 0.481 | 0.335 | 0.372 | 7999 | 5499 | 70.5 |
| budget=B1 | 3 | 0.839 | 0.028 | 0.425 | 0.623 | 0.963 | 0.725 | 0.832 | 0.481 | 0.335 | 0.372 | 7999 | 5619 | 104.2 |
| metapath=defs>code1-2>tests | 3 | 0.660 | 0.036 | 0.411 | 0.551 | 0.690 | 0.575 | 0.690 | 0.406 | 0.291 | 0.332 | 5368 | 16000 | 70.8 |
| dir=dependents | 1 | 0.603 | 0.040 | 0.450 | 0.559 | 0.622 | 0.543 | 0.605 | 0.530 | 0.388 | 0.436 | 3868 | 16000 | 41.5 |
| dir=dependencies | 1 | 0.402 | 0.054 | 0.192 | 0.345 | 0.404 | 0.341 | 0.405 | 0.304 | 0.136 | 0.085 | 3622 | 16000 | 46.4 |
| classes=structure+imports+calls | 1 | 0.594 | 0.039 | 0.401 | 0.531 | 0.598 | 0.522 | 0.616 | 0.401 | 0.292 | 0.339 | 4650 | 16000 | 43.6 |
| classes=code (no history) | 1 | 0.605 | 0.038 | 0.403 | 0.518 | 0.608 | 0.526 | 0.629 | 0.402 | 0.289 | 0.329 | 4804 | 16000 | 48.5 |
| classes=base+capability | 1 | 0.669 | 0.035 | 0.416 | 0.572 | 0.706 | 0.587 | 0.651 | 0.477 | 0.333 | 0.367 | 5869 | 8689 | 50.8 |
| classes=base+capability+docs | 1 | 0.671 | 0.035 | 0.411 | 0.570 | 0.706 | 0.586 | 0.655 | 0.460 | 0.324 | 0.362 | 6038 | 8707 | 52.1 |
| minConf=0 | 1 | 0.679 | 0.035 | 0.418 | 0.571 | 0.713 | 0.592 | 0.663 | 0.477 | 0.334 | 0.367 | 6616 | 8219 | 51.2 |
| minConf=1 | 1 | 0.661 | 0.037 | 0.418 | 0.565 | 0.668 | 0.573 | 0.648 | 0.477 | 0.338 | 0.375 | 5272 | 16000 | 51.0 |
| rank=bfs | 1 | 0.647 | 0.036 | 0.302 | 0.522 | 0.705 | 0.555 | 0.622 | 0.421 | 0.194 | 0.133 | 5869 | 9333 | 27.0 |
| rank=degnorm | 1 | 0.660 | 0.036 | 0.383 | 0.559 | 0.707 | 0.577 | 0.640 | 0.435 | 0.243 | 0.214 | 5869 | 9441 | 40.7 |
| rank=ppr r0.15 | 1 | 0.674 | 0.035 | 0.443 | 0.563 | 0.706 | 0.590 | 0.659 | 0.479 | 0.336 | 0.371 | 5869 | 8492 | 51.4 |
| rank=ppr r0.50 | 1 | 0.676 | 0.035 | 0.412 | 0.570 | 0.706 | 0.588 | 0.663 | 0.476 | 0.325 | 0.354 | 5869 | 8709 | 50.8 |
| rank=ppr w3 | 1 | 0.668 | 0.035 | 0.454 | 0.587 | 0.706 | 0.594 | 0.654 | 0.495 | 0.338 | 0.362 | 5869 | 8742 | 51.5 |
| rank=cochange | 1 | 0.657 | 0.035 | 0.369 | 0.541 | 0.705 | 0.570 | 0.635 | 0.463 | 0.254 | 0.211 | 5869 | 8704 | 30.4 |
| rank=text | 1 | 0.662 | 0.034 | 0.480 | 0.574 | 0.707 | 0.593 | 0.639 | 0.493 | 0.363 | 0.404 | 5869 | 7719 | 34.3 |
| rank=hybrid ppr+text | 2 | 0.665 | 0.035 | 0.436 | 0.562 | 0.707 | 0.586 | 0.648 | 0.478 | 0.359 | 0.416 | 5869 | 8269 | 67.5 |
| hub=indeg>5 | 2 | 0.583 | 0.037 | 0.428 | 0.546 | 0.583 | 0.520 | 0.566 | 0.459 | 0.324 | 0.355 | 3534 | 16000 | 53.4 |
| hub=indeg>10 | 2 | 0.636 | 0.036 | 0.442 | 0.586 | 0.649 | 0.566 | 0.615 | 0.474 | 0.335 | 0.369 | 4500 | 16000 | 55.6 |
| hub=transport | 2 | 0.677 | 0.035 | 0.419 | 0.572 | 0.706 | 0.590 | 0.661 | 0.480 | 0.335 | 0.368 | 5869 | 8201 | 52.9 |
| pad=DIR | 2 | 0.779 | 0.032 | 0.418 | 0.591 | 0.935 | 0.689 | 0.782 | 0.477 | 0.334 | 0.370 | 7999 | 5744 | 51.2 |
| pad=CO | 2 | 0.809 | 0.032 | 0.420 | 0.599 | 0.956 | 0.707 | 0.800 | 0.477 | 0.334 | 0.371 | 7999 | 5822 | 51.2 |
| gran=symbol | 2 | 0.550 | 0.036 | 0.432 | 0.518 | 0.551 | 0.495 | 0.510 | 0.413 | 0.206 | 0.163 | 3400 | 16000 | 51.2 |
| form=paths | 1 | - | - | - | - | - | - | - | 0.477 | 0.334 | 0.367 | 461 | 16000 | 51.2 |
| form=snippet | 1 | 0.306 | 0.037 | 0.163 | 0.226 | 0.444 | 0.288 | 0.343 | 0.417 | 0.311 | 0.354 | 7999 | 16000 | 51.2 |
| native: rank=pagerank (duckpgq global) | 2 | 0.609 | 0.043 | 0.296 | 0.481 | 0.705 | 0.532 | 0.573 | 0.373 | 0.233 | 0.231 | 5869 | 10612 | 30.4 |
| native: rank=ppr lifted by pagerank^0.5 | 3 | 0.679 | 0.036 | 0.408 | 0.572 | 0.707 | 0.590 | 0.666 | 0.460 | 0.302 | 0.317 | 5869 | 7932 | 52.3 |
| native: rank=x_wsp (LadybugDB class costs) | 2 | 0.644 | 0.035 | 0.308 | 0.524 | 0.706 | 0.555 | 0.629 | 0.415 | 0.194 | 0.139 | 5869 | 9566 | 71.5 |
| native: rank=x_wsp, kind costs B | 2 | 0.647 | 0.037 | 0.385 | 0.539 | 0.707 | 0.568 | 0.625 | 0.477 | 0.258 | 0.216 | 5869 | 9496 | 74.3 |
| native: rank=hybrid ppr+x_wsp | 3 | 0.666 | 0.035 | 0.394 | 0.538 | 0.706 | 0.577 | 0.650 | 0.434 | 0.289 | 0.303 | 5869 | 8228 | 107.3 |
| native: rank=ppr + wcc community prior | 3 | 0.674 | 0.036 | 0.447 | 0.578 | 0.706 | 0.593 | 0.656 | 0.464 | 0.334 | 0.363 | 5869 | 8736 | 52.9 |
| native: hub=pagerank top 50 not expanded | 2 | 0.616 | 0.035 | 0.398 | 0.543 | 0.630 | 0.540 | 0.613 | 0.469 | 0.330 | 0.363 | 4554 | 16000 | 54.9 |
| metapath=defs>code0-1>http1-2>code0-1 | 3 | 0.373 | 0.034 | 0.322 | 0.363 | 0.373 | 0.342 | 0.390 | 0.329 | 0.263 | 0.323 | 2495 | 16000 | 82.1 |
| metapath=defs>code1>history0-1 | 2 | 0.535 | 0.040 | 0.400 | 0.493 | 0.542 | 0.479 | 0.524 | 0.445 | 0.323 | 0.362 | 3402 | 16000 | 64.7 |

## Configurations

- **base** (8067b9cf65e59b2f, complexity 1): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **hops=1** (cf6024d31a3113fe, complexity 1): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":1},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **hops=3** (b4e54ade4ba7fa5d, complexity 1): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":3},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **hops=4** (6b70cc1222745385, complexity 2): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":4},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **hops=null** (731a72f7c8423705, complexity 2): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":null},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **budget=B1** (2fb4d1b30775026a, complexity 3): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"budget","hops":null,"budgets":{"structure":1,"imports":2,"calls":3,"http":1,"tests":1,"data":1,"config":1,"history":1}},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **metapath=defs>code1-2>tests** (fa6d817b34055f2c, complexity 3): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config"],"traversal":{"mode":"metapath","hops":null,"emit":"all","steps":[{"classes":["structure"],"kinds":[],"dir":"out","min":0,"max":1},{"classes":["imports","calls","http","data","config"],"kinds":[],"dir":"both","min":1,"max":2},{"classes":["tests"],"kinds":[],"dir":"in","min":0,"max":1}]},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **dir=dependents** (a2dfe723c71fd4b1, complexity 1): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"dependents","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **dir=dependencies** (be90a0af0eaa5c4c, complexity 1): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"dependencies","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **classes=structure+imports+calls** (746fcb2c080cbe23, complexity 1): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **classes=code (no history)** (5e8e2c2d6eedb164, complexity 1): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **classes=base+capability** (738a573440de7187, complexity 1): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","capability","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **classes=base+capability+docs** (e9bb002931ef06be, complexity 1): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","capability","docs","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **minConf=0** (9ab4a64363e96ca8, complexity 1): `{"granularity":"file","form":"signature","pad":"none","minConf":0,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **minConf=1** (0fda63b3ce4cc71e, complexity 1): `{"granularity":"file","form":"signature","pad":"none","minConf":1,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **rank=bfs** (81242b864ef02594, complexity 1): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"bfs"}}`
- **rank=degnorm** (a17d78f923bf16ba, complexity 1): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"degnorm"}}`
- **rank=ppr r0.15** (42344122b2911ab1, complexity 1): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.15,"cochange_w":1}}`
- **rank=ppr r0.50** (f62dd7448aa9cb2b, complexity 1): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.5,"cochange_w":1}}`
- **rank=ppr w3** (36f3223547569977, complexity 1): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":3}}`
- **rank=cochange** (f9eb0c7f833fabbe, complexity 1): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"cochange"}}`
- **rank=text** (99f5a41fc6504289, complexity 1): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"text"}}`
- **rank=hybrid ppr+text** (b10a83ff6e4a467e, complexity 2): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"hybrid","parts":[{"mode":"ppr","restart":0.3,"cochange_w":1},{"mode":"text"}]}}`
- **hub=indeg>5** (a0cfe5e55790f946, complexity 2): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"indeg","k":5},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **hub=indeg>10** (9047a3d231e52a3b, complexity 2): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"indeg","k":10},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **hub=transport** (d7aca8df31b77b07, complexity 2): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"transport"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **pad=DIR** (91548c419777dbcb, complexity 2): `{"granularity":"file","form":"signature","pad":"DIR","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **pad=CO** (2f2ca0da375cced5, complexity 2): `{"granularity":"file","form":"signature","pad":"CO","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **gran=symbol** (4a391e15daf32a78, complexity 2): `{"granularity":"symbol","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **form=paths** (6ae6adc8a17d7b75, complexity 1): `{"granularity":"file","form":"paths","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **form=snippet** (8ca9932129be7d1f, complexity 1): `{"granularity":"file","form":"snippet","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **native: rank=pagerank (duckpgq global)** (a465fbbe754c3d34, complexity 2): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1,"variant":"duckpgq_global"}}`
- **native: rank=ppr lifted by pagerank^0.5** (1e0a46457719f9be, complexity 3): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"x_ppr_lift","restart":0.3,"cochange_w":1,"beta":0.5}}`
- **native: rank=x_wsp (LadybugDB class costs)** (f141504375c4d747, complexity 2): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"x_wsp"}}`
- **native: rank=x_wsp, kind costs B** (09f05536b8d65b7c, complexity 2): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"x_wsp","kindCosts":{"defines":0.5,"calls":1,"calls_url":1,"registers_route":1,"test_calls_route":1,"co_changed":1,"reads_table":1.5,"writes_table":1.5,"writes_column":1.5,"imports":2,"uses_constant":3,"migration_follows":4,"mentions":4}}}`
- **native: rank=hybrid ppr+x_wsp** (4a968ba760dc5175, complexity 3): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"hybrid","parts":[{"mode":"ppr","restart":0.3,"cochange_w":1},{"mode":"x_wsp"}]}}`
- **native: rank=ppr + wcc community prior** (ea78770a33d2b6bb, complexity 3): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"khop","hops":2},"hub":{"mode":"none"},"rank":{"mode":"x_wcc_prior","k":3,"classes":["calls","http","data"],"ppr":{"mode":"ppr","restart":0.3,"cochange_w":1}}}`
- **native: hub=pagerank top 50 not expanded** (d4dc25610725374d, complexity 2): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","tests","data","config","history"],"traversal":{"mode":"x_khop_prcut","hops":2,"top":50},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **metapath=defs>code0-1>http1-2>code0-1** (3cadc747e51460c5, complexity 3): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http"],"traversal":{"mode":"metapath","hops":null,"emit":"all","steps":[{"classes":["structure"],"kinds":[],"dir":"out","min":0,"max":1},{"classes":["imports","calls"],"kinds":[],"dir":"both","min":0,"max":1},{"classes":["http"],"kinds":[],"dir":"both","min":1,"max":2},{"classes":["imports","calls"],"kinds":[],"dir":"both","min":0,"max":1}]},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
- **metapath=defs>code1>history0-1** (90bb33ba705bc3dd, complexity 2): `{"granularity":"file","form":"signature","pad":"none","minConf":0.5,"direction":"both","classes":["structure","imports","calls","http","data","config","history"],"traversal":{"mode":"metapath","hops":null,"emit":"all","steps":[{"classes":["structure"],"kinds":[],"dir":"out","min":0,"max":1},{"classes":["imports","calls","http","data","config"],"kinds":[],"dir":"both","min":1,"max":1},{"classes":["history"],"kinds":[],"dir":"both","min":0,"max":1}]},"hub":{"mode":"none"},"rank":{"mode":"ppr","restart":0.3,"cochange_w":1}}`
