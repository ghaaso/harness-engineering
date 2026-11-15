# Fidelity check
All numbers in section 6 paragraph, section 0 sentence, section 3.6 sentence, appendix row, claims C2-C8, C14: ok against window-fill-output.txt (all-group SUMMARY line, group lines, Read tool repeats, top-30 line).
C2 shares: 26.9+32.5+28.6+12.0=100.0 (12.0 = 4.3+3.1+4.6). Source all-group line sums to 100.0.
C3: 18.7+7.0+0.9+0.3=26.9; "searches and other 1.2" ok.
Top-10 documents 3.0%: my sum of the 10 .md files in the top-30 list = 132.4M / 4331M = 3.06%, ok.
No sentence presents 26.9 as a saving; section 6 says "at most", "no saving can be claimed"; 3.6 says "caps".
Older numbers: 66.4 % / 4.25B is cache-read basis (2825+650+778=4253M; 2825/4253=66.4%); new 66.0 % is context-token basis (2858/4331). 9,342 vs 9,327 calls: 15 apart, different counting, unexplained in the text. 306k: 2858M/9327=306.4k ok. 70k per agent is not in the fill run, no conflict. No contradiction, but the denominators are not stated side by side in the compile.
Manifest: sha256sum -c, 73 lines, no line other than OK.
