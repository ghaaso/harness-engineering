"""Deterministic, seeded prose for the scenario's documents (field surveys, minutes, incidents, specs).

The text is filler with realistic structure. It must never contain the scenario's planted
values; scenario.audit() checks that after generation.
"""
from __future__ import annotations

import random
import re

FIRST = ["Aoife", "Brendan", "Ciara", "Declan", "Eimear", "Fergal", "Grainne", "Hugh", "Ita", "Jarlath", "Kate",
         "Liam", "Maeve", "Niall", "Orla", "Padraig", "Roisin", "Sean", "Tadhg", "Una", "Victor", "Wendy", "Alan",
         "Bronagh", "Colm", "Deirdre", "Eoin", "Fiona", "Gavin", "Helen", "Ivan", "Joan", "Kevin", "Lorna", "Martin",
         "Nuala", "Oisin", "Paula", "Ronan", "Sinead"]
LAST = ["Brennan", "Carroll", "Doherty", "Egan", "Fahy", "Gallagher", "Hennessy", "Igoe", "Joyce", "Kavanagh",
        "Lynch", "Madden", "Nolan", "O'Connor", "Phelan", "Quinlan", "Rafferty", "Sheehan", "Tierney", "Walsh",
        "Ahern", "Boyle", "Coughlan", "Duggan", "Fitzgerald", "Geraghty", "Hogan", "Keane", "Lennon", "Moran",
        "Nash", "O'Brien", "Power", "Quigley", "Ryan", "Slattery", "Tobin", "Ward", "Whelan", "Kinsella"]
STREETS = ["Mill Lane", "Quay Street", "Abbey Road", "Church View", "Bridge Street", "Castle Park", "Orchard Drive",
           "Station Road", "Ferry Lane", "Market Square", "Hawthorn Close", "Riverside Walk", "Weir Road",
           "Chapel Hill", "Fair Green", "Barrack Street", "Canal Bank", "Glebe Road", "Kiln Lane", "Pound Street",
           "Ash Grove", "Birch Avenue", "Cedar Court", "Elm Park", "Linden Way", "Maple Rise", "Oak Terrace",
           "Rowan Crescent", "Sycamore Lane", "Willow Bend", "Harbour Row", "Dock Road", "Tannery Lane",
           "Foundry Street", "Malting Yard", "Granary Close", "Sluice Road", "Lock Keeper's Way", "Towpath Lane",
           "Boathouse Road"]
DISTRICTS = ["Millbrook", "Quayside", "Abbeyfield", "Churchtown", "Bridgend", "Castlegate", "Orchardstown",
             "Stationfield", "Ferrybank", "Marketgate", "Hawthorn", "Riverside", "Weirview", "Chapelhill",
             "Fairgreen", "Barrackfield", "Canalside", "Glebe", "Kilnhill", "Poundfield", "Ashbrook", "Birchwood",
             "Cedarvale", "Elmfield"]
COMPONENTS = ["register", "pulse sensor", "radio module", "battery pack", "valve seat", "strainer", "chamber lid",
              "antenna lead", "body seal", "outlet coupling", "check valve", "data logger", "inlet gasket",
              "meter box frame", "tamper seal"]
CONDITIONS = ["good", "fair", "poor", "corroded", "flooded chamber", "lid missing", "buried under gravel",
              "obstructed by vehicle", "cracked lid", "seal broken", "display faded", "no radio contact",
              "condensation inside glass", "frame loose", "root intrusion"]
PCTS = [3, 4, 5, 6, 7, 8, 9, 11, 14, 17, 18, 22, 23, 27, 31, 36, 41]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
          "November", "December"]

