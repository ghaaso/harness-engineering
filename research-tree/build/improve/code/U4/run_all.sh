#!/bin/bash
# U4, the whole build in order (every step restartable: finished outputs are skipped). Outputs in CR/improve/U4.
set -e
cd "$(dirname "$0")"
for r in fixflow clinic zulip; do ./run_cpu.sh extract $r; done            # training blocks + content snapshots (checks byte-identity)
./run_cpu.sh py features.py base                                           # base features per block (CPU)
./run_gpu.sh fixflow clinic zulip                                          # card: Qwen3 file vectors (CR/GPU.lock)
./run_cpu.sh py features.py content                                        # seed-candidate content cosine
U4_THREADS=16 ./run_cpu.sh py ease.py sweep                                # B3 on tuning -> ease/choice.json
U4_PROCS=4 U4_THREADS=4 ./run_cpu.sh py ease.py apply                      # B3 chosen, every block
./run_cpu.sh py features.py tables                                         # CSV tables per block
./run_cpu.sh py rank.py sweep --tag B2                                     # B2 on training blocks, tuning sweep -> rank/B2/choice.json
./run_cpu.sh py tune_report.py --tag B2                                    # tuning table -> tune-report.json
./run_cpu.sh py test_u4.py                                                 # tests (prints "all U4 tests passed")
# after the refuter only: ./run_cpu.sh py rank.py heldout --tag B2  and  the B3 copy (see READY.md)
