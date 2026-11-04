<!-- Authored for FixFlow, 2026-11-04 -->
# SRB — Sindh Sales Tax on Services: fact table (as fetched 2026-11-04)

Authority: Sindh Revenue Board (SRB), under the Sindh Sales Tax on Services Act 2011 and the
Sindh Sales Tax on Services Rules 2011. A Karachi repair shop's **service** income falls here
(docs/BACKEND-REQUIREMENTS-2026-07.md:622-624). Every row is a fact, not advice; the
classification of FixFlow's own work under these rows is an accountant question (see "Unknowns").

**How these rows were read.** Statute PDFs were fetched on 2026-11-04 by the package survey and
read through a local `pdftotext -layout` extraction; cite **section / schedule serial**, never a
page or extraction line. On 2026-11-04 the author re-fetched both sindhlaws.gov.pk PDFs (HTTP ok,
binary saved) but could not extract text in that session, so the primary-text rows below rest on
the survey's reading (marked `survey`). Rows the author re-read are marked `re-read`.
`srb.gos.pk` failed TLS verification ("unable to verify the first certificate") on every attempt;
never retry it with certificate checks disabled.

Version of the consolidated Act read: footnotes "Substituted entries by Sindh Act No. XX of 2026,
dated 01st July, 2026." and "Substituted sub-section by Sindh Act No. XVI of 2025, dated 02nd July,
2025." The Sindh Finance Act 2026 commences "on and from 1st day of July, 2026". **Re-verify every
rate and threshold after the next Sindh Finance Act (expected in force 2027-07-01).**

Source URLs (short names used in the table):

- `SSTA` — consolidated Sindh Sales Tax on Services Act 2011:
  https://www.sindhlaws.gov.pk/DownloadDocument.aspx?PubID=PUB-17-000040&Lang=EN (fetched 2026-11-04)
- `SFA26` — Sindh Finance Act 2026 (Sindh Act No. XX of 2026):
  https://www.sindhlaws.gov.pk/Setup/Publications_SindhCode/PUB-NEW-26-000096.pdf (fetched 2026-11-04)

