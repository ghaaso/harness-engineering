# Model and training recovery

The embeddings installation notes in EMS contained no actual model files. The corresponding live experiment was recovered from the explicitly referenced Claude scratchpad. Preserve `recovered/hb/graph2/build`, `engines-linux`, `wider/embeddings`, and `recovered/coord` together; the trainer depends on the graph extractor, frozen source stores, tasks, sealed references, graders, evaluation code, and coordination records.

## What was found

- **80 Stage A representation files** (257,076,592 bytes), with adjacent metadata, configurations, rankings, and logs.
- **24 diagnostic representation files** (113,617,944 bytes), covering equivalence and debugging work.
- **4 smoke model files** (47,652,576 bytes), plus four small `.pth` files.
- **Stage B:** 2,385 completed parts and 180 result table files in the audited run. Preserve its scores, plans, curves, metadata, and run logs. The source deletes transient representations after scoring; those weights cannot be recovered as saved checkpoints.
- CPU and GPU Docker definitions, locks, package manifests, and install reports. GPU wheels were already absent. Replaceable downloaded wheels are excluded from this extraction.

These are graph-embedding / graph-neural research representations and associated experiment machinery. They are not a newly trained foundation language model. Staged held-out test handoffs are not evidence of a completed real held-out evaluation.

## Later update on 15 November

The first capture (11:25–11:26 UTC) preceded real held-out scoring. When work resumed, tuning had completed and the real held-out H1 run was active. A read-only audit at about 18:31 UTC observed 75 of 210 units completed, with no final held-out handoff or grader return. That is progress evidence, not a final scientific result. The selected tuning candidate was RotatE E1/c04 with fusion weight 1.

The later capture adds tuning reports and grader returns, selected configurations, frozen tuning/probe/held-out inputs, launch and mount records, rulings 106–111, and newer coordinator records. It enumerates new directories even when copied inputs retain old timestamps. `validation/update-capture.json` gives the actual capture interval and file changes. The initial snapshot remains in Git commit `5e503b0`; superseded data are retained under `recovered/snapshots/20261115T1125/` after restoration. Do not treat the captured partial held-out outputs as a completed run.

The 16 November audit repaired a capture race: the saved log contained 77 completed units but only 76 units' data had been enumerated. Four missing files for the 77th unit are now included directly in Git. All 77 units have metadata, and all 231 recorded data hashes match. This consistency repair does not turn the partial run into a final held-out result.

## Locations

- `recovered/hb/graph2/wider/embeddings/train`: trainers, Stage A and B records.
- `recovered/hb/graph2/wider/embeddings/src`, `export`, `eval`, `orchestrator`, `r58b`, `r58c`, `gpu`: implementation, variants, graph exports, diagnostics and evaluation.
- `recovered/hb/graph2/wider/embeddings/image` and `image-gpu`: reproducible environment definitions and model smoke records.
- `recovered/hb/graph2/build`: shared extractors, frozen facts, source stores, task data, graders, answers and results.
- `recovered/hb/graph2/wider/graphify`: Graphify adapter, runner, configurations, derived graphs and scored outputs.
- `recovered/coord`: protocol changes and end-of-run coordination; filenames and records retain their original status.

Large and generated data in these paths are restored from the private release, not included as ordinary Git blobs. `recovery-manifest.jsonl` maps every captured file to its exact hash and storage location.

## Snapshot boundary

Some GPU/load and coordinator records continued changing during extraction. The manifest records the capture time and source modification time of each file. Archived bytes were first copied into an immutable local object store and then packaged; later source writes cannot change the release bytes. This is a capture interval, not a transactional snapshot of running experiments. No process was stopped and no benchmark, training, installation, deployment or paid model call was started by the extraction.

Historical scripts can contain absolute scratchpad/application paths. Restore the relative layout and explicitly configure those references before any future run. Full regeneration can also require the original private EMS Git history, source-session inputs deliberately excluded from publication, pinned dependencies, and the original experimental protocol.
