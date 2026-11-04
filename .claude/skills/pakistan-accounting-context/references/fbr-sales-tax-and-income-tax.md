<!-- Authored for FixFlow, 2026-11-04 -->
# FBR — federal Sales Tax Act 1990 (goods) and Income Tax Ordinance 2001: fact table (as fetched 2026-11-04)

Authority: Federal Board of Revenue (FBR). Goods (spare parts sold as goods) are federal; income
tax record-keeping applies to every taxpayer (docs/BACKEND-REQUIREMENTS-2026-07.md:622-624).
Every row is a fact, not advice.

**How these rows were read.** Statute PDFs were fetched on 2026-11-04 by the package survey and
read through a local `pdftotext -layout` extraction; cite the **section**, never a page or
extraction line. Every row rests on the survey's reading; FBR web-page rows say whether that
reading was verbatim or a fetch-tool summary.

Versions as printed:

- Sales Tax Act 1990: "As amended up to 30th June, 2026" / "The amendments made through Finance
  Act, 2026" (cover page).
- Income Tax Ordinance 2001: FBR listing label "Income Tax Ordinance, 2001, amended up to 30.06.2026".
- Income Tax Rules 2002: FBR listing label "Income Tax Rules, 2002, amended up to 15.09.2026" —
  **the PDF was not read** (over the 10 MB fetch limit).

**Re-verify every rate and threshold after the next federal Finance Act (expected in force
2027-07-01).**

Source URLs (short names used in the table):

- `STA` — Sales Tax Act 1990 (amended to 2026-06-30):
  https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf (fetched 2026-11-04)
- `ITO` — Income Tax Ordinance 2001 (amended to 2026-06-30): listing
  https://fbr.gov.pk/Categ/Income-Tax-Ordinance/326 , PDF
  https://download1.fbr.gov.pk/Docs/2026724177725705IncomeTaxOrdinanace2001.pdf (fetched 2026-11-04)
- `REG` — FBR "register for sales tax" page: https://fbr.gov.pk/categ/register-sales-tax/51148/50848/101156 (fetched 2026-11-04)
- `POS` — FBR POS legal provisions page: https://fbr.gov.pk/pos-legal-provisions/163085/163086 (fetched 2026-11-04)

