# search: stage-1 TUNE score table (aggregates only)

List hash ef02c4a27f96928a; 40 configurations; sets T1 (388 tasks, 65 commits), T1x (144 tasks, 17 commits), T2 (240 tasks, 47 commits). Scored by the grader with arms/common/score.js, rule content.

Columns: **primary** = recall of the reference files and definitions shown in the 8,000-token answer (0 to 1), averaged per commit; **se** = its standard error over commits; **r2k/r4k/r16k** = the same recall at 2,000, 4,000 and 16,000 tokens; **auc** = area under recall against tokens up to 16,000 (0 to 1); **def** = definition-only recall at 8,000; **fr10** = share of reference files among the first 10 distinct files; **ndcg** = nDCG@10 over files; **mrr** = reciprocal rank of the first reference file; **tok** = median tokens used by the 8,000-token answer; **t80** = median tokens of whole items until recall reaches 0.8 (16,000 when never reached); **ms** = median engine milliseconds per query; **cx** = complexity (addendum 3 item 10: ranking parts, +1 each for budget or metapath traversal, unbounded or more than 3 hops, hub cut, padding, symbol granularity, engine-only native mode; for search: +rounds beyond the first, routes, BM25, import following, padding, symbol granularity). Paths and range forms have no primary (scored on file ranking only).

## T1

