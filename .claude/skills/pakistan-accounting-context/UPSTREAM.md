# UPSTREAM — pakistan-accounting-context

Status: **researched**. No upstream skill or repository exists for this topic (owner's row:
"no credible skill exists; write it locally from current FBR material and the SRB Acts and Rules,
with every URL and fetch date recorded"). So there is no repo URL, commit SHA, branch or
`LICENSE-<upstream>` file.

- Sources: Pakistani statutes and government web pages (FBR, Sindh Laws portal) plus secondary
  commentary. No SPDX identifier applies. Statute text is quoted briefly with section numbers;
  secondary pages are cited by URL and summarised, never copied. **Nothing is vendored.** The
  statute PDFs (Income Tax Ordinance 7.5 MB, Sales Tax Act 1.8 MB, SST Act 0.9 MB, Sindh Finance
  Act 2026 0.28 MB) are cited by section, never stored here (README rule 7).
- Date fetched: 2026-11-04 (package survey `SOURCE-NOTES.md` §6, plus the author's re-fetches below).
- How statute PDFs were read: the survey saved each PDF and read a local `pdftotext -layout`
  extraction. On 2026-11-04 the author re-fetched both sindhlaws.gov.pk PDFs (HTTP ok; binary
  saved) but the author's session could neither extract their text (WebFetch returned binary) nor
  render pages (`pdftoppm` not installed), so primary-text rows are marked `survey` in the reference
  tables. HTML pages the author re-read are marked `re-read`.

## URLs fetched (all 2026-11-04)

| URL | Result | Used for |
| --- | --- | --- |
| https://www.sindhlaws.gov.pk/DownloadDocument.aspx?PubID=PUB-17-000040&Lang=EN | ok (survey; author re-fetch ok, text not extractable) | SRB-1, 3, 5, 6, 9, 11, 12, 13 |
| https://www.sindhlaws.gov.pk/Setup/Publications_SindhCode/PUB-NEW-26-000096.pdf | ok (survey; author re-fetch ok, text not extractable) | SRB-3, 10, 14 |
| https://www.sindhlaws.gov.pk/setup/publications_SindhCode/PUB-NEW-26-000023.pdf | ok, but it is the Sindh Finance Act 2017, not the SST Rules | not used |
| https://srb.gos.pk | **FAILED** — TLS "unable to verify the first certificate" | — |
| https://www.srb.gos.pk/ | **FAILED** — TLS certificate | — |
| https://www.srb.gos.pk/srb/wp-content/uploads/2026/01/Sindh-Sales-Tax-Act-2011-25-26-2.pdf | **FAILED** — TLS certificate | — |
| https://www.fbr.gov.pk/ | ok | navigation |
| https://www.fbr.gov.pk/act-rules-ordinances/131226 | ok | navigation |
| https://fbr.gov.pk/categ/sales-tax-act/301 | ok | STA listing |
| https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf | ok (survey) | FBR-1, 2, 3, 5, 6, 7, 8 |
| https://fbr.gov.pk/Categ/Income-Tax-Ordinance/326 | ok | ITO version label |
| https://download1.fbr.gov.pk/Docs/2026724177725705IncomeTaxOrdinanace2001.pdf | ok (survey) | FBR-9 |
| https://fbr.gov.pk/categ/income-tax-rules-2002/335 | ok | IT Rules version label |
| https://download1.fbr.gov.pk/Docs/20269211394336470IncomeTaxRules2002.pdf | **FAILED** — maxContentLength 10485760 exceeded | U6 |
| https://fbr.gov.pk/pos-legal-provisions/163085/163086 | ok (survey) | FBR-10 |
| https://fbr.gov.pk/categ/register-sales-tax/51148/50848/101156 | ok (survey; fetch-tool summary, not verbatim) | FBR-4 |
| https://taxationpk.com/srb-sales-tax-rates-2026-in-sindh-finance-act-2026/ | ok (survey; **author re-read**: lists 8%, no CPC code) | SRB-4 |
| https://pkrevenue.com/sales-tax-registration-number-is-mandatory-on-invoices-srb/ | ok (survey) | SRB-15 |
| https://pkrevenue.com/sindh-shifts-entire-tax-system-to-negative-list-tariff-regime-srb/ | ok (survey) | SRB-8 |
| https://customstoday.media/sindh-shifts-entire-tax-system-to-negative-list-tariff-regime-srb/ | ok (survey) | SRB-8 |
| https://www.ey.com/en_gl/technical/tax-alerts/2024-1353-pakistan-adopts-changes-to-provincial-sales-tax-laws | ok (survey) | SRB-2 |
| https://www.rsm.global/pakistan/sites/default/files/media/documents/Sindh%20Finance%20Bill%202025-26.pdf | ok (survey) | SRB-7 |
| https://profit.pakistantoday.com.pk/2026/04/26/fbr-expands-pos-network-nearly-36000-retail-and-restaurant-outlets-now-linked | search-result summary only, page not fetched | FBR-11 |

## Topics not retrievable (WEB_UNAVAILABLE, 2026-11-04)

- Sindh Sales Tax on Services Rules 2011, rule 29 primary text (srb.gos.pk TLS failure; Sindh Laws
  search did not return the Rules) → U1 (secondary SRB-15 only).
- Sindh Sales Tax Special Procedure (Online Integration of Business) Rules 2022 category list and
  thresholds → U2.
- Treatment of spare parts supplied during a repair (SST s.5 service value vs a separate federal
  goods supply) → U3.
- CPC 871 / CPC 872 class contents → U4.
- The serial 34 rate before 2026-07-01 → U5.
- Income Tax Rules 2002 prescribed records (PDF over the fetch limit) → U6.
- Contents of S.R.O 69(I)/2025, S.R.O 2071(I)/2025 and any other POS-page item → U7.
- Sales Tax Rules 2006 invoice particulars → U8.

## Taken

Nothing vendored. Facts W1-W23 of the survey were restated as rows SRB-1..15 and FBR-1..11 in
`references/srb-sindh-sales-tax-on-services.md` and `references/fbr-sales-tax-and-income-tax.md`,
each with its URL, fetch date and section/serial (survey "ext. line" numbers dropped: they refer to
a local text extraction, not a stable citation).

## Changed

- SKILL.md compresses the facts into: the two-books rule, the per-line authority split (as owner-set
  data), integer-bps rate storage, integer tax arithmetic with a named rounding mode, an export
  field map against STA s.22 / SST s.26, and the retention rule. All FixFlow facts were re-verified
  by the author against the worktree (main @ a31924a) and the PR #182 copies (head 3415b5e) on
  2026-11-04.
- The two FBR Tier-1 electricity figures (600,000 on the FBR page, twelve hundred thousand in the
  Act amended to 2026-06-30) are both recorded (FBR-3, FBR-4), not reconciled.

## Rejected (with reason)

- Any statement that CPC 872 definitely covers household-appliance repair — class contents not
  retrieved (U4); kept as a candidate class only.
- Rule 29(1) particulars beyond the secondary report — primary text unavailable (U1).
- Budget-speech threshold figures named in the survey's reject list — no URL or fetch date was
  recorded for them, so they are not restated; only the enacted Rs 4,000,000 text (SRB-6) is used.
- FBR-4 quotation marks and a cottage-industry utility-bill figure — the registration page was read
  only as a fetch-tool summary (survey W8), so FBR-4 is a summary and the figure was dropped.
- FBR-10 items not in the survey's POS-page reading (survey W7) — dropped; S.R.O 164(I)/2025 stays
  only in FBR-11, an unfetched search summary.
- "Recipient records bind only a registered person" for STA s.22(1) — FBR-6 does not record who
  must keep them; left as an accountant question (SKILL.md §2 step 2, §5).
- A pending-proceeding extension for STA s.24 — recorded only for ITO s.174(3) and SST s.27(1).
- "Seven years" retention — in neither statute (six years; ten for SST periods ending on or before
  2025-06-30).
- Odoo payload, CSV-import and JSON-2 detail — owned by the `odoo-accounting-import` package.

Collisions from SOURCE-NOTES §5 (FixFlow-internal; no upstream sentence) — handled, not adopted as
law over FixFlow's rules (SKILL.md §5):

1. Plan "not registered" default (`docs/program/SHIP-PLAN-2026-11.md:1123-1124`, `:1301`) vs SST
   s.24(1) registration of every resident providing a taxable service: the owner still decides;
   the skill requires P9-0b to record the turnover/exemption basis beside the answer.
2. Statutory rates (15% / 8% / 18%) vs "Rates come from settings, never hardcoded"
   (`docs/BACKEND-REQUIREMENTS-2026-07.md:625`): rates are owner-set integer bps in `shop_setting`
   (`backend/app/features/tenancy/specs.py:10-13`); examples use 1500 / 800 / 1800.

A third tension found by the author: STA s.22(1)(a) and SST s.26(1) require recipient name and
address, while the export sends one walk-in partner with no PII (`SHIP-PLAN-2026-11.md:1305`). The
export rule stands; whether FixFlow's `customer` table satisfies the record duty is an accountant
question.