| Id | Fact | Source (section) | URL | Fetched | Kind |
| --- | --- | --- | --- | --- | --- |
| FBR-1 | Sales tax is charged "at the rate of [eighteen] per cent of the value of (a) taxable supplies made ... by a registered person in the course or furtherance of any [taxable activity]". | STA s.3(1) | STA | 2026-11-04 | primary, survey |
| FBR-2 | Registration is required for (a) a manufacturer not running a cottage industry; (b) "a retailer who is liable to pay sales tax under the Act or rules made thereunder, excluding such retailer required to pay sales tax through his electricity bill under sub-section (9) of section 3"; (c) importer; (d) exporter seeking a refund; (e) wholesaler / dealer / distributor; (f) a person required to register under another Federal or Provincial law. | STA s.14(1) | STA | 2026-11-04 | primary, survey |
| FBR-3 | "Tier-1 retailer": (a) a unit of a national or international chain; (b) a retailer in an air-conditioned shopping mall, plaza or centre, excluding kiosks; (c) a retailer whose cumulative electricity bill over the preceding twelve consecutive months "exceeds Rupees [twelve] hundred thousand"; (d) a wholesaler-cum-retailer. | STA s.2(43A) | STA | 2026-11-04 | primary, survey |
| FBR-4 | **Fetch-tool summary, not verbatim.** The FBR registration page gives the Tier-1 electricity test as exceeding Rs 600,000 — **disagrees with FBR-3**; recorded, not reconciled (the Act text is the later amendment). Same page: only certain Tier-1 retailers must register; the cottage-industry manufacturer cut-off is annual turnover not exceeding Rs 10 million. | FBR web page | REG | 2026-11-04 | FBR page, survey (fetch-tool summary) |
| FBR-5 | Non-Tier-1 retailers pay "through their monthly electricity bills, at the rate of five percent where the monthly bill amount does not exceed rupees twenty thousand and at the rate of seven and half percent" above that; "Tier-1 retailers shall pay sales tax at the rate as applicable to the goods sold". | STA s.3(9), s.3(9A) | STA | 2026-11-04 | primary, survey |
| FBR-6 | Records kept at the business premises, in English or Urdu, include: supplies made with recipient name and address and tax charged (a); purchases with the supplier's registration number (b); "(da) double entry sales tax accounts"; and (e) invoices, credit and debit notes, bank statements, inventory records, utility bills, salary and labour bills, **cash book**, rental agreements. | STA s.22(1) | STA | 2026-11-04 | primary, survey |
| FBR-7 | A registered person "shall issue a tax invoice including an advance receipt invoice, bearing a verifiable and unique FBR invoice number"; per the substituted provisos (Finance Act 2026) that condition applies "from the time as notified by the Board". Particulars include supplier name, address and registration number, date, description, quantity, and value exclusive of tax. | STA s.23(1) (rewritten by Finance Act 2026) | STA | 2026-11-04 | primary, survey |
| FBR-8 | "Retention of record and documents for six years": an officer shall not call for records "after expiry of six years from the end of the financial year to which they relate". | STA s.24 | STA | 2026-11-04 | primary, survey |
| FBR-9 | "(1) Unless otherwise authorised by the Commissioner, every taxpayer shall maintain in Pakistan such accounts, documents and records as may be prescribed." (2) a deduction may be disallowed or reduced without a receipt; (3) records kept for **six years** after the end of the tax year, or until a pending proceeding is decided; (5) the Board may require a person to install and use an electronic resource, or to act as an integrated enterprise. | ITO s.174(1)-(5) | ITO | 2026-11-04 | primary, survey |
| FBR-10 | POS / e-invoicing legal provisions listed: S.R.O 69(I)/2025 dated 29.01.2025 (Sales Tax Rules 2006 Chapter XIV, licensing, electronic sales tax invoices and integration of registered persons); S.R.O 1279(I)/2021 (Rupee one per invoice issued through integrated POS); latest dated item S.R.O 2071(I)/2025 dated 03.11.2025. Other items on the page were not recorded. **Contents of the SROs not read.** | FBR web page | POS | 2026-11-04 | FBR page, survey |
| FBR-11 | Tier-1 POS network expansion and enforcement reports (outlet sealing after a 48 h disconnect). Search-result summary only; page not fetched. | news (2026-04-26) | https://profit.pakistantoday.com.pk/2026/04/26/fbr-expands-pos-network-nearly-36000-retail-and-restaurant-outlets-now-linked | 2026-11-04 (search) | secondary, unfetched |

## Unknowns (WEB_UNAVAILABLE on 2026-11-04) and who answers

| Id | Unknown | Why it matters to FixFlow | Who answers, where |
| --- | --- | --- | --- |
| U6 | Income Tax Rules 2002 prescribed records (rule 29) — PDF https://download1.fbr.gov.pk/Docs/20269211394336470IncomeTaxRules2002.pdf over the 10 MB fetch limit | what "such accounts ... as may be prescribed" (FBR-9) means for a small service business | accountant, P9-0b |
| U7 | Contents of S.R.O 69(I)/2025, S.R.O 2071(I)/2025 and any other item on the POS page (not recorded) | whether any FBR e-invoicing / POS integration duty can reach this shop | accountant, P9-0b (only if FBR-2/FBR-3 can apply) |
| U8 | Sales Tax Rules 2006 invoice particulars (STA s.23 read; the Rules not) | the complete federal invoice field list | accountant, only if the shop is FBR sales-tax registered |
| U9 | Whether any parts-only counter sale exists, and the shop's 12-month electricity bill against FBR-3 / FBR-4 | decides whether the federal goods regime touches the shop at all | owner, P0a item 16 → P9-0b |
