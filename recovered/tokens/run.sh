#!/bin/bash
cd "$(dirname "$0")"
P="C:/Users/User/.claude/projects"
node parse.cjs fixflow out $P/C--Users-User-Documents-projects-EMS-workshop1 $P/C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-harness-ideas-baml-57fde3 $P/C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-harness-ideas-horthy-2371b9 $P/C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-knowledge-store-research-9c609c $P/C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-wizardly-hertz-02c46a $P/C--Users-User-OneDrive-Documents-Bilal-Migration-User-Downloads-20-PROJECTS-23-FixFlow 2> out/fixflow.log &
node parse.cjs clinic out $(ls -d $P/C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop* $P/C--Users-User-OneDrive-Documents-Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop) 2> out/clinic.log &
wait
echo PARSE_DONE