| Id | Fact | Source (section / serial) | URL | Fetched | Kind |
| --- | --- | --- | --- | --- | --- |
| SRB-1 | Standard rate: sales tax on a taxable service "at the rate of fifteen per cent of value of the taxable service"; services listed in the Second Schedule carry the rate set against them there. Sub-section substituted by Sindh Act XVI of 2025 (2025-07-02). | SSTA s.8(1) | SSTA | 2026-11-04 | primary, survey |
| SRB-2 | The standard rate rose from 13% to 15% from 2024-07-01 ("The standard rate of Sindh sales tax (SST) is enhanced from 13% to 15%"). | EY tax alert, 2024-07-11 | https://www.ey.com/en_gl/technical/tax-alerts/2024-1353-pakistan-adopts-changes-to-provincial-sales-tax-laws | 2026-11-04 | secondary, survey |
| SRB-3 | Second Schedule Part II serial 34: CPC **872** "Repair services of other goods", **8%**. Substituted by SFA26 s.2(ix)(h), in force 2026-07-01. The rate before 2026-07-01 was **not retrieved**. | SSTA Second Schedule Part II s.no. 34; SFA26 s.2(ix)(h) | SSTA; SFA26 | 2026-11-04 | primary, survey |
| SRB-4 | Corroboration of SRB-3: the page lists "Repair services of other goods" at 8% among the Finance Act 2026 rates; it shows **no CPC code** and does not mention CPC 871. | taxationpk.com | https://taxationpk.com/srb-sales-tax-rates-2026-in-sindh-finance-act-2026/ | 2026-11-04 | secondary, **re-read** |
| SRB-5 | First Schedule serial 26, CPC **871** "Maintenance and repair services of fabricated metal products, machinery and equipment": exempt when provided "(3) by workshops for electric or electronic equipment or appliances, including computer hardware, whose annual turnover does not exceed rupees four million in a financial year" (clause (2) is the same limit for auto workshops). | SSTA First Schedule s.no. 26 | SSTA | 2026-11-04 | primary, survey |
| SRB-6 | First Schedule serial 44 (all services): exempt when provided "by a person whose total annual turnover does not exceed rupees four million in a financial year", **excluding** (1) services to withholding agents; (2) services to persons registered with SRB, or businesses registered with FBR under the Sales Tax Act 1990 or the Income Tax Ordinance 2001; (3) categories with their own turnover threshold; (4) services not exempt on a turnover basis on 2025-06-30. | SSTA First Schedule s.no. 44 | SSTA | 2026-11-04 | primary, survey |
| SRB-7 | Pre-enactment wording of SRB-6 (bill stage, "proposed"); the enacted text is SRB-6. The RSM summary reads: "A generic exemption on all services is proposed to be given to small businesses whose annual turner is less than 4 million rupees". | RSM, Sindh Finance Bill 2025-26 | https://www.rsm.global/pakistan/sites/default/files/media/documents/Sindh%20Finance%20Bill%202025-26.pdf | 2026-11-04 | secondary, survey |
| SRB-8 | Regime: Sindh moved from a positive list to a **negative list** — all services taxable except those listed as exempt (report dated 2026-02-23; the enacting Act passed 2025-06-25, assented 2025-06-30). | pkrevenue.com; customstoday.media | https://pkrevenue.com/sindh-shifts-entire-tax-system-to-negative-list-tariff-regime-srb/ ; https://customstoday.media/sindh-shifts-entire-tax-system-to-negative-list-tariff-regime-srb/ | 2026-11-04 | secondary, survey |
| SRB-9 | Registration "will be required for all persons who: (a) are residents; (b) provide any taxable service; (c) fulfil any other criteria or requirements which the Board may prescribe" (clause (b) substituted by Sindh Act XVI of 2025). s.24 states **no numeric threshold**; turnover limits sit in the First Schedule (SRB-5, SRB-6). | SSTA s.24(1) | SSTA | 2026-11-04 | primary, survey |
| SRB-10 | De-registration period in s.25A: "three months" replaced by "one hundred and eighty days". | SFA26 s.2(i) | SFA26 | 2026-11-04 | primary, survey |
| SRB-11 | Value of a taxable service = "the consideration in money including all Federal and Provincial duties and taxes, if any, ... but excluding the amount of sales tax under this Act". (How parts supplied inside a repair are treated: **not found**, U3.) | SSTA s.5 | SSTA | 2026-11-04 | primary, survey |
| SRB-12 | A registered person keeps, in English, Urdu or Sindhi, records of taxable services provided "(including exempt services)" with description, value, and **name and address of the recipient**; records of tax invoices and debit/credit notes issued (c) and received (d). | SSTA s.26(1) | SSTA | 2026-11-04 | primary, survey |
| SRB-13 | Retention: **ten years** after the end of the tax period for periods ending on or before 2025-06-30; **six years** from the end of the financial year for periods starting 2025-07-01 or later; or until a pending proceeding is finally decided. | SSTA s.27(1) | SSTA | 2026-11-04 | primary, survey |
| SRB-14 | New penalty row 2AA: a person who "designs, develops, customizes or supplies invoicing software" issuing invoices not conforming to rule 29(1) of the SST Rules 2011 or rule 6 of the SST Special Procedure (Online Integration of Business) Rules 2022 — penalty up to Rs 1,000,000, not less than Rs 100,000. **Relevant to FixFlow only if it ever issues SRB tax invoices.** | SFA26 s.2(ii) (SSTA s.43 table) | SFA26 | 2026-11-04 | primary, survey |
| SRB-15 | Rule 29(1) particulars as reported: SRB-registered service providers issue **serially numbered** sales tax invoices that **mention the SNTN** (the NTN prefixed "S"). Reports SRB Circular 4/2019; page undated; the Rules have been amended since. | pkrevenue.com | https://pkrevenue.com/sales-tax-registration-number-is-mandatory-on-invoices-srb/ | 2026-11-04 | secondary only, survey |

## Unknowns (WEB_UNAVAILABLE on 2026-11-04) and who answers

| Id | Unknown | Why it matters to FixFlow | Who answers, where |
| --- | --- | --- | --- |
| U1 | SST Rules 2011 rule 29 primary text (srb.gos.pk TLS failure; sindhlaws search did not return the Rules) | the invoice particulars an SRB tax invoice must carry; SRB-14 penalises software that gets them wrong | accountant / SRB, P9-0b; until then FixFlow issues **no** tax invoice |
| U2 | SST Special Procedure (Online Integration of Business) Rules 2022: category list and thresholds | whether a repair shop must integrate its invoicing with SRB | accountant, P9-0b |
| U3 | Parts supplied during a repair: part of the service value (SRB-11) or a separate federal goods supply | splits `job_material` value between SRB and FBR | accountant, P9-0b; per-line classification is exposed, never coded (BACKEND-REQUIREMENTS:622-624) |
| U4 | Contents of CPC 871 vs CPC 872 classes | household-appliance repair could sit under the serial 26 exemption (SRB-5) or serial 34 at 8% (SRB-3) or the 15% standard rate | accountant / SRB, P9-0b |
| U5 | The serial 34 rate in force before 2026-07-01 | a back-period projection would use the wrong rate | accountant, only if a projection covers periods before 2026-07-01 |