| name | cx | primary | se | r2k | r4k | r16k | auc | def | fr10 | ndcg | mrr | tok | t80 | ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| base | 4 | 0.502 | 0.029 | 0.350 | 0.451 | 0.517 | 0.446 | 0.495 | 0.426 | 0.389 | 0.542 | 4468 | 16000 | 11.0 |
| pad=DIR | 5 | 0.737 | 0.026 | 0.395 | 0.536 | 0.850 | 0.639 | 0.701 | 0.460 | 0.405 | 0.554 | 7999 | 8776 | 11.0 |
| pad=CO | 5 | 0.739 | 0.026 | 0.386 | 0.552 | 0.858 | 0.644 | 0.704 | 0.457 | 0.405 | 0.552 | 7999 | 8460 | 11.0 |
| gran=symbol | 5 | 0.424 | 0.027 | 0.360 | 0.408 | 0.426 | 0.387 | 0.354 | 0.419 | 0.327 | 0.374 | 1720 | 16000 | 11.0 |
| form=paths | 4 | - | - | - | - | - | - | - | 0.426 | 0.389 | 0.542 | 299 | 16000 | 11.0 |
| form=snippet | 4 | 0.280 | 0.024 | 0.135 | 0.204 | 0.382 | 0.256 | 0.275 | 0.383 | 0.366 | 0.537 | 7999 | 16000 | 11.0 |
| gran=symbol form=paths | 5 | - | - | - | - | - | - | - | 0.419 | 0.327 | 0.374 | 944 | 16000 | 11.0 |
| gran=symbol form=snippet | 5 | 0.297 | 0.023 | 0.156 | 0.222 | 0.375 | 0.267 | 0.257 | 0.414 | 0.324 | 0.372 | 7999 | 16000 | 11.0 |
| rounds=1 | 3 | 0.349 | 0.027 | 0.304 | 0.341 | 0.349 | 0.320 | 0.347 | 0.338 | 0.332 | 0.526 | 1870 | 16000 | 2.3 |
| rounds=3 | 5 | 0.551 | 0.029 | 0.370 | 0.481 | 0.592 | 0.491 | 0.536 | 0.441 | 0.392 | 0.530 | 7768 | 16000 | 19.8 |
| k2=3 | 4 | 0.478 | 0.028 | 0.354 | 0.440 | 0.489 | 0.428 | 0.470 | 0.415 | 0.384 | 0.542 | 3837 | 16000 | 7.9 |
| k2=8 | 4 | 0.521 | 0.029 | 0.365 | 0.465 | 0.542 | 0.464 | 0.507 | 0.437 | 0.394 | 0.542 | 5128 | 16000 | 13.3 |
| k2=12 | 4 | 0.537 | 0.029 | 0.370 | 0.470 | 0.563 | 0.476 | 0.523 | 0.439 | 0.395 | 0.545 | 5521 | 16000 | 14.5 |
| decay=0.25 | 4 | 0.502 | 0.029 | 0.360 | 0.445 | 0.517 | 0.446 | 0.495 | 0.424 | 0.386 | 0.538 | 4468 | 16000 | 10.3 |
| decay=1 | 4 | 0.502 | 0.029 | 0.353 | 0.452 | 0.517 | 0.446 | 0.494 | 0.423 | 0.381 | 0.527 | 4468 | 16000 | 10.2 |
| routes=off | 3 | 0.474 | 0.027 | 0.355 | 0.438 | 0.483 | 0.425 | 0.468 | 0.419 | 0.392 | 0.552 | 3918 | 16000 | 9.0 |
| spellings=off | 4 | 0.440 | 0.031 | 0.334 | 0.396 | 0.452 | 0.394 | 0.434 | 0.385 | 0.367 | 0.530 | 3802 | 16000 | 4.5 |
| seedImports=off | 3 | 0.359 | 0.024 | 0.252 | 0.320 | 0.370 | 0.319 | 0.355 | 0.304 | 0.284 | 0.420 | 3270 | 16000 | 8.0 |
| nullNames=0 | 4 | 0.498 | 0.029 | 0.345 | 0.448 | 0.511 | 0.442 | 0.491 | 0.423 | 0.377 | 0.528 | 4242 | 16000 | 10.1 |
| nullNames=3 | 4 | 0.502 | 0.029 | 0.349 | 0.451 | 0.517 | 0.446 | 0.495 | 0.427 | 0.385 | 0.537 | 4448 | 16000 | 10.2 |
| nullNames=16 | 4 | 0.503 | 0.029 | 0.350 | 0.451 | 0.517 | 0.446 | 0.495 | 0.428 | 0.390 | 0.542 | 4487 | 16000 | 10.2 |
| namesPerFile=1 | 4 | 0.494 | 0.028 | 0.362 | 0.449 | 0.505 | 0.441 | 0.487 | 0.430 | 0.387 | 0.536 | 4345 | 16000 | 9.1 |
| namesPerFile=6 | 4 | 0.504 | 0.029 | 0.357 | 0.456 | 0.518 | 0.449 | 0.497 | 0.431 | 0.395 | 0.549 | 4540 | 16000 | 10.9 |
| genericCap=100 | 4 | 0.494 | 0.030 | 0.351 | 0.445 | 0.504 | 0.438 | 0.487 | 0.417 | 0.388 | 0.552 | 4378 | 16000 | 10.2 |
| genericCap=1000 | 4 | 0.502 | 0.029 | 0.350 | 0.451 | 0.518 | 0.446 | 0.495 | 0.426 | 0.389 | 0.542 | 4468 | 16000 | 10.3 |
| gran=symbol followImports | 5 | 0.456 | 0.027 | 0.346 | 0.421 | 0.462 | 0.408 | 0.404 | 0.406 | 0.314 | 0.353 | 2702 | 16000 | 12.3 |
| bm25 | 5 | 0.652 | 0.029 | 0.390 | 0.530 | 0.732 | 0.576 | 0.643 | 0.448 | 0.404 | 0.553 | 7999 | 12901 | 11.4 |
| bm25only | 5 | 0.607 | 0.030 | 0.359 | 0.478 | 0.675 | 0.531 | 0.598 | 0.417 | 0.360 | 0.489 | 7999 | 16000 | 0.5 |
| bm25 k1=0.9 b=0.4 | 5 | 0.643 | 0.029 | 0.379 | 0.517 | 0.742 | 0.571 | 0.636 | 0.450 | 0.409 | 0.555 | 7999 | 12918 | 10.3 |
| bm25 top=20 | 5 | 0.615 | 0.027 | 0.399 | 0.520 | 0.630 | 0.535 | 0.599 | 0.451 | 0.399 | 0.545 | 6643 | 16000 | 9.8 |
| bm25 top=100 | 5 | 0.654 | 0.029 | 0.390 | 0.535 | 0.771 | 0.587 | 0.645 | 0.447 | 0.404 | 0.553 | 7999 | 10623 | 10.2 |
| prox=0.5 | 4 | 0.510 | 0.029 | 0.369 | 0.462 | 0.520 | 0.454 | 0.499 | 0.437 | 0.402 | 0.561 | 4619 | 16000 | 10.4 |
| prox=1.5 | 4 | 0.510 | 0.029 | 0.382 | 0.466 | 0.518 | 0.456 | 0.500 | 0.444 | 0.411 | 0.566 | 4528 | 16000 | 10.4 |
| prox=3 | 4 | 0.511 | 0.029 | 0.389 | 0.464 | 0.520 | 0.457 | 0.501 | 0.444 | 0.414 | 0.570 | 4468 | 16000 | 10.5 |
| typeW=flat | 4 | 0.515 | 0.027 | 0.354 | 0.460 | 0.529 | 0.456 | 0.502 | 0.426 | 0.379 | 0.517 | 4334 | 16000 | 10.3 |
| typeW=def-heavy | 4 | 0.503 | 0.029 | 0.350 | 0.445 | 0.517 | 0.445 | 0.496 | 0.426 | 0.386 | 0.536 | 4448 | 16000 | 10.3 |
| typeW=import-heavy | 4 | 0.502 | 0.030 | 0.362 | 0.452 | 0.519 | 0.448 | 0.491 | 0.432 | 0.393 | 0.547 | 4487 | 16000 | 10.3 |
| countW=0 | 4 | 0.510 | 0.029 | 0.375 | 0.461 | 0.523 | 0.456 | 0.500 | 0.431 | 0.401 | 0.563 | 4507 | 16000 | 10.3 |
| countW=1 | 4 | 0.513 | 0.028 | 0.352 | 0.453 | 0.528 | 0.453 | 0.504 | 0.424 | 0.382 | 0.527 | 4405 | 16000 | 10.3 |
| idf=off | 4 | 0.508 | 0.027 | 0.357 | 0.446 | 0.526 | 0.450 | 0.498 | 0.421 | 0.386 | 0.543 | 4405 | 16000 | 10.2 |