T: dict[str, list[str]] = {
    "obs": [
        "On {street} the inspector found {n} chambers where the {component} was in {condition} condition.",
        "Access to the meter at No. {n} {street} was blocked; the occupier arranged a second visit on {date}.",
        "Several boxes along {street} had standing water to within a few centimetres of the {component}.",
        "The {component} on serial {serial} showed signs of tampering and was photographed before resealing.",
        "Radio contact was intermittent on the {street} cluster, with {n} of {n2} units missing at least one daily packet.",
        "Chamber lids on {street} are the older cast pattern and {n} of them were {condition}.",
        "The {component} on the corner unit at {street} and {street2} was replaced under the routine programme.",
        "Readings taken by hand on {date} matched the radio readings within normal tolerance for {n} meters.",
        "Residents on {street} reported low pressure in the evenings; no fault was found at the meter.",
        "About {pct}% of the boxes inspected on {street} need the frame re-bedded before winter.",
        "The {component} on serial {serial} was {condition}, which explains the gaps in its daily profile.",
        "A buried box at No. {n} {street} was located with the detector and raised to surface level.",
        "Two meters on {street} were found fitted in reverse; both were turned and the registers noted.",
        "The concentrator mast near {street} had a loose antenna lead, tightened on site on {date}.",
        "No evidence of leakage downstream of the meter was seen on {street}, despite the high night flow.",
        "The occupier at No. {n} {street} asked for a copy of the reading history, passed to customer care.",
        "The {component} on several units along {street} dates from the original installation and is near end of life.",
        "Battery voltage on the {street} radio units averaged lower than the rest of the zone.",
        "One chamber on {street} had been resurfaced over during road works and could not be opened.",
        "Meter serial {serial} was not on the asset list; it was added with the location {street}.",
    ],
    "method": [
        "Each chamber was opened, photographed and checked against the asset list before the register was read.",
        "Where radio data was available the hand reading was compared with the last daily packet.",
        "Chambers that could not be opened were recorded with a reason code and scheduled for a return visit.",
        "The {component} and {component2} were checked visually; anything suspect was logged with a photo reference.",
        "The survey followed the route sheet issued on {date}, starting at {street} and ending at {street2}.",
        "Inspectors worked in pairs where traffic management was needed, which slowed progress on {street}.",
        "Asset tags were checked against the billing system extract dated {date}.",
    ],
    "rec": [
        "Re-bed the meter box frames on {street} before the winter programme starts.",
        "Replace the {component} on the units listed in Appendix A marked '{condition}'.",
        "Add the units found off the asset list to the master register and confirm their billing accounts.",
        "Schedule a night-flow test for the {street} cluster to rule out leakage on the customer side.",
        "Move the concentrator antenna near {street} to improve radio coverage for the outlying units.",
        "Ask customer care to contact the occupiers who blocked access and arrange appointments.",
        "Raise the chamber lids that were resurfaced over on {street} with the roads contractor.",
        "Review the battery packs on the {street} radio units at the next scheduled visit.",
        "Fit locking lids on the boxes along {street} where tampering has been seen.",
    ],
    "bg": [
        "The zone was last surveyed in {month} of the previous year, when {n} chambers were recorded as needing work.",
        "Most of the housing stock in the zone dates from the 1970s, with a newer estate off {street}.",
        "The zone is supplied from the {district} reservoir through a single trunk main along {street}.",
        "Commercial premises are concentrated around {street} and {street2}.",
        "The radio network in this zone was commissioned in {month} and covers most units directly.",
    ],
    "meet": [
        "{name} gave an update on the survey programme; {n} zones are complete and the rest are scheduled.",
        "{name} raised the backlog of customer queries about estimated bills, currently around {n} open cases.",
        "The group discussed whether the route sheets should be reissued; {name} will check with the contractor.",
        "{name} noted that the radio coverage report is due from the vendor by {date}.",
        "Concern was raised about the number of chambers that could not be opened on the last round.",
        "{name} asked for a clearer view of which zones have been reconciled and which are pending.",
        "The meeting agreed to move the next review to {date} because of the public holiday.",
        "{name} reported that the roads contractor has agreed to raise the buried lids within six weeks.",
        "There was a short discussion of the customer care scripts for queries about reading gaps.",
        "{name} will circulate the updated asset list once the survey corrections are merged.",
        "The vendor's account manager joined for the first part and took questions on the radio network.",
        "{name} flagged that the {component} supply has a lead time of about {n} weeks.",
        "Training for the new field tablets is planned for {month}; {name} is coordinating.",
        "{name} summarised the complaints log: most items relate to access and appointment times.",
    ],
    "inc": [
        "At {time} the monitoring dashboard showed a drop in daily packets from the {district} concentrator.",
        "The on-call engineer {name} confirmed the fault remotely and opened a ticket with the vendor.",
        "Field staff attended at {time} and found the {component} on the concentrator {condition}.",
        "Service was restored at {time}; backfill of the missing packets completed overnight.",
        "Customer care was briefed in case of queries; {n} calls were logged that relate to this incident.",
        "The root cause analysis was reviewed at the weekly operations meeting on {date}.",
        "No customer bills were affected because the gap fell inside the reading tolerance window.",
        "The affected units were read by hand on {date} to confirm the registers.",
        "A follow-up action was raised to review the alarm thresholds on the dashboard.",
    ],
    "spec": [
        "The {field} field is transmitted little-endian and is reset only by a factory initialisation.",
        "Bit {n} of the status word is set when the {component} reports a fault on two consecutive wake-ups.",
        "Devices buffer up to {n} hourly records when the radio link is unavailable.",
        "The {field} value is sampled at each wake-up and averaged over the transmission interval.",
        "A configuration change takes effect at the next scheduled wake-up, not immediately.",
        "The checksum covers the header and payload but not the radio preamble.",
        "Reserved bits must be written as zero; receivers shall ignore them.",
        "The {field} field saturates at its maximum value rather than wrapping.",
        "Timestamps are seconds since the device epoch and are corrected by the concentrator on receipt.",
        "Alarm flags are latched until acknowledged by the head-end system.",
    ],
    "proc": [
        "Before starting a route, confirm the route sheet version against the planning system.",
        "Record every chamber that cannot be opened with one of the standard reason codes.",
        "Photographs are named with the meter serial and the date, and uploaded the same day.",
        "Hand readings are entered twice by different staff when they differ from the radio reading.",
        "Escalate any suspected tampering to the revenue protection team within one working day.",
        "Do not reseal a meter that shows signs of interference until the photographs are uploaded.",
        "Customer appointments are offered in two-hour windows and confirmed by text the day before.",
        "Asset changes are submitted on the change form and take effect after supervisor approval.",
        "Keep the traffic management plan with the vehicle and follow it for every chamber in the roadway.",
        "Report damaged chamber lids to the roads team with the location and a photograph.",
    ],
    "analysis": [
        "Across the sample, units older than {n} years showed a higher rate of under-registration at low flow.",
        "The distribution of night flow per property is skewed, with a small number of properties dominating.",
        "Replacement in order of age alone would miss the clusters where installation quality is the problem.",
        "We estimate that around {pct}% of the meters in the oldest cohort need attention within two years.",
        "The data does not support a single replacement date for the whole network.",
        "Zones on the older trunk mains show higher variability in daily consumption.",
        "The cost model assumes current contractor rates and does not include traffic management.",
        "A pilot in two zones would test whether targeted replacement delivers the expected gains.",
    ],
    "legal": [
        "The Supplier shall perform the Services with the skill and care of a competent provider of similar services.",
        "Each Party shall notify the other promptly of any matter that may affect performance of this Agreement.",
        "The Customer may request reasonable changes to the Services in accordance with the change procedure.",
        "Nothing in this Agreement limits liability for fraud or for death or personal injury caused by negligence.",
        "The Supplier shall keep complete and accurate records relating to the Services for six years.",
        "Notices shall be in writing and delivered to the addresses set out in Schedule A.",
        "The Supplier shall comply with the Customer's site rules when attending any Customer premises.",
        "Confidential Information shall be used only for the purposes of this Agreement.",
        "Any dispute shall first be referred to the contract managers, then to the steering group.",
    ],
}
FIELDS = ["status word", "battery level", "signal quality", "temperature", "backflow counter", "leak flag",
          "tamper counter", "wake-up interval", "packet sequence", "configuration version"]