## T1x

| name | cx | primary | se | r2k | r4k | r16k | auc | def | fr10 | ndcg | mrr | tok | t80 | ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| base | 4 | 0.425 | 0.048 | 0.255 | 0.354 | 0.443 | 0.368 | 0.431 | 0.312 | 0.373 | 0.657 | 5251 | 16000 | 13.4 |
| pad=DIR | 5 | 0.593 | 0.058 | 0.268 | 0.400 | 0.770 | 0.523 | 0.598 | 0.321 | 0.379 | 0.659 | 7999 | 14243 | 13.4 |
| pad=CO | 5 | 0.601 | 0.056 | 0.263 | 0.422 | 0.809 | 0.540 | 0.615 | 0.323 | 0.381 | 0.662 | 7999 | 12515 | 13.4 |
| gran=symbol | 5 | 0.337 | 0.048 | 0.262 | 0.318 | 0.339 | 0.303 | 0.274 | 0.303 | 0.295 | 0.415 | 2113 | 16000 | 13.4 |
| form=paths | 4 | - | - | - | - | - | - | - | 0.312 | 0.373 | 0.657 | 306 | 16000 | 13.4 |
| form=snippet | 4 | 0.210 | 0.028 | 0.097 | 0.150 | 0.290 | 0.192 | 0.200 | 0.282 | 0.350 | 0.655 | 7999 | 16000 | 13.4 |
| gran=symbol form=paths | 5 | - | - | - | - | - | - | - | 0.303 | 0.295 | 0.415 | 1120 | 16000 | 13.4 |
| gran=symbol form=snippet | 5 | 0.213 | 0.029 | 0.092 | 0.145 | 0.273 | 0.187 | 0.178 | 0.295 | 0.289 | 0.414 | 7999 | 16000 | 13.4 |
| rounds=1 | 3 | 0.311 | 0.039 | 0.250 | 0.301 | 0.312 | 0.282 | 0.313 | 0.281 | 0.334 | 0.616 | 2299 | 16000 | 2.7 |
| rounds=3 | 5 | 0.460 | 0.046 | 0.258 | 0.375 | 0.520 | 0.405 | 0.467 | 0.323 | 0.380 | 0.643 | 7998 | 16000 | 23.5 |
| k2=3 | 4 | 0.413 | 0.045 | 0.259 | 0.359 | 0.424 | 0.360 | 0.420 | 0.315 | 0.372 | 0.646 | 4431 | 16000 | 10.0 |
| k2=8 | 4 | 0.428 | 0.047 | 0.266 | 0.357 | 0.457 | 0.375 | 0.437 | 0.313 | 0.378 | 0.664 | 6307 | 16000 | 15.7 |
| k2=12 | 4 | 0.430 | 0.047 | 0.268 | 0.354 | 0.467 | 0.378 | 0.436 | 0.321 | 0.387 | 0.675 | 6565 | 16000 | 17.7 |
| decay=0.25 | 4 | 0.425 | 0.048 | 0.270 | 0.362 | 0.443 | 0.372 | 0.431 | 0.315 | 0.373 | 0.649 | 5251 | 16000 | 13.0 |
| decay=1 | 4 | 0.428 | 0.049 | 0.253 | 0.355 | 0.443 | 0.369 | 0.432 | 0.304 | 0.364 | 0.643 | 5251 | 16000 | 13.2 |
| routes=off | 3 | 0.371 | 0.035 | 0.228 | 0.316 | 0.386 | 0.324 | 0.373 | 0.276 | 0.346 | 0.650 | 4586 | 16000 | 10.5 |
| spellings=off | 4 | 0.393 | 0.050 | 0.253 | 0.344 | 0.411 | 0.346 | 0.395 | 0.307 | 0.362 | 0.633 | 4628 | 16000 | 5.6 |
| seedImports=off | 3 | 0.327 | 0.051 | 0.201 | 0.271 | 0.341 | 0.284 | 0.333 | 0.245 | 0.300 | 0.529 | 3919 | 16000 | 10.8 |
| nullNames=0 | 4 | 0.414 | 0.044 | 0.258 | 0.354 | 0.430 | 0.361 | 0.420 | 0.304 | 0.365 | 0.653 | 4860 | 16000 | 11.7 |
| nullNames=3 | 4 | 0.425 | 0.048 | 0.253 | 0.355 | 0.443 | 0.368 | 0.432 | 0.314 | 0.374 | 0.662 | 5047 | 16000 | 12.8 |
| nullNames=16 | 4 | 0.426 | 0.048 | 0.253 | 0.354 | 0.444 | 0.369 | 0.433 | 0.317 | 0.376 | 0.657 | 5340 | 16000 | 12.3 |
| namesPerFile=1 | 4 | 0.410 | 0.043 | 0.258 | 0.356 | 0.421 | 0.358 | 0.413 | 0.312 | 0.373 | 0.661 | 5087 | 16000 | 11.3 |
| namesPerFile=6 | 4 | 0.428 | 0.049 | 0.257 | 0.358 | 0.446 | 0.371 | 0.437 | 0.312 | 0.378 | 0.669 | 5376 | 16000 | 13.4 |
| genericCap=100 | 4 | 0.424 | 0.047 | 0.261 | 0.353 | 0.433 | 0.366 | 0.430 | 0.313 | 0.379 | 0.675 | 5047 | 16000 | 12.4 |
| genericCap=1000 | 4 | 0.425 | 0.048 | 0.254 | 0.354 | 0.444 | 0.369 | 0.431 | 0.312 | 0.373 | 0.657 | 5251 | 16000 | 12.5 |
| gran=symbol followImports | 5 | 0.390 | 0.047 | 0.260 | 0.338 | 0.397 | 0.342 | 0.358 | 0.306 | 0.293 | 0.400 | 3501 | 16000 | 15.2 |
| bm25 | 5 | 0.624 | 0.059 | 0.300 | 0.438 | 0.720 | 0.534 | 0.650 | 0.353 | 0.402 | 0.654 | 7999 | 16000 | 14.1 |
| bm25only | 5 | 0.606 | 0.057 | 0.277 | 0.429 | 0.681 | 0.512 | 0.631 | 0.348 | 0.375 | 0.598 | 7999 | 16000 | 0.6 |
| bm25 k1=0.9 b=0.4 | 5 | 0.612 | 0.057 | 0.294 | 0.432 | 0.728 | 0.529 | 0.642 | 0.360 | 0.410 | 0.657 | 7999 | 14975 | 13.2 |
| bm25 top=20 | 5 | 0.537 | 0.051 | 0.303 | 0.431 | 0.568 | 0.462 | 0.542 | 0.355 | 0.401 | 0.649 | 7292 | 16000 | 12.5 |
| bm25 top=100 | 5 | 0.625 | 0.059 | 0.298 | 0.437 | 0.785 | 0.550 | 0.648 | 0.353 | 0.402 | 0.655 | 7999 | 12903 | 13.7 |
| prox=0.5 | 4 | 0.429 | 0.048 | 0.264 | 0.367 | 0.441 | 0.373 | 0.436 | 0.317 | 0.385 | 0.685 | 5593 | 16000 | 12.9 |
| prox=1.5 | 4 | 0.427 | 0.047 | 0.271 | 0.369 | 0.437 | 0.372 | 0.435 | 0.320 | 0.389 | 0.685 | 5335 | 16000 | 13.5 |
| prox=3 | 4 | 0.426 | 0.047 | 0.271 | 0.368 | 0.437 | 0.372 | 0.434 | 0.324 | 0.394 | 0.693 | 5198 | 16000 | 13.8 |
| typeW=flat | 4 | 0.425 | 0.048 | 0.260 | 0.353 | 0.445 | 0.370 | 0.433 | 0.308 | 0.359 | 0.610 | 5138 | 16000 | 13.0 |
| typeW=def-heavy | 4 | 0.424 | 0.048 | 0.255 | 0.357 | 0.442 | 0.368 | 0.431 | 0.316 | 0.368 | 0.635 | 5251 | 16000 | 13.1 |
| typeW=import-heavy | 4 | 0.422 | 0.046 | 0.251 | 0.352 | 0.437 | 0.365 | 0.429 | 0.308 | 0.374 | 0.663 | 5323 | 16000 | 13.2 |
| countW=0 | 4 | 0.427 | 0.048 | 0.270 | 0.363 | 0.443 | 0.373 | 0.433 | 0.315 | 0.376 | 0.662 | 5251 | 16000 | 13.2 |
| countW=1 | 4 | 0.426 | 0.049 | 0.257 | 0.352 | 0.444 | 0.369 | 0.433 | 0.308 | 0.362 | 0.622 | 5107 | 16000 | 13.2 |
| idf=off | 4 | 0.420 | 0.047 | 0.275 | 0.353 | 0.440 | 0.368 | 0.428 | 0.313 | 0.374 | 0.659 | 5251 | 16000 | 12.7 |

## T2

| name | cx | primary | se | r2k | r4k | r16k | auc | def | fr10 | ndcg | mrr | tok | t80 | ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| base | 4 | 0.616 | 0.041 | 0.429 | 0.544 | 0.646 | 0.548 | 0.650 | 0.502 | 0.377 | 0.408 | 5151 | 16000 | 11.9 |
| pad=DIR | 5 | 0.756 | 0.033 | 0.432 | 0.571 | 0.913 | 0.673 | 0.779 | 0.502 | 0.377 | 0.411 | 7999 | 7371 | 11.9 |
| pad=CO | 5 | 0.792 | 0.032 | 0.430 | 0.610 | 0.958 | 0.705 | 0.813 | 0.504 | 0.378 | 0.414 | 7999 | 6473 | 11.9 |
| gran=symbol | 5 | 0.544 | 0.038 | 0.441 | 0.511 | 0.544 | 0.491 | 0.414 | 0.476 | 0.297 | 0.272 | 1819 | 16000 | 11.9 |
| form=paths | 4 | - | - | - | - | - | - | - | 0.502 | 0.377 | 0.408 | 319 | 16000 | 11.9 |
| form=snippet | 4 | 0.345 | 0.040 | 0.189 | 0.261 | 0.470 | 0.320 | 0.333 | 0.454 | 0.358 | 0.398 | 7999 | 16000 | 11.9 |
| gran=symbol form=paths | 5 | - | - | - | - | - | - | - | 0.476 | 0.297 | 0.272 | 985 | 16000 | 11.9 |
| gran=symbol form=snippet | 5 | 0.387 | 0.042 | 0.222 | 0.299 | 0.473 | 0.347 | 0.289 | 0.471 | 0.295 | 0.268 | 7999 | 16000 | 11.9 |
| rounds=1 | 3 | 0.422 | 0.035 | 0.360 | 0.416 | 0.422 | 0.387 | 0.424 | 0.404 | 0.321 | 0.368 | 2258 | 16000 | 2.4 |
| rounds=3 | 5 | 0.671 | 0.038 | 0.453 | 0.558 | 0.711 | 0.591 | 0.687 | 0.498 | 0.382 | 0.413 | 7998 | 12164 | 20.6 |
| k2=3 | 4 | 0.607 | 0.038 | 0.428 | 0.531 | 0.620 | 0.536 | 0.633 | 0.489 | 0.373 | 0.409 | 4270 | 16000 | 8.1 |
| k2=8 | 4 | 0.639 | 0.039 | 0.443 | 0.553 | 0.686 | 0.570 | 0.666 | 0.501 | 0.383 | 0.418 | 6441 | 16000 | 14.3 |
| k2=12 | 4 | 0.643 | 0.038 | 0.437 | 0.560 | 0.697 | 0.575 | 0.674 | 0.501 | 0.381 | 0.413 | 6760 | 16000 | 16.9 |
| decay=0.25 | 4 | 0.617 | 0.041 | 0.439 | 0.529 | 0.646 | 0.547 | 0.652 | 0.499 | 0.368 | 0.392 | 5151 | 16000 | 10.8 |
| decay=1 | 4 | 0.618 | 0.041 | 0.430 | 0.551 | 0.646 | 0.551 | 0.654 | 0.504 | 0.379 | 0.404 | 5151 | 16000 | 10.9 |
| routes=off | 3 | 0.586 | 0.042 | 0.407 | 0.504 | 0.618 | 0.520 | 0.635 | 0.473 | 0.356 | 0.388 | 4570 | 16000 | 10.2 |
| spellings=off | 4 | 0.565 | 0.043 | 0.425 | 0.490 | 0.582 | 0.502 | 0.574 | 0.463 | 0.341 | 0.355 | 4401 | 16000 | 4.8 |
| seedImports=off | 3 | 0.576 | 0.037 | 0.399 | 0.516 | 0.594 | 0.511 | 0.580 | 0.478 | 0.370 | 0.404 | 3893 | 16000 | 9.8 |
| nullNames=0 | 4 | 0.606 | 0.040 | 0.414 | 0.531 | 0.629 | 0.536 | 0.643 | 0.494 | 0.363 | 0.397 | 4572 | 16000 | 10.4 |
| nullNames=3 | 4 | 0.615 | 0.040 | 0.426 | 0.545 | 0.645 | 0.547 | 0.651 | 0.502 | 0.372 | 0.400 | 5032 | 16000 | 11.0 |
| nullNames=16 | 4 | 0.618 | 0.041 | 0.428 | 0.548 | 0.641 | 0.548 | 0.651 | 0.508 | 0.378 | 0.403 | 5213 | 16000 | 10.8 |
| namesPerFile=1 | 4 | 0.607 | 0.040 | 0.443 | 0.539 | 0.613 | 0.537 | 0.646 | 0.499 | 0.365 | 0.389 | 4938 | 16000 | 9.8 |
| namesPerFile=6 | 4 | 0.628 | 0.038 | 0.431 | 0.551 | 0.648 | 0.555 | 0.657 | 0.519 | 0.383 | 0.408 | 5400 | 16000 | 11.4 |
| genericCap=100 | 4 | 0.613 | 0.040 | 0.438 | 0.543 | 0.639 | 0.546 | 0.651 | 0.501 | 0.376 | 0.405 | 4824 | 16000 | 10.6 |
| genericCap=1000 | 4 | 0.616 | 0.041 | 0.429 | 0.544 | 0.648 | 0.549 | 0.650 | 0.502 | 0.377 | 0.408 | 5151 | 16000 | 10.8 |
| gran=symbol followImports | 5 | 0.629 | 0.039 | 0.436 | 0.572 | 0.639 | 0.557 | 0.606 | 0.489 | 0.294 | 0.264 | 3312 | 16000 | 13.8 |
| bm25 | 5 | 0.750 | 0.032 | 0.477 | 0.600 | 0.827 | 0.660 | 0.723 | 0.516 | 0.393 | 0.436 | 7999 | 6161 | 12.2 |
| bm25only | 5 | 0.737 | 0.031 | 0.475 | 0.568 | 0.792 | 0.641 | 0.712 | 0.507 | 0.372 | 0.404 | 7999 | 6688 | 0.5 |
| bm25 k1=0.9 b=0.4 | 5 | 0.737 | 0.034 | 0.467 | 0.582 | 0.823 | 0.649 | 0.722 | 0.518 | 0.396 | 0.437 | 7999 | 6457 | 11.0 |
| bm25 top=20 | 5 | 0.689 | 0.034 | 0.481 | 0.591 | 0.707 | 0.606 | 0.694 | 0.518 | 0.394 | 0.435 | 7079 | 8592 | 10.6 |
| bm25 top=100 | 5 | 0.763 | 0.031 | 0.474 | 0.601 | 0.878 | 0.677 | 0.742 | 0.516 | 0.393 | 0.437 | 7999 | 6161 | 11.1 |
| prox=0.5 | 4 | 0.625 | 0.041 | 0.444 | 0.558 | 0.650 | 0.557 | 0.664 | 0.512 | 0.372 | 0.392 | 5416 | 16000 | 11.0 |
| prox=1.5 | 4 | 0.618 | 0.041 | 0.447 | 0.560 | 0.644 | 0.553 | 0.656 | 0.521 | 0.380 | 0.401 | 5224 | 16000 | 11.3 |
| prox=3 | 4 | 0.618 | 0.041 | 0.460 | 0.561 | 0.644 | 0.555 | 0.655 | 0.520 | 0.377 | 0.395 | 5078 | 16000 | 11.3 |
| typeW=flat | 4 | 0.638 | 0.039 | 0.447 | 0.562 | 0.660 | 0.565 | 0.653 | 0.515 | 0.400 | 0.437 | 5057 | 16000 | 10.9 |
| typeW=def-heavy | 4 | 0.616 | 0.041 | 0.417 | 0.542 | 0.646 | 0.546 | 0.648 | 0.496 | 0.357 | 0.375 | 5081 | 16000 | 10.8 |
| typeW=import-heavy | 4 | 0.624 | 0.039 | 0.459 | 0.557 | 0.654 | 0.559 | 0.651 | 0.512 | 0.383 | 0.419 | 5211 | 16000 | 11.0 |
| countW=0 | 4 | 0.638 | 0.040 | 0.434 | 0.566 | 0.664 | 0.566 | 0.685 | 0.494 | 0.367 | 0.399 | 5330 | 16000 | 11.1 |
| countW=1 | 4 | 0.626 | 0.038 | 0.442 | 0.546 | 0.654 | 0.556 | 0.655 | 0.519 | 0.396 | 0.428 | 4994 | 16000 | 11.1 |
| idf=off | 4 | 0.617 | 0.038 | 0.423 | 0.538 | 0.648 | 0.547 | 0.638 | 0.496 | 0.369 | 0.392 | 4994 | 16000 | 11.0 |