FW_OLD = ["4.1.4", "4.1.5", "4.1.6", "4.1.7"]


class Gen:
    def __init__(self, rng: random.Random):
        self.r = rng

    def pick(self, seq):
        return seq[self.r.randrange(len(seq))]

    def name(self) -> str:
        return f"{self.pick(FIRST)} {self.pick(LAST)}"

    def date(self, year: int = 2026, month: int | None = None) -> str:
        m = month or self.r.randint(1, 8)
        return f"{year}-{m:02d}-{self.r.randint(1, 27):02d}"

    def serial(self) -> str:
        return "MC-" + "".join(self.pick("0123456789ABCDEF") for _ in range(6))

    def fill(self, template: str) -> str:
        slots = {
            "street": lambda: self.pick(STREETS), "street2": lambda: self.pick(STREETS),
            "n": lambda: str(self.r.randint(2, 38)), "n2": lambda: str(self.r.randint(40, 90)),
            "pct": lambda: str(self.pick(PCTS)), "date": self.date, "name": self.name,
            "component": lambda: self.pick(COMPONENTS), "component2": lambda: self.pick(COMPONENTS),
            "condition": lambda: self.pick(CONDITIONS), "serial": self.serial,
            "month": lambda: self.pick(MONTHS), "district": lambda: self.pick(DISTRICTS),
            "time": lambda: f"{self.r.randint(0, 23):02d}:{self.r.choice(['00', '15', '30', '45'])}",
            "field": lambda: self.pick(FIELDS), "fw_old": lambda: self.pick(FW_OLD),
        }
        return re.sub(r"\{(\w+)\}", lambda m: slots[m.group(1)](), template)

    def sentence(self, kind: str) -> str:
        return self.fill(self.pick(T[kind]))

    def paragraph(self, kind: str, lo: int = 3, hi: int = 6) -> str:
        return " ".join(self.sentence(kind) for _ in range(self.r.randint(lo, hi)))

    def bullets(self, kind: str, n: int) -> str:
        return "\n".join(f"- {self.sentence(kind)}" for _ in range(n))

    def numbered(self, kind: str, n: int) -> str:
        return "\n".join(f"{i}. {self.sentence(kind)}" for i in range(1, n + 1))

    @staticmethod
    def table(headers: list[str], rows: list[list[str]]) -> str:
        out = ["| " + " | ".join(headers) + " |", "|" + "|".join("---" for _ in headers) + "|"]
        out += ["| " + " | ".join(str(c) for c in row) + " |" for row in rows]
        return "\n".join(out)

    def pad_table(self, text: str, target: int, headers: list[str], row_fn) -> str:
        """Append a table whose rows come from row_fn until the document reaches target characters."""
        rows: list[list[str]] = []
        size = len(text) + 200
        while size < target:
            row = row_fn()
            rows.append(row)
            size += sum(len(str(c)) + 3 for c in row) + 2
        return text + ("\n\n" + self.table(headers, rows) + "\n" if rows else "\n")

    def prose_sections(self, kind: str, titles: list[str], level: str = "##", paras: tuple[int, int] = (2, 4)) -> str:
        parts = []
        for t in titles:
            body = "\n\n".join(self.paragraph(kind) for _ in range(self.r.randint(*paras)))
            parts.append(f"{level} {t}\n\n{body}")
        return "\n\n".join(parts)