## Configurations

- **base** (5d3325db5fc2c204, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **pad=DIR** (83e0c883851846cd, complexity 5): `{"granularity":"file","form":"signature","pad":"DIR","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **pad=CO** (6dc9af96e07d22da, complexity 5): `{"granularity":"file","form":"signature","pad":"CO","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **gran=symbol** (1ecd502900f2b810, complexity 5): `{"granularity":"symbol","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **form=paths** (884dc179f8cb752b, complexity 4): `{"granularity":"file","form":"paths","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **form=snippet** (596e619c3990f77d, complexity 4): `{"granularity":"file","form":"snippet","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **gran=symbol form=paths** (092ef60c3d3129c1, complexity 5): `{"granularity":"symbol","form":"paths","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **gran=symbol form=snippet** (d8b9094e401020f7, complexity 5): `{"granularity":"symbol","form":"snippet","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **rounds=1** (b9754fe647830f86, complexity 3): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":1,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **rounds=3** (f5b3396b716753dd, complexity 5): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":3,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **k2=3** (84f47f0721f3e3a7, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":3,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **k2=8** (c8db014d96912281, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":8,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **k2=12** (93c59d51ce663d8f, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":12,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **decay=0.25** (16d911c3d3da95eb, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.25,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **decay=1** (7a9c6f7616711001, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":1,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **routes=off** (0145b275d1a6dcfb, complexity 3): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":false,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **spellings=off** (90900b12913bd063, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":false,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **seedImports=off** (a0315433215d1e36, complexity 3): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":false,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **nullNames=0** (28f49068908b8c8d, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":0,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **nullNames=3** (f4ae4fb13e3b0379, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":3,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **nullNames=16** (b8936e9ba7222eb8, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":16,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **namesPerFile=1** (dc6ac710a0c35150, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":1,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **namesPerFile=6** (7826c0572d6537d7, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":6,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **genericCap=100** (016b9e46abc2cfa9, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":100,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **genericCap=1000** (db0611149378f294, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":1000,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **gran=symbol followImports** (c7c630f80a54cbfe, complexity 5): `{"granularity":"symbol","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":true,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **bm25** (53b2c60c4adefeb0, complexity 5): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":true,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **bm25only** (7076f8fc599acc09, complexity 5): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":true,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **bm25 k1=0.9 b=0.4** (113d2dfdd83585aa, complexity 5): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":true,"bm25only":false,"bm25K1":0.9,"bm25B":0.4,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **bm25 top=20** (9bca343f2cd9d5e9, complexity 5): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":true,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":20,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **bm25 top=100** (fcd58d2a607310d0, complexity 5): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":true,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":100,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **prox=0.5** (4bdde270c1213bbb, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0.5,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **prox=1.5** (910d5d6e963f3aeb, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":1.5,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **prox=3** (e6f8be64fcc6e8f7, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":3,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **typeW=flat** (37cb9d155baa1abe, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":1,"import":1,"mock":1,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **typeW=def-heavy** (3d4011bce0aa5f9b, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":5,"import":2,"mock":1,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **typeW=import-heavy** (6908122ffbc685bb, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":2,"import":4,"mock":1.5,"call":1},"countW":0.25,"idf":true},"minConf":0.5}`
- **countW=0** (45af0783472f062b, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0,"idf":true},"minConf":0.5}`
- **countW=1** (9f90963225373fe2, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":1,"idf":true},"minConf":0.5}`
- **idf=off** (443982cde7cedc6e, complexity 4): `{"granularity":"file","form":"signature","pad":"none","search":{"rounds":2,"routes":true,"spellings":true,"nullNames":8,"seedImports":true,"namesPerFile":3,"genericCap":300,"followImports":false,"k2":5,"decay":0.5,"bm25":false,"bm25only":false,"bm25K1":1.2,"bm25B":0.75,"bm25Top":50,"prox":0,"typeW":{"def":3,"import":2,"mock":1.5,"call":1},"countW":0.25,"idf":false},"minConf":0.5}`
