"""
SLCP Verifier Tool - Quality Checker
====================================

Reads a filled offline SLCP Verifier Tool (.xlsm, version 1.7 or later) and checks the verifier's inputs:
  Verification Selection (col Y), Corrected Response (col AB), Verification Data (col AH),
  Non-Compliance (col AN) and Legal Reference (col AP), against the Facility Response (col S).

Inputs are read from the 'SLCP Data Collection Tool' sheet (what the verifier sees).
Question metadata (data type, option list, show/hide logic, verification type ...) is read from
'Main Survey Actual', which also holds a plain copy of the inputs (checked for sync).

Usage:
    py vt_quality_checker.py "<Verifier Tool.xlsm>" [-o "<report.xlsx>"]

The report is written next to the tool as "<tool name> - QC Report <yymmdd>.xlsx" unless -o is given.
The tool file itself is never modified (it is copied to a temp folder and read from there).
"""

import argparse
import datetime as dt
import os
import re
import shutil
import sys
import tempfile
import unicodedata
import warnings
from collections import OrderedDict, defaultdict

warnings.filterwarnings("ignore")

try:
    import openpyxl
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import column_index_from_string as col_idx
except ImportError:  # pragma: no cover
    sys.exit("openpyxl is required:  py -m pip install openpyxl")

CHECKER_VERSION = "1.2 (2026-10-24)"
PUBLIC_BUILD = True    # build_public.py sets True: only tool versions released to the public are accepted

# --------------------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------------------
DCT_SHEET = "SLCP Data Collection Tool"   # 1.7.x tools add a suffix: "SLCP Data Collection Tool 1.7"
MSA_SHEET = "Main Survey Actual"
DCT_FIRST_ROW = 17
DCT_COLS = {"num": "D", "text": "E", "fac": "S", "sel": "Y", "cor": "AB", "exp": "AH",
            "nc": "AN", "lr": "AP", "needs": "AX", "key": "AZ", "vis": "BA"}

# Thresholds (rule 5)
HOURS_REST_LIMIT = 60          # weekly hours above this ...
REST_DAYS_WITH_LONG_HOURS = 2  # ... cannot come with this many (or more) weekly rest days
REST_DAYS_UNLIKELY_ILLEGAL = 2  # rest days ABOVE this make "not in line with legal" unlikely
INTERNATIONAL_MIN_AGE = 14     # youngest worker below this => under legal minimum age must be Yes
SUPERVISOR_SHARE_MAX = 0.5     # supervisors above 50 % of workers is implausible
# Thresholds calibrated on 1,000 anonymised platform VRFs (v1.4-1.7.1, 2026-10): each fires on < 7 % of reports
TAKEHOME_MIN_SHARE = 0.8       # take-home pay below 80 % of basic wage (below 100 % is common: deductions)
LEAD_TIME_MAX_WEEKS = 52       # lead time above a year in weeks - days entered?
MIN_M2_PER_WORKER = 2          # built area per worker below this - wrong unit?

SEV_ORDER = {"Error": 0, "Warning": 1, "Info": 2}

LOCAL_LANGUAGE_PATTERN = re.compile(r"in local language", re.I)
PLACEHOLDERS = {"n/a", "na", "n.a.", "n.a", "none", "nil", "-", "--", ".", "null", "tbd", "tba",
                "unknown", "xxx", "x", "test", "0", "not applicable", "no", "nothing"}

# Rule catalogue: id -> (category, title, default severity)
RULES = OrderedDict([
    # 1 Language
    ("LANG-01", ("Language", "Verification Data must be in English (except 'in local language' questions)", "Error")),
    ("LANG-02", ("Language", "Corrected Response must be in English (except 'in local language' questions)", "Error")),
    ("LANG-03", ("Language", "Facility answered in a non-English language but the selection is 'Accurate'", "Error")),
    ("LANG-04", ("Language", "Verifier-entered answer (Verification Details) must be in English", "Error")),
    # 2 Verification selection
    ("SEL-01", ("Verification Selection", "'Accurate' must not have a Corrected Response", "Error")),
    ("SEL-02", ("Verification Selection", "'Inaccurate*' / 'Updated during Verification': Corrected Response must differ from the Facility Response", "Error")),
    ("SEL-03", ("Verification Selection", "'Inaccurate*' / 'Updated during Verification': Corrected Response is required", "Error")),
    ("SEL-04", ("Verification Selection", "'Inaccurate*' / 'Updated during Verification': Verification Data is required", "Error")),
    ("SEL-05", ("Verification Selection", "'Not visible to facility during SA/JA': Facility Response must be blank", "Error")),
    ("SEL-06", ("Verification Selection", "'Not visible to facility during SA/JA': Corrected Response is normally expected", "Warning")),
    ("SEL-07", ("Verification Selection", "'No longer applicable due to assessment/verification': no Corrected Response or Verification Data", "Error")),
    ("SEL-08", ("Verification Selection", "Facility Response given but Verification Selection is blank", "Error")),
    ("SEL-09", ("Verification Selection", "Follow-up question: Verification Selection cannot be blank or N/A", "Error")),
    ("SEL-10", ("Verification Selection", "Verification Selection is not a valid option for this question", "Error")),
    ("SEL-11", ("Verification Selection", "'Facility did not reply during SA/JA' but a Facility Response exists", "Warning")),
    ("SEL-12", ("Verification Selection", "'Accurate' selected on a question the facility did not answer", "Warning")),
    ("SEL-13", ("Verification Selection", "Input in a column this verification type does not use (Corrected Response / Non-Compliance)", "Error")),
    ("SEL-14", ("Verification Selection", "Verification Data required (mandatory narrative / special circumstances)", "Warning")),
    ("SEL-15", ("Verification Selection", "Verification Data looks like placeholder / sample text or is too short", "Warning")),
    ("SEL-16", ("Verification Selection", "Verification-only question has a Facility Response (col S should be blank)", "Warning")),
    # 3 Data types
    ("DATA-01", ("Data Type", "Whole number required (no decimals, no negatives, no text)", "Error")),
    ("DATA-02", ("Data Type", "Number required (no negatives, no text)", "Error")),
    ("DATA-03", ("Data Type", "Percentage must be between 0 and 100", "Error")),
    ("DATA-04", ("Data Type", "Geolocation out of range / implausible for the facility country", "Error")),
    ("DATA-05", ("Data Type", "Date must be a valid YYYY-MM-DD date and not in the future", "Error")),
    ("DATA-06", ("Data Type", "Answer is not one of the question's options", "Error")),
    ("DATA-07", ("Data Type", "Checkbox value must be 'X' or blank", "Error")),
    ("DATA-08", ("Data Type", "Percentage between 0 and 1 - entered as a fraction?", "Warning")),
    # 4 Legal flag
    ("LEGAL-01", ("Legal Flag", "Non-Compliance 'X' requires a Legal Reference (not blank / N/A)", "Error")),
    ("LEGAL-02", ("Legal Flag", "Legal-requirement question answered as a violation: Non-Compliance 'X' and Legal Reference required", "Error")),
    ("LEGAL-03", ("Legal Flag", "Non-Compliance 'X' on an answer that is compliant / has no applicable legal requirement", "Warning")),
    ("LEGAL-04", ("Legal Flag", "Legal Reference entered without Non-Compliance 'X'", "Info")),
    ("LEGAL-05", ("Legal Flag", "Non-Compliance value must be 'X'", "Error")),
    # 5 Specific Q&A
    ("SPEC-01", ("Specific Q&A", "Working hours over 60 per week cannot come with 2+ weekly rest days", "Error")),
    ("SPEC-02", ("Specific Q&A", "More than 2 weekly rest days but rest days 'not in line with legal requirements'", "Warning")),
    ("SPEC-03", ("Specific Q&A", "Forced overtime and voluntary overtime cannot both be 'Yes'", "Error")),
    ("SPEC-04", ("Specific Q&A", "Start/First date cannot be later than End/Last date", "Error")),
    ("SPEC-05", ("Specific Q&A", "Social audits / certifications duplicated", "Warning")),
    ("SPEC-06", ("Specific Q&A", "Subcontractors duplicated", "Error")),
    ("SPEC-07", ("Specific Q&A", "Youngest worker under 14 but 'workers under legal minimum age when hired' is not 'Yes'", "Error")),
    ("SPEC-08", ("Specific Q&A", "Average monthly volume larger than monthly capacity", "Error")),
    ("SPEC-09", ("Specific Q&A", "Contact Name must contain a name", "Error")),
    ("SPEC-10", ("Specific Q&A", "Contact / phone number must contain digits", "Error")),
    ("SPEC-12", ("Specific Q&A", "Cases of harassment / violence / abuse reported but male & female breakdown both zero", "Error")),
    ("SPEC-13", ("Specific Q&A", "Email address format", "Warning")),
    ("SPEC-14", ("Specific Q&A", "Working-hours answers inconsistent (60/72/80/90 h thresholds, weekly vs daily)", "Error")),
    ("SPEC-15", ("Specific Q&A", "Youngest-worker age inconsistent with the under-18 / under-minimum-age counts", "Error")),
    ("SPEC-16", ("Specific Q&A", "'How many cases' must be at least 1 when the evidence question triggers it", "Error")),
    ("SPEC-17", ("Specific Q&A", "Duplicate nationality / language / union entries", "Error")),
    ("SPEC-18", ("Specific Q&A", "Verification sampling data contradicts the survey answers", "Warning")),
    ("SPEC-19", ("Specific Q&A", "OS ID format (2-letter country + 7 digits + 6 characters)", "Warning")),
    ("SPEC-20", ("Specific Q&A", "Subcontractor count does not match the subcontractor details entered", "Warning")),
    # 6 Relevance / logic
    ("REL-01", ("Relevance", "Answered, but the parent question's (effective) answer means it does not apply", "Error")),
    ("REL-02", ("Relevance", "'No longer applicable' selected, but the parent answer still triggers the question", "Warning")),
    ("REL-03", ("Relevance", "'None of the above' type option selected together with other options", "Error")),
    ("REL-04", ("Relevance", "Breakdown larger than its total (e.g. male workers > total workers)", "Error")),
    ("REL-05", ("Relevance", "Implausible proportion (e.g. supervisors > 50 % of workers, parts do not add up)", "Warning")),
    ("REL-06", ("Relevance", "Visible question requiring an answer is unanswered", "Warning")),
    # 7 Plausibility (data-calibrated)
    ("PLAUS-01", ("Plausibility", "Count that cannot be zero (nationalities, languages, wage grades)", "Warning")),
    ("PLAUS-02", ("Plausibility", "Maximum lead time over 52 weeks - entered in days?", "Warning")),
    ("PLAUS-03", ("Plausibility", "Wage of 0 for one gender while the other gender has a wage", "Warning")),
    ("PLAUS-04", ("Plausibility", "Built area below 2 m2 per worker - wrong unit?", "Warning")),
    # 8 Other
    ("SYNC-01", ("Other", "Main Survey Actual is out of sync with the Data Collection Tool sheet", "Warning")),
    ("INFO-01", ("Other", "Rule could not run on this template (question not found)", "Info")),
])


# --------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------
def blank(v):
    if v is None:
        return True
    if isinstance(v, float) and v != v:
        return True
    return str(v).strip() == ""


def s(v):
    """Display string."""
    if blank(v):
        return ""
    if isinstance(v, dt.datetime):
        return v.strftime("%Y-%m-%d")
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip()


DASHES = dict.fromkeys(map(ord, "–—‒−"), "-")


def norm(v):
    """Normalised comparison string."""
    if blank(v):
        return ""
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        f = float(v)
        return str(int(f)) if f.is_integer() else repr(round(f, 9))
    if isinstance(v, dt.datetime):
        return v.strftime("%Y-%m-%d")
    t = unicodedata.normalize("NFKC", str(v)).translate(DASHES).replace("’", "'")
    t = re.sub(r"\s+", " ", t).strip().lower()
    n = to_num(t)
    if n is not None:
        return str(int(n)) if float(n).is_integer() else repr(round(n, 9))
    return t


NUM_RE = re.compile(r"^[+-]?(\d+(\.\d*)?|\.\d+)$")


def to_num(v):
    if blank(v):
        return None
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    t = str(v).strip().replace(",", "") if re.fullmatch(r"[+-]?\d{1,3}(,\d{3})+(\.\d+)?", str(v).strip()) else str(v).strip()
    t = t.rstrip("%").strip()
    if NUM_RE.match(t):
        return float(t)
    return None


def to_date(v):
    if blank(v):
        return None
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    if isinstance(v, (int, float)) and 1 < v < 80000:  # Excel serial
        return (dt.datetime(1899, 12, 30) + dt.timedelta(days=float(v))).date()
    t = str(v).strip()
    m = re.fullmatch(r"(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T]00:00(:00)?)?", t)
    if m:
        try:
            return dt.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    return None


def short(v, n=180):
    t = s(v).replace("\n", " / ")
    return t if len(t) <= n else t[: n - 1] + "…"


# ---------- language detection ----------
NON_LATIN = re.compile(
    "[Ͱ-ϿЀ-ӿ԰-֏֐-׿؀-ۿ܀-ݏऀ-෿"
    "฀-໿ༀ-࿿က-႟Ⴀ-ჿᄀ-ᇿሀ-፿ក-៿"
    "᠀-᢯　-〿぀-ヿ㄀-ㄯ㄰-㆏㐀-䶿一-鿿"
    "ꀀ-꓏가-힯豈-﫿＀-｠]")
SCRIPT_NAMES = [
    ("一", "鿿", "Chinese/Japanese (CJK)"), ("㐀", "䶿", "CJK"), ("぀", "ヿ", "Japanese"),
    ("가", "힯", "Korean"), ("ᄀ", "ᇿ", "Korean"), ("฀", "๿", "Thai"),
    ("຀", "໿", "Lao"), ("ក", "៿", "Khmer"), ("က", "႟", "Myanmar"),
    ("ঀ", "৿", "Bengali"), ("ऀ", "ॿ", "Devanagari (Hindi/Nepali)"),
    ("஀", "௿", "Tamil"), ("඀", "෿", "Sinhala"), ("؀", "ۿ", "Arabic/Urdu"),
    ("Ѐ", "ӿ", "Cyrillic"), ("֐", "׿", "Hebrew"), ("ሀ", "፿", "Ethiopic (Amharic)"),
    ("Ͱ", "Ͽ", "Greek"), ("Ⴀ", "ჿ", "Georgian"), ("԰", "֏", "Armenian"),
    ("　", "〿", "CJK punctuation"), ("＀", "｠", "full-width (CJK) characters"),
]
VIET = re.compile("[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹĂÂĐÊÔƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ]")
TURK = re.compile("[ğışİĞŞ]")
EN_WORDS = set("""the and of to in is are was were for with on by not no that this at as be have has had from or
which it its an a all any there their they them been will would can may should if than then also only
workers worker facility management records record verified verification confirmed interview interviews
reviewed review documents document provided found during employee employees policy procedure""".split())
FOREIGN_WORDS = {
    "Spanish": set("el la los las del por para con una uno que trabajadores empresa también según sobre pero está son fue".split()),
    "Portuguese": set("não são uma dos das com para pelo pela trabalhadores empresa também foi está".split()),
    "Indonesian/Malay": set("yang dan di dengan untuk tidak ini itu pada dari karyawan pekerja adalah sudah belum ada akan oleh atau dalam".split()),
    "Turkish": set("ve bir bu için ile değil işçi işçiler olan olarak var yok çalışan".split()),
    "French": set("le les des est une pour avec dans sur pas sont travailleurs entreprise aussi".split()),
    "Vietnamese": set("cong nhan va cua trong khong duoc cho voi cac nhung".split()),
    "Italian": set("il gli della delle sono una per con lavoratori anche".split()),
}


def language_problem(text):
    """Return (severity, description) if text looks non-English, else None."""
    if blank(text):
        return None
    t = s(text)
    hits = NON_LATIN.findall(t)
    if hits:
        scripts = []
        for ch in hits:
            for lo, hi, name in SCRIPT_NAMES:
                if lo <= ch <= hi and name not in scripts:
                    scripts.append(name)
        sample = "".join(hits[:8])
        return "Error", f"contains non-English script ({', '.join(scripts) or 'non-Latin'}): '{sample}'"
    if len(VIET.findall(t)) >= 2:
        return "Warning", "contains Vietnamese characters (" + "".join(VIET.findall(t)[:6]) + ")"
    if TURK.search(t):
        return "Warning", "contains Turkish characters (" + "".join(TURK.findall(t)[:6]) + ")"
    words = re.findall(r"[a-zà-ÿ]+", t.lower())
    if len(words) >= 6:
        en = sum(w in EN_WORDS for w in words)
        for lang, vocab in FOREIGN_WORDS.items():
            f = sum(w in vocab for w in words)
            if f >= 3 and f > en:
                return "Warning", f"looks like {lang} rather than English ({f} {lang} vs {en} English common words)"
    return None


# ---------- country bounding boxes (lat_min, lat_max, lon_min, lon_max) ----------
COUNTRY_BBOX = {
    "bangladesh": (20.5, 26.7, 88.0, 92.7), "china": (18.0, 53.6, 73.5, 135.1), "india": (6.5, 35.7, 68.1, 97.4),
    "indonesia": (-11.1, 6.1, 94.9, 141.1), "vietnam": (8.3, 23.4, 102.1, 109.5), "cambodia": (10.4, 14.7, 102.3, 107.7),
    "pakistan": (23.6, 37.1, 60.9, 77.8), "sri lanka": (5.9, 9.9, 79.5, 81.9), "türkiye": (35.8, 42.1, 25.6, 44.8),
    "myanmar": (9.6, 28.6, 92.1, 101.2), "thailand": (5.6, 20.5, 97.3, 105.7), "malaysia": (0.8, 7.4, 99.6, 119.3),
    "philippines": (4.5, 21.2, 116.9, 126.7), "ethiopia": (3.4, 14.9, 33.0, 48.0), "egypt": (22.0, 31.7, 24.7, 36.9),
    "morocco": (20.7, 35.9, -17.1, -1.0), "tunisia": (30.2, 37.6, 7.5, 11.6), "jordan": (29.2, 33.4, 34.9, 39.3),
    "mexico": (14.5, 32.7, -118.4, -86.7), "guatemala": (13.7, 17.8, -92.3, -88.2), "honduras": (12.9, 17.5, -89.4, -83.1),
    "el salvador": (13.1, 14.5, -90.2, -87.7), "nicaragua": (10.7, 15.1, -87.7, -82.7), "haiti": (18.0, 20.1, -74.5, -71.6),
    "dominican republic": (17.5, 20.0, -72.0, -68.3), "peru": (-18.4, 0.0, -81.4, -68.6), "colombia": (-4.3, 13.5, -81.8, -66.8),
    "brazil": (-33.8, 5.3, -74.0, -34.7), "portugal": (30.0, 42.2, -31.3, -6.2), "italy": (35.5, 47.1, 6.6, 18.6),
    "spain": (27.6, 43.8, -18.2, 4.4), "romania": (43.6, 48.3, 20.2, 29.7), "bulgaria": (41.2, 44.2, 22.3, 28.6),
    "kenya": (-4.7, 5.0, 33.9, 41.9), "madagascar": (-25.7, -11.9, 43.2, 50.5), "lesotho": (-30.7, -28.6, 27.0, 29.5),
    "south africa": (-34.9, -22.1, 16.4, 32.9), "tanzania": (-11.8, -0.9, 29.3, 40.5), "uganda": (-1.5, 4.3, 29.5, 35.1),
    "nepal": (26.3, 30.5, 80.0, 88.3), "laos": (13.9, 22.5, 100.0, 107.7), "taiwan, province of china": (21.8, 25.4, 118.1, 122.1),
    "hong kong, sar china": (22.1, 22.6, 113.8, 114.5), "macau, sar china": (22.1, 22.3, 113.5, 113.7),
    "korea- south": (33.1, 38.7, 124.5, 131.9), "japan": (24.0, 45.6, 122.9, 146.0), "uzbekistan": (37.1, 45.6, 56.0, 73.2),
    "georgia": (41.0, 43.6, 40.0, 46.7), "armenia": (38.8, 41.3, 43.4, 46.7), "moldova": (45.4, 48.5, 26.6, 30.2),
    "ukraine": (44.3, 52.4, 22.1, 40.2), "poland": (49.0, 54.9, 14.1, 24.2), "serbia": (42.2, 46.2, 18.8, 23.0),
    "north macedonia": (40.8, 42.4, 20.4, 23.1), "albania": (39.6, 42.7, 19.3, 21.1), "bosnia and herzegovina": (42.5, 45.3, 15.7, 19.7),
    "ghana": (4.7, 11.2, -3.3, 1.2), "nigeria": (4.2, 13.9, 2.7, 14.7), "rwanda": (-2.9, -1.0, 28.8, 30.9),
    "mauritius": (-20.6, -10.3, 56.5, 63.5), "jordan ": (29.2, 33.4, 34.9, 39.3), "united kingdom": (49.8, 60.9, -8.7, 1.8),
    "germany": (47.2, 55.1, 5.8, 15.1), "france": (41.3, 51.1, -5.2, 9.6), "singapore": (1.1, 1.5, 103.6, 104.1),
    "united arab emirates": (22.6, 26.1, 51.5, 56.4), "el salvador ": (13.1, 14.5, -90.2, -87.7),
}


# --------------------------------------------------------------------------------------
# Model
# --------------------------------------------------------------------------------------
class Item:
    __slots__ = ("key", "row", "msa_row", "num", "text", "mtype", "dtype", "vtype", "sel_list", "opt_list",
                 "ms_key", "ms_unique", "show", "noncom_list", "narrative", "section", "subsection",
                 "fac", "sel", "cor", "exp", "nc", "lr", "vis", "needs", "msa_vals", "order")

    def __init__(self, **kw):
        for k in self.__slots__:
            setattr(self, k, kw.get(k))


class Issue:
    def __init__(self, rule, item, msg, severity=None, field=""):
        self.rule = rule
        self.item = item
        self.msg = msg
        self.severity = severity or RULES[rule][2]
        self.field = field


class UnsupportedTool(Exception):
    pass


class Checker:
    def __init__(self, path):
        self.path = path
        self.issues = []
        self.skipped = []
        self.load()

    # ---------------- loading ----------------
    def load(self):
        tmpdir = tempfile.mkdtemp(prefix="vtqc_")
        tmp = os.path.join(tmpdir, "tool" + os.path.splitext(self.path)[1])
        shutil.copy2(self.path, tmp)
        wb = openpyxl.load_workbook(tmp, read_only=True, data_only=True)
        try:
            self.dct_sheet = self._find_dct(wb)
            self._load_msa(wb)
            self._adapt_version()
            self._load_options(wb)
            self._load_vtypes(wb)
            self._load_dct(wb)
        finally:
            wb.close()
            shutil.rmtree(tmpdir, ignore_errors=True)
        self.by_key = OrderedDict((it.key, it) for it in self.items)
        self.ms_groups = defaultdict(list)
        for it in self.items:
            if it.ms_key:
                self.ms_groups[it.ms_key].append(it)
        step = norm(self.ans_raw("fp-step-1"))
        m = re.search(r"(\d)", step)
        self.step = int(m.group(1)) if m else 3
        self._eff_cache = {}
        self._rel_cache = {}

    @staticmethod
    def _find_dct(wb):
        names = [n for n in wb.sheetnames if n == DCT_SHEET or n.startswith(DCT_SHEET + " ")]
        if not names:
            sys.exit(f"Sheet '{DCT_SHEET}' not found - is this an SLCP Verifier Tool (1.7 or later)?")
        return names[0]

    def _adapt_version(self):
        """1.7.x tools describe checklist options as 'Question' rows of data type 'boolean' with option list 'ms'.
        The rules use 'MS Checklist Option' / 'checkbox' for them, so translate."""
        if any(m["dtype"] == "checkbox" for m in self.msa.values()):
            if PUBLIC_BUILD:
                raise UnsupportedTool("This tool version is not supported yet - the checker currently supports SLCP Verifier Tool 1.7.x.")
            return
        self.tool_family = "1.7"
        for m in self.msa.values():
            if m["dtype"] == "boolean" and m["opt_list"] == "ms" and m["ms_key"]:
                m["dtype"], m["mtype"] = "checkbox", "MS Checklist Option"

    def _load_msa(self, wb):
        if MSA_SHEET not in wb.sheetnames:
            sys.exit(f"Sheet '{MSA_SHEET}' not found - is this an SLCP Verifier Tool (1.7 or later)?")
        ws = wb[MSA_SHEET]
        ws.reset_dimensions()
        rows = ws.iter_rows(values_only=True)
        hdr = [s(h) for h in next(rows)]
        ix = {h: i for i, h in enumerate(hdr) if h}

        def g(r, name):
            i = ix.get(name)
            return r[i] if i is not None and i < len(r) else None

        self.msa = OrderedDict()
        for n, r in enumerate(rows, 2):
            k = s(g(r, "Key"))
            if not k or k in self.msa:
                continue
            self.msa[k] = dict(
                msa_row=n, num=s(g(r, "Number")), mtype=s(g(r, "Master Type")), dtype=s(g(r, "Data Type")),
                text=s(g(r, "Main Text")), vtype=s(g(r, "Verification Type Required")),
                sel_list=s(g(r, "Verification Selection Option List")), opt_list=s(g(r, "Option List")),
                ms_key=s(g(r, "Multi-Select Key")), ms_unique=to_num(g(r, "Multi-Select Unique")),
                show=s(g(r, "Human Show/Hide")), noncom_list=s(g(r, "Non-Com Option List")),
                narrative=s(g(r, "Mandatory Narrative Required")), section=s(g(r, "Section")),
                subsection=s(g(r, "Sub-Section")),
                msa_vals=dict(fac=g(r, "Facility Self/Joint-Assessment Response"), sel=g(r, "Assessor/Verifier Selection"),
                              cor=g(r, "Assessor/Verifier Response"), exp=g(r, "Assessor/Verifier Explanation"),
                              nc=g(r, "Non-Compliance"), lr=g(r, "Legal Reference")))

    def _load_options(self, wb):
        self.options = defaultdict(list)
        if "Option List" not in wb.sheetnames:
            return
        ws = wb["Option List"]
        ws.reset_dimensions()
        for r in list(ws.iter_rows(values_only=True))[1:]:
            if len(r) > 2 and not blank(r[1]) and not blank(r[2]):
                self.options[s(r[1])].append(s(r[2]))

    def _load_vtypes(self, wb):
        self.vtype_cols = defaultdict(set)
        if "Verification Types" not in wb.sheetnames:
            return
        ws = wb["Verification Types"]
        ws.reset_dimensions()
        for r in list(ws.iter_rows(values_only=True))[1:]:
            if len(r) > 2 and not blank(r[1]):
                self.vtype_cols[s(r[1])].add(s(r[2]))

    def _load_dct(self, wb):
        ws = wb[self.dct_sheet]
        ws.reset_dimensions()
        cidx = {n: col_idx(c) - 1 for n, c in DCT_COLS.items()}
        self.items = []
        seen = set()
        for i, row in enumerate(ws.iter_rows(min_row=DCT_FIRST_ROW, values_only=True), DCT_FIRST_ROW):
            g = lambda n: row[cidx[n]] if cidx[n] < len(row) else None
            k = s(g("key"))
            if not k or k in seen or k not in self.msa:
                continue
            seen.add(k)
            meta = self.msa[k]
            self.items.append(Item(key=k, row=i, order=len(self.items), fac=g("fac"), sel=g("sel"), cor=g("cor"),
                                   exp=g("exp"), nc=g("nc"), lr=g("lr"), vis=to_num(g("vis")), needs=to_num(g("needs")),
                                   **meta))

    # ---------------- answer semantics ----------------
    @staticmethod
    def selnorm(it):
        return norm(it.sel)

    @staticmethod
    def is_inaccurate(sel):
        return sel.startswith("inaccurate") or sel.startswith("updated during verification")

    def ans_raw(self, key):
        it = self.by_key.get(key) if hasattr(self, "by_key") else None
        if it is None:
            for x in getattr(self, "items", []):
                if x.key == key:
                    it = x
                    break
        return None if it is None else it.fac

    def eff(self, key_or_item):
        """Effective (final) answer after verification."""
        it = key_or_item if isinstance(key_or_item, Item) else self.by_key.get(key_or_item)
        if it is None:
            return None
        if it.key in self._eff_cache:
            return self._eff_cache[it.key]
        sel = self.selnorm(it)
        if sel.startswith("no longer applicable"):
            v = None
        elif not blank(it.cor):
            v = it.cor
        elif it.dtype == "checkbox" and self.is_inaccurate(sel):
            v = None if norm(it.fac) == "x" else "X"
        else:
            v = it.fac
        self._eff_cache[it.key] = v
        return v

    def effn(self, key):
        return to_num(self.eff(key))

    def has(self, key):
        return key in self.by_key

    def item(self, key):
        return self.by_key.get(key)

    # ---------------- show/hide (relevance) ----------------
    def parse_show(self, show):
        """-> (min_step, [(parent_keys, values_or_None)])"""
        if not show:
            return None, []
        toks = [t.strip() for t in show.split(",")]
        step = None
        if toks and re.fullmatch(r"\[\d\]", toks[0]):
            step = int(toks[0][1])
            toks = toks[1:]
        groups = []
        for t in toks:
            parts = [p.strip() for p in t.split(";") if p.strip()]
            if parts and all(p in self.msa for p in parts):
                groups.append([parts, None])
            elif groups:
                groups[-1][1] = t if groups[-1][1] is None else groups[-1][1] + "," + t
        return step, [(g[0], g[1]) for g in groups]

    def cond_true(self, keys, values):
        if values is None:  # parent(s) are checkbox options: any ticked
            return any(norm(self.eff(k)) not in ("",) for k in keys)
        vals = values.strip()
        m = re.fullmatch(r">\s*(\d+(\.\d+)?)", vals)
        for k in keys:
            a = self.eff(k)
            if m:
                n = to_num(a)
                if n is None:
                    am = re.match(r"(\d+)", s(a))
                    n = float(am.group(1)) if am else None
                if n is not None and n > float(m.group(1)):
                    return True
            else:
                opts = {norm(v) for v in vals.split(";")}
                if norm(a) in opts:
                    return True
        return False

    def relevant(self, it, depth=0):
        if it.key in self._rel_cache:
            return self._rel_cache[it.key]
        if depth > 40:
            return True
        step, groups = self.parse_show(it.show)
        ok = True
        if step is not None and it.mtype not in ("META",) and step > self.step:
            ok = False
        for keys, values in groups:
            if not ok:
                break
            if not self.cond_true(keys, values):
                ok = False
            else:
                # parent chain must itself be relevant
                if not any(self.relevant(self.by_key[k], depth + 1) for k in keys if k in self.by_key):
                    ok = False
        # MS option inherits header relevance
        if ok and it.ms_key and it.ms_key in self.by_key and it.ms_key != it.key:
            ok = self.relevant(self.by_key[it.ms_key], depth + 1)
        self._rel_cache[it.key] = ok
        return ok

    def why_not(self, it, depth=0):
        """Describe the first failing condition up the parent chain (None if relevant or step-only)."""
        if depth > 40:
            return None
        _, groups = self.parse_show(it.show)
        for keys, values in groups:
            if not self.cond_true(keys, values):
                parts = []
                for k in keys:
                    p = self.by_key.get(k)
                    if p is not None:
                        parts.append(f"{p.num or k} '{short(p.text, 70)}' = '{short(s(self.eff(k)) or '(blank)', 40)}'")
                need = "ticked" if values is None else short(values, 60)
                return " / ".join(parts) + f" (needs: {need})"
            alive = [self.by_key[k] for k in keys if k in self.by_key and self.relevant(self.by_key[k])]
            if not alive:
                for k in keys:
                    if k in self.by_key:
                        w = self.why_not(self.by_key[k], depth + 1)
                        if w:
                            return w
        if it.ms_key and it.ms_key in self.by_key and it.ms_key != it.key and not self.relevant(self.by_key[it.ms_key]):
            return self.why_not(self.by_key[it.ms_key], depth + 1)
        return None

    def parent_desc(self, it):
        _, groups = self.parse_show(it.show)
        out = []
        for keys, values in groups:
            for k in keys:
                p = self.by_key.get(k)
                if p is None:
                    continue
                pv = s(self.eff(k)) or "(blank)"
                out.append(f"{p.num or k} '{short(p.text, 70)}' = '{short(pv, 40)}'")
            if values is not None:
                out[-1:] = [out[-1] + f" (needs: {short(values, 60)})"] if out else []
            else:
                out[-1:] = [out[-1] + " (needs: ticked)"] if out else []
        return "; ".join(out)

    # ---------------- issue helper ----------------
    def add(self, rule, it, msg, severity=None, field=""):
        self.issues.append(Issue(rule, it, msg, severity, field))

    # ==================================================================================
    # Rules
    # ==================================================================================
    def run(self):
        self.rules_language()
        self.rules_selection()
        self.rules_datatype()
        self.rules_legal()
        self.rules_specific()
        self.rules_relevance()
        self.rules_logic()
        self.rules_plausibility()
        self.rules_sync()
        return self.issues

    # ---------- 1. language ----------
    def rules_language(self):
        for it in self.items:
            local = bool(LOCAL_LANGUAGE_PATTERN.search(it.text or ""))
            if local:
                continue
            if not it.vtype:  # verification-details section: verifier types into col S
                if it.key.startswith("vd-"):
                    p = language_problem(it.fac)
                    if p:
                        self.add("LANG-04", it, "Answer " + p[1], p[0], "Facility Response (S)")
                continue
            p = language_problem(it.exp)
            if p:
                self.add("LANG-01", it, "Verification Data " + p[1], p[0], "Verification Data (AH)")
            p = language_problem(it.cor)
            if p:
                self.add("LANG-02", it, "Corrected Response " + p[1], p[0], "Corrected Response (AB)")
            p = language_problem(it.fac)
            if p and self.selnorm(it) == "accurate":
                self.add("LANG-03", it, "Facility Response " + p[1] + " - a non-English answer cannot be 'Accurate'; "
                         "correct it (Inaccurate + English Corrected Response).", p[0], "Verification Selection (Y)")
            # Legal reference is free text too
            p = language_problem(it.lr)
            if p:
                self.add("LANG-01", it, "Legal Reference " + p[1], "Warning", "Legal Reference (AP)")

    # ---------- 2. verification selection ----------
    def rules_selection(self):
        for it in self.items:
            if not it.vtype or it.mtype in ("META", "Header", "MS Header", "Instructions", "CALCULATED"):
                continue
            sel = self.selnorm(it)
            fac_b, cor_b, exp_b = blank(it.fac), blank(it.cor), blank(it.exp)
            is_cb = it.dtype == "checkbox"
            allowed_cols = self.vtype_cols.get(it.vtype, set())

            # SEL-10 valid option
            if sel:
                opts = self.options.get(it.sel_list, [])
                if opts and sel not in {norm(o) for o in opts}:
                    self.add("SEL-10", it, f"'{s(it.sel)}' is not in the '{it.sel_list}' list ({'; '.join(opts)}).",
                             field="Verification Selection (Y)")
            # SEL-13 columns the verification type does not use
            if allowed_cols:
                if not cor_b and "Corrected Response" not in allowed_cols:
                    self.add("SEL-13", it, f"Corrected Response entered but verification type '{it.vtype}' has no Corrected Response.",
                             field="Corrected Response (AB)")
                if (not blank(it.nc) or not blank(it.lr)) and "Non-Compliance" not in allowed_cols:
                    self.add("SEL-13", it, f"Non-Compliance/Legal Reference entered but verification type '{it.vtype}' has no legal flag.",
                             field="Non-Compliance (AN)")

            if sel == "accurate":
                if not cor_b:
                    self.add("SEL-01", it, f"Selection is 'Accurate' but Corrected Response = '{short(it.cor, 60)}'. "
                             "Clear the Corrected Response or change the selection.", field="Corrected Response (AB)")
                if fac_b and not is_cb and "optional" not in it.text.lower():
                    self.add("SEL-12", it, "Facility Response is blank but marked 'Accurate'. Use 'Facility did not reply during SA/JA' "
                             "or 'Not visible to facility during SA/JA' as appropriate.", field="Verification Selection (Y)")
            elif self.is_inaccurate(sel):
                if not cor_b and norm(it.cor) == norm(it.fac):
                    self.add("SEL-02", it, f"Corrected Response '{short(it.cor, 60)}' is the same as the Facility Response.",
                             field="Corrected Response (AB)")
                if cor_b and "Corrected Response" in (allowed_cols or {"Corrected Response"}):
                    if not (is_cb and not fac_b):  # unticking a checkbox is expressed by a blank correction
                        self.add("SEL-03", it, "No Corrected Response for an inaccurate/updated answer.",
                                 field="Corrected Response (AB)")
                if exp_b:
                    self.add("SEL-04", it, "No Verification Data explaining the correction.", field="Verification Data (AH)")
            elif sel.startswith("not visible to facility"):
                if not fac_b:
                    self.add("SEL-05", it, f"Facility Response = '{short(it.fac, 60)}' although the question was not visible to the facility.",
                             field="Facility Response (S)")
                # an unticked checklist option is a valid verifier answer (38 % of such options in real VRFs)
                if cor_b and not is_cb and "Corrected Response" in (allowed_cols or {"Corrected Response"}):
                    self.add("SEL-06", it, "No Corrected Response - the verifier normally provides the answer the facility could not.",
                             field="Corrected Response (AB)")
            elif sel.startswith("no longer applicable"):
                if not cor_b:
                    self.add("SEL-07", it, f"Corrected Response '{short(it.cor, 60)}' must be blank.", field="Corrected Response (AB)")
                if not exp_b:
                    self.add("SEL-07", it, f"Verification Data '{short(it.exp, 60)}' must be blank.", field="Verification Data (AH)")
            elif sel.startswith("facility did not reply"):
                if not fac_b:
                    self.add("SEL-11", it, f"Facility Response = '{short(it.fac, 60)}'.", field="Verification Selection (Y)")
                if cor_b and "Corrected Response" in (allowed_cols or set()):
                    self.add("SEL-06", it, "No Corrected Response for a question the facility did not answer.", "Warning",
                             field="Corrected Response (AB)")
            elif sel.startswith("not applicable due to special"):
                if exp_b:
                    self.add("SEL-14", it, "Explain the special facility circumstances in Verification Data.",
                             field="Verification Data (AH)")

            # SEL-16 verification-only question carrying a facility answer
            if it.vtype == "only-verf" and not fac_b:
                self.add("SEL-16", it, f"Facility Response '{short(it.fac, 50)}' on a verification-only question; the verifier's answer "
                         "belongs in Corrected Response and col S should be blank.", field="Facility Response (S)")
            # SEL-08 facility answered, no selection
            if not fac_b and not sel and it.vtype != "no-verf-required":
                self.add("SEL-08", it, f"Facility answered '{short(it.fac, 60)}' but no Verification Selection was made.",
                         field="Verification Selection (Y)")
            # SEL-09 follow-up
            if it.mtype == "Follow-up" and it.vis == 1 and (not sel or sel in PLACEHOLDERS):
                self.add("SEL-09", it, f"Follow-up question with selection '{s(it.sel) or '(blank)'}'.", field="Verification Selection (Y)")
            # SEL-14 mandatory narrative
            if it.narrative.lower() == "yes" and it.vis == 1 and sel and exp_b and not sel.startswith("no longer") \
                    and not sel.startswith("verification not required"):
                self.add("SEL-14", it, "Mandatory narrative question - Verification Data is blank.", field="Verification Data (AH)")
            # SEL-15 placeholder / too short
            if not exp_b:
                e = s(it.exp)
                if re.search(r"sample text|lorem ipsum|\btbd\b|\btest(ing)?\b|asdf|xxx", e, re.I):
                    self.add("SEL-15", it, f"Verification Data looks like placeholder text: '{short(e, 70)}'.",
                             field="Verification Data (AH)")
                elif norm(e) in PLACEHOLDERS or (self.is_inaccurate(sel) and len(e) < 15):
                    self.add("SEL-15", it, f"Verification Data '{e}' is too short to explain the finding.",
                             field="Verification Data (AH)")

    # ---------- 3. data types ----------
    PEOPLE_TEXT = re.compile(r"^(if yes, )?(in )?(how many|number of|total number)", re.I)
    NON_COUNT_TEXT = re.compile(r"hours|area|m2|weeks|volume|capacity|temperature|celsius|months|wage|earning|pay|lead time", re.I)

    def _vals(self, it):
        out = []
        if not blank(it.fac):
            out.append(("Facility Response (S)", it.fac))
        if not blank(it.cor):
            out.append(("Corrected Response (AB)", it.cor))
        return out

    def rules_datatype(self):
        today = dt.date.today()
        for it in self.items:
            dtp = it.dtype
            for field, v in self._vals(it):
                n = to_num(v)
                if dtp == "numeric-whole":
                    if n is None:
                        self.add("DATA-01", it, f"'{short(v, 40)}' is not a number.", field=field)
                    elif n < 0 or not float(n).is_integer():
                        self.add("DATA-01", it, f"'{s(v)}' must be a whole number >= 0 (you cannot have {s(v)} people/cases).", field=field)
                elif dtp == "numeric":
                    if n is None:
                        self.add("DATA-02", it, f"'{short(v, 40)}' is not a number.", field=field)
                    elif n < 0 and "temperature" not in it.text.lower():
                        self.add("DATA-02", it, f"'{s(v)}' cannot be negative.", field=field)
                    elif self.PEOPLE_TEXT.search(it.text) and not self.NON_COUNT_TEXT.search(it.text) and not float(n).is_integer():
                        self.add("DATA-01", it, f"'{s(v)}' counts people/cases and must be a whole number.", field=field)
                    elif "temperature" in it.text.lower() and not (5 <= n <= 45):
                        self.add("DATA-02", it, f"Indoor temperature {s(v)} °C is implausible.", "Warning", field=field)
                elif dtp == "numeric-percentage":
                    if n is None:
                        self.add("DATA-03", it, f"'{short(v, 40)}' is not a percentage number.", field=field)
                    elif n < 0 or n > 100:
                        self.add("DATA-03", it, f"{s(v)} is outside 0-100 %.", field=field)
                    elif 0 < n < 1:
                        self.add("DATA-08", it, f"{s(v)} - percentages are entered as 0-100 (e.g. 12 for 12 %). Is {s(v)} % intended?",
                                 field=field)
                elif dtp in ("numeric-latitude", "numeric-longitude"):
                    lim = 90 if dtp.endswith("latitude") else 180
                    if n is None:
                        self.add("DATA-04", it, f"'{short(v, 40)}' is not a decimal coordinate.", field=field)
                    elif abs(n) > lim:
                        self.add("DATA-04", it, f"{s(v)} is outside -{lim}..{lim}.", field=field)
                elif dtp == "date":
                    d = to_date(v)
                    if d is None:
                        self.add("DATA-05", it, f"'{short(v, 40)}' is not a valid YYYY-MM-DD date.", field=field)
                    elif d > today:
                        self.add("DATA-05", it, f"{d} is in the future.", field=field)
                    elif d.year < 1850:
                        self.add("DATA-05", it, f"{d} is implausibly early.", field=field)
                elif dtp in ("radiogroup", "array") and it.opt_list in self.options:
                    opts = self.options[it.opt_list]
                    if norm(v) not in {norm(o) for o in opts}:
                        self.add("DATA-06", it, f"'{short(v, 60)}' is not an option of '{it.opt_list}' "
                                 f"({'; '.join(opts[:8])}{' ...' if len(opts) > 8 else ''}).", field=field)
                elif dtp == "checkbox":
                    if norm(v) != "x":
                        self.add("DATA-07", it, f"'{short(v, 40)}' - checkbox cells take 'X' only.", field=field)
        self._geo_check()

    def _geo_check(self):
        lat_it, lon_it = self.item("fp-bas-5"), self.item("fp-bas-6")
        if not lat_it or not lon_it:
            self.skipped.append(("DATA-04", "Geolocation keys fp-bas-5 / fp-bas-6 not found"))
            return
        lat, lon = self.effn("fp-bas-5"), self.effn("fp-bas-6")
        if lat is None or lon is None:
            return
        if lat == 0 and lon == 0:
            self.add("DATA-04", lat_it, "Latitude and longitude are both 0 (null island).")
            return
        country = norm(self.eff("fp-bi-7"))
        box = COUNTRY_BBOX.get(country)
        if box:
            tol = 0.5
            inside = lambda la, lo: box[0] - tol <= la <= box[1] + tol and box[2] - tol <= lo <= box[3] + tol
            if not inside(lat, lon):
                if inside(lon, lat):
                    self.add("DATA-04", lat_it, f"({s(lat)}, {s(lon)}) is outside {s(self.eff('fp-bi-7'))}; latitude and "
                             "longitude look swapped.")
                else:
                    self.add("DATA-04", lat_it, f"({s(lat)}, {s(lon)}) is outside {s(self.eff('fp-bi-7'))} "
                             f"(lat {box[0]}..{box[1]}, lon {box[2]}..{box[3]}).")

    # ---------- 4. legal flag ----------
    LEGAL_Q = re.compile(r"legally required|legal requirement|legal limit|legal minimum|as legally|legal overtime|legally-required|legally prescribed", re.I)
    NEG_Q = re.compile(r"exceed(s|ed)? (the )?legal|failing to comply|fail(s|ed)? to comply|not in line|violat|below (the )?legal|"
                       r"less than (the )?legal|^(were|are) any workers under the (applicable )?legal minimum|acted against legal|"
                       r"against legal requirements|to avoid legal obligations|"
                       r"\bfailing to\b", re.I)  # 1.7.x: "Is the facility failing to pay ... as legally required?" (Yes = violation)
    NOT_LEGAL_Q = re.compile(r"other than legally required|besides legally required|not covered by legally required|even if not legally required|"
                             r"beyond (what is )?legally required|regardless of legal|although there are no|no applicable legal|"
                             r"not legally required|in addition to (what is )?legally required", re.I)
    CB_VIOLATION = re.compile(r"(less than|below|not in line with|not in compliance with|not paid|fails? to (meet|comply)) (the |with )?"
                              r"(applicable )?(legal|legally)|not legally|without (the )?(legally|legal)|"
                              r"legal\w* (requirements?|permits?|limits?) (are |is )?not (met|followed|in place|provided|available)", re.I)

    def violation(self, it, ans):
        """True = answer reports a legal violation, False = compliant/no legal requirement, None = undetermined."""
        a = norm(ans)
        if not a:
            return None
        if "no applicable legal" in a or a.startswith("not applicable") or "not legally required" in a \
                or "there are no applicable legal" in a or "even though there are no legal" in a:
            return False
        if re.search(r"not in compliance|not in line with|not paid (legally|per|contractually)|is not paid in line|"
                     r"not legally required minimum", a):
            return True
        if a.startswith("in compliance with legal") or "in line with all applicable legal" in a or \
                re.match(r"yes\s*-\s*(it is paid in line|permits are legally required and the facility is in line|"
                         r"the facility has conducted .* in line)", a):
            return False
        if it.dtype == "checkbox":
            if a == "x" and self.CB_VIOLATION.search(it.text):
                return True
            return None
        first = it.text.split("\n")[0]
        if self.NOT_LEGAL_Q.search(first):
            return None
        if a in ("yes", "no"):
            if self.NEG_Q.search(first):
                return a == "yes"
            if self.LEGAL_Q.search(first) or re.search(r"\bcomply with\b|\bin line with\b.*\blegal", first, re.I):
                return a == "no"
        return None

    def rules_legal(self):
        for it in self.items:
            nc, lr = norm(it.nc), norm(it.lr)
            if nc and nc != "x":
                self.add("LEGAL-05", it, f"Non-Compliance = '{s(it.nc)}'; only 'X' is allowed.", field="Non-Compliance (AN)")
            if nc == "x" and (not lr or lr in PLACEHOLDERS):
                self.add("LEGAL-01", it, f"Legal Reference is '{s(it.lr) or 'blank'}'. Cite the law/article breached.",
                         field="Legal Reference (AP)")
            if lr and not nc:
                self.add("LEGAL-04", it, "Legal Reference given but Non-Compliance is not flagged 'X'.", field="Non-Compliance (AN)")
            if it.noncom_list != "lf" or self.selnorm(it).startswith("no longer"):
                continue
            ans = self.eff(it)
            v = self.violation(it, ans)
            if v is True and it.vis != 0 and (self.LEGAL_Q.search(it.text) or self.NEG_Q.search(it.text) or it.dtype != "checkbox"):
                if nc != "x" or not lr or lr in PLACEHOLDERS:
                    miss = [x for x, ok in (("Non-Compliance 'X'", nc == "x"), ("Legal Reference", lr and lr not in PLACEHOLDERS)) if not ok]
                    self.add("LEGAL-02", it, f"Answer '{short(ans, 60)}' reports a legal violation; missing {' and '.join(miss)}.",
                             field="Non-Compliance (AN)")
            elif v is False and nc == "x":
                self.add("LEGAL-03", it, f"Flagged 'X' but the answer '{short(ans, 60)}' is compliant / has no applicable legal requirement.",
                         field="Non-Compliance (AN)")

    # ---------- 5. specific questions ----------
    def need(self, rule, *keys):
        miss = [k for k in keys if not self.has(k)]
        if miss:
            self.skipped.append((rule, "Question key(s) not in this template: " + ", ".join(miss)))
            return False
        return True

    def qn(self, key):
        """The question number this tool version shows for a key (numbering differs between versions)."""
        it = self.by_key.get(key)
        return (it.num if it and it.num else key.upper())

    def is_yes(self, key):
        return norm(self.eff(key)).startswith("yes")

    def is_no(self, key):
        return norm(self.eff(key)).startswith("no") and not norm(self.eff(key)).startswith("no applicable")

    def rules_specific(self):
        I = self.item
        # SPEC-01 / SPEC-02 / SPEC-14 working hours & rest days
        if self.need("SPEC-01", "wh-5", "wh-wor-20"):
            wk, rest = self.effn("wh-5"), self.effn("wh-wor-20")
            if wk is not None and rest is not None and wk > HOURS_REST_LIMIT and rest >= REST_DAYS_WITH_LONG_HOURS:
                self.add("SPEC-01", I("wh-wor-20"), f"Regular weekly hours = {s(wk)} (> {HOURS_REST_LIMIT}) with {s(rest)} weekly rest days "
                         f"- that means more than {HOURS_REST_LIMIT / (7 - rest):.1f} regular hours on every working day.")
            if rest is not None and self.has("wh-7") and self.is_yes("wh-7") and rest >= REST_DAYS_WITH_LONG_HOURS:
                self.add("SPEC-01", I("wh-wor-20"), f"Workers worked > 60 h in a week ({self.qn('wh-7')} = Yes) while {s(rest)} weekly rest days "
                         "are reported - confirm the rest days are actually given in those weeks.", "Warning")
            if rest is not None and rest > REST_DAYS_UNLIKELY_ILLEGAL and self.has("wh-9--1") and self.is_no("wh-9--1"):
                self.add("SPEC-02", I("wh-9--1"), f"{s(rest)} weekly rest days but 'rest days in line with legal requirements' = No.")
            if rest is not None and not (0 <= rest <= 7):
                self.add("SPEC-14", I("wh-wor-20"), f"{s(rest)} weekly rest days is impossible (0-7).")
        if self.need("SPEC-14", "wh-5", "wh-wor-6"):
            wk, day, rest = self.effn("wh-5"), self.effn("wh-wor-6"), self.effn("wh-wor-20")
            if wk is not None and wk > 168:
                self.add("SPEC-14", I("wh-5"), f"{s(wk)} weekly hours exceeds 168 (hours in a week).")
            if day is not None and day > 24:
                self.add("SPEC-14", I("wh-wor-6"), f"{s(day)} daily hours exceeds 24.")
            if wk is not None and day is not None and day > 0:
                if wk + 0.01 < day:
                    self.add("SPEC-14", I("wh-5"), f"Weekly regular hours ({s(wk)}) is less than daily regular hours ({s(day)}).", "Warning")
                if rest is not None and 0 <= rest < 7 and wk > day * (7 - rest) + 0.5:
                    self.add("SPEC-14", I("wh-5"), f"Weekly regular hours {s(wk)} > daily {s(day)} x {7 - int(rest)} working days "
                             f"= {day * (7 - rest):g}.", "Warning")
            for thr, k in ((60, "wh-7"), (72, "wh-7--1"), (80, "wh-7--2"), (90, "wh-7--3")):
                if wk is not None and wk > thr and self.has(k) and self.is_no(k):
                    self.add("SPEC-14", I(k), f"Regular weekly hours alone are {s(wk)} (> {thr}) but this answer is 'No'.")
        chain = ["wh-7", "wh-7--1", "wh-7--2", "wh-7--3"]
        for lo, hi in zip(chain, chain[1:]):
            if self.has(lo) and self.has(hi) and self.is_yes(hi) and self.is_no(lo):
                self.add("SPEC-14", I(lo), f"'{short(I(hi).text, 60)}' = Yes, so '{short(I(lo).text, 60)}' cannot be No.")

        # SPEC-03 forced vs voluntary overtime
        if self.need("SPEC-03", "fl-7--1", "wh-ove-2"):
            if self.is_yes("fl-7--1") and self.is_yes("wh-ove-2"):
                self.add("SPEC-03", I("wh-ove-2"), f"{self.qn('fl-7--1')} 'workers forced to work overtime under threat of penalty' = Yes, "
                         f"so {self.qn('wh-ove-2')} 'Is overtime voluntary' cannot be Yes.")

        # SPEC-04 date order
        pairs = [("vd-e4", "vd-e5", "Verification/Assessment Start Date", "End Date")]
        first = [it for it in self.items if re.search(r"first audit date", it.text, re.I)]
        last = [it for it in self.items if re.search(r"last audit date", it.text, re.I)]
        for f in first:
            nxt = [l for l in last if l.order > f.order]
            if nxt:
                pairs.append((f.key, nxt[0].key, "First Audit Date", "Last Audit Date"))
        if not first:
            self.skipped.append(("SPEC-04", "No 'First Audit Date / Last Audit Date' questions in this template (none in this tool version); "
                                 "only Verification Start/End Date checked."))
        for a, b, la, lb in pairs:
            if self.has(a) and self.has(b):
                da, db = to_date(self.eff(a)), to_date(self.eff(b))
                if da and db and da > db:
                    self.add("SPEC-04", I(a), f"{la} {da} is later than {lb} {db}.")
                if a == "vd-e4" and da and db and (db - da).days > 31:
                    self.add("SPEC-04", I(b), f"Verification spans {(db - da).days + 1} calendar days - check the dates.", "Warning")
        if self.has("fp-bi-22") and self.has("vd-e4"):
            sub, start = to_date(self.eff("fp-bi-22")), to_date(self.eff("vd-e4"))
            if sub and start and sub > start:
                self.add("SPEC-04", I("fp-bi-22"), f"SA/JA submission date {sub} is after the verification start date {start}.", "Warning")
        if self.has("vd-e5"):
            end = to_date(self.eff("vd-e5"))
            if end and end > dt.date.today():
                self.add("SPEC-04", I("vd-e5"), f"Verification end date {end} is in the future.")

        # SPEC-05 certifications duplicated
        cert = [it for it in self.ms_groups.get("fp-cer-8", []) if it.dtype == "checkbox"]
        other = self.item("fp-cer-45f")
        if cert and other and not blank(self.eff(other)):
            desc = norm(self.eff(other))
            for it in cert:
                abbr = re.split(r" - |\(", it.text)[0].strip()
                names = {abbr.lower()} | set(re.findall(r"\(([A-Za-z0-9 ]{2,10})\)", it.text.lower()))
                for nm in names:
                    if len(nm) >= 3 and nm not in ("other",) and re.search(r"(?<![a-z0-9])" + re.escape(nm) + r"(?![a-z0-9])", desc):
                        ticked = norm(self.eff(it)) == "x"
                        self.add("SPEC-05", other, f"'Other' description mentions '{abbr}', which is a listed option"
                                 f"{' already ticked (duplicate)' if ticked else ' - tick the listed option instead'}.")
                        break
        elif not cert:
            self.skipped.append(("SPEC-05", "Certification list fp-cer-8 not found"))
        audits = [it for it in self.items if re.search(r"(name of (the )?(social )?audit|audit (standard|scheme|program))", it.text, re.I)
                  and it.dtype == "string"]
        self._dupes("SPEC-05", audits, "social audit")

        # SPEC-06 / SPEC-20 subcontractors
        blocks = []
        for n in range(4, 10):
            base = f"fp-sub-{n}"
            if self.has(base):
                blocks.append({fld: (self.item(base + suf), self.eff(base + suf)) for fld, suf in
                               (("name", ""), ("address", "--1"), ("contact", "--2"), ("phone", "--3"), ("email", "--4"))
                               if self.has(base + suf)})
        if blocks:
            for fld in ("name", "address", "email", "phone"):
                seen = {}
                for i, b in enumerate(blocks, 1):
                    if fld not in b or blank(b[fld][1]):
                        continue
                    k = re.sub(r"[^a-z0-9@]", "", norm(b[fld][1])) if fld != "phone" else re.sub(r"\D", "", s(b[fld][1]))
                    if len(k) < 3 or norm(b[fld][1]) in PLACEHOLDERS:
                        continue
                    if k in seen:
                        self.add("SPEC-06", b[fld][0], f"Subcontractor #{i} {fld} '{short(b[fld][1], 50)}' duplicates subcontractor #{seen[k]}.",
                                 "Error" if fld == "name" else "Warning")
                    else:
                        seen[k] = i
            if self.has("fp-sub-2"):
                cnt = self.effn("fp-sub-2")
                filled = sum(1 for b in blocks if "name" in b and not blank(b["name"][1]))
                if cnt is not None and self.relevant(self.item("fp-sub-2")):
                    if filled > cnt:
                        self.add("SPEC-20", I("fp-sub-2"), f"{filled} subcontractors detailed but the count is {s(cnt)}.")
                    elif filled < min(cnt, len(blocks)):
                        self.add("SPEC-20", I("fp-sub-2"), f"Count is {s(cnt)} but only {filled} subcontractor name(s) entered.")
        else:
            self.skipped.append(("SPEC-06", "Subcontractor blocks fp-sub-4..9 not found"))

        # SPEC-07 / SPEC-15 youngest worker
        if self.need("SPEC-07", "cl-1--2", "rh-chi-13"):
            age = self.effn("cl-1--2")
            if age is not None:
                if age < INTERNATIONAL_MIN_AGE and not self.is_yes("rh-chi-13"):
                    self.add("SPEC-07", I("rh-chi-13"), f"Youngest worker is {s(age)} (< {INTERNATIONAL_MIN_AGE}, the international minimum) "
                             f"so {self.qn('rh-chi-13')} must be 'Yes' (now '{s(self.eff('rh-chi-13')) or 'blank'}').")
                if not (10 <= age <= 80):
                    self.add("SPEC-15", I("cl-1--2"), f"Youngest worker age {s(age)} is implausible.", "Warning")
                if self.has("fp-ed-12"):
                    u18 = self.effn("fp-ed-12")
                    if age < 18 and u18 is not None and u18 < 1:
                        self.add("SPEC-15", I("fp-ed-12"), f"Youngest worker is {s(age)} but 'workers under 18' = {s(u18)}.")
                    if age >= 18 and u18 is not None and u18 >= 1:
                        self.add("SPEC-15", I("cl-1--2"), f"{s(u18)} workers under 18 reported but youngest worker is {s(age)}.")
            if self.is_yes("rh-chi-13") and self.has("rh-chi-4") and self.has("rh-chi-5"):
                f, m = self.effn("rh-chi-4"), self.effn("rh-chi-5")
                if (f or 0) + (m or 0) < 1 and (f is not None or m is not None):
                    self.add("SPEC-15", I("rh-chi-4"), "Workers under the legal minimum age = Yes, but female + male counts are 0.")
                u18 = self.effn("fp-ed-12") if self.has("fp-ed-12") else None
                if u18 is not None and (f or 0) + (m or 0) > u18:
                    self.add("SPEC-15", I("rh-chi-4"), f"Under-minimum-age workers ({s((f or 0) + (m or 0))}) exceed workers under 18 ({s(u18)}).")

        # SPEC-08 volume vs capacity
        if self.need("SPEC-08", "fp-pi-10", "fp-pi-13"):
            vol, cap = self.effn("fp-pi-10"), self.effn("fp-pi-13")
            uv, uc = norm(self.eff("fp-pi-11")), norm(self.eff("fp-pi-14"))
            if vol is not None and cap is not None and vol > cap:
                if uv and uc and uv != uc:
                    self.add("SPEC-08", I("fp-pi-10"), f"Volume {s(vol)} ({uv}) vs capacity {s(cap)} ({uc}) use different units - "
                             "cannot compare; confirm.", "Warning")
                else:
                    self.add("SPEC-08", I("fp-pi-10"), f"Average monthly volume {s(vol)} is larger than monthly capacity {s(cap)}.")

        # SPEC-09 / SPEC-10 / SPEC-13 contacts
        name_keys = ["fp-bi-13", "fp-bi-20", "fp-bi-23", "vd-veri-38"] + [f"fp-sub-{n}--2" for n in range(4, 10)]
        phone_keys = ["fp-bi-15", "fp-bi-16"] + [f"fp-sub-{n}--3" for n in range(4, 10)]
        mail_keys = ["fp-bi-17", "fp-bi-21", "fp-bi-24"] + [f"fp-sub-{n}--4" for n in range(4, 10)]
        for k in name_keys:
            it = self.item(k)
            if not it:
                continue
            for field, v in self._vals(it) if it.vtype else [("Facility Response (S)", it.fac)]:
                if blank(v):
                    continue
                t = s(v)
                letters = len(re.findall(r"[^\W\d_]", t))
                digits = len(re.findall(r"\d", t))
                if norm(t) in PLACEHOLDERS or letters < 2 or "@" in t or digits > letters:
                    self.add("SPEC-09", it, f"'{short(t, 50)}' does not look like a person's name.", field=field)
        for k in phone_keys:
            it = self.item(k)
            if not it:
                continue
            for field, v in self._vals(it):
                t = s(v)
                digits = re.sub(r"\D", "", t)
                if not digits:
                    self.add("SPEC-10", it, f"'{short(t, 50)}' contains no digits.", field=field)
                elif len(digits) < 6 or re.search(r"[A-Za-z]{2,}", re.sub(r"(?i)ext\.?|extension|tel\.?|mobile|fax", "", t)):
                    self.add("SPEC-10", it, f"'{short(t, 50)}' does not look like a complete phone number.", "Warning", field=field)
        email_re = re.compile(r"^[^@\s,;]+@[^@\s,;]+\.[A-Za-z]{2,}$")
        for k in mail_keys:
            it = self.item(k)
            if not it:
                continue
            for field, v in self._vals(it):
                parts = [p.strip() for p in re.split(r"[,;/\n]| and ", s(v)) if p.strip()]
                bad = [p for p in parts if not email_re.match(p)]
                if bad and norm(v) not in PLACEHOLDERS:
                    self.add("SPEC-13", it, f"Not a valid email address: '{short('; '.join(bad), 60)}'.", field=field)


        # SPEC-12 harassment cases: male & female breakdown
        for trig, m_k, f_k, label in (("hb-4", "wt-har-3", "wt-har-4", "harassment, violence or abuse"),
                                      ("hb-1--2", "wt-for-3", "wt-for-4", "violence/threats used to force work")):
            label = f"{label} ({self.qn(trig)})"
            if self.need("SPEC-12", trig, m_k, f_k) and self.is_yes(trig) and self.relevant(I(trig)):
                mv, fv = self.effn(m_k), self.effn(f_k)
                if (mv or 0) == 0 and (fv or 0) == 0:
                    self.add("SPEC-12", I(m_k), f"Cases of {label} = Yes, but male = {s(mv) or 'blank'} and female = {s(fv) or 'blank'}.")

        # SPEC-16 'how many cases' >= 1 when triggered
        for it in self.items:
            if it.dtype.startswith("numeric") and re.search(r"how many cases|how many .*harassment", it.text, re.I) \
                    and it.show and self.relevant(it):
                n = self.effn(it.key)
                if n is not None and n < 1:
                    self.add("SPEC-16", it, f"Evidence was indicated ({self.parent_desc(it)}) but the number of cases is {s(n)}.")

        # SPEC-17 duplicate nationalities / languages / unions
        self._dupes("SPEC-17", [I(k) for k in ("fp-nl-1", "fp-nl-2", "fp-nl-3", "fp-nat-5") if I(k)], "nationality")
        self._dupes("SPEC-17", [I(k) for k in ("fp-nl-9", "fp-nl-10", "fp-nl-11") if I(k)], "language")
        self._dupes("SPEC-17", [I(k) for k in ("wi-foa-4", "wi-foa-10", "wi-foa-16") if I(k)], "union name")

        # SPEC-18 verification sampling vs answers
        if self.has("vd-veri-36") and self.has("wh-7"):
            w = self.effn("vd-veri-36")
            if w is not None and w >= 1 and self.is_no("wh-7"):
                self.add("SPEC-18", I("wh-7"), f"Working-hour records show {s(w)} sampled week(s) with > 60 h ({self.qn('vd-veri-36')}) but "
                         f"{self.qn('wh-7')} 'any workers > 60 hours' = No.", "Error")
        for part, whole, label in (("vd-veri-33", "vd-veri-32", "workers below MW vs workers sampled"),
                                   ("vd-veri-36", "vd-veri-35", "weeks > 60 h vs weeks sampled")):
            if self.has(part) and self.has(whole):
                p, w = self.effn(part), self.effn(whole)
                if p is not None and w is not None and p > w:
                    self.add("REL-04", I(part), f"{label}: {s(p)} > {s(w)}.")
        if self.has("vd-veri-34") and self.has("vd-veri-33") and self.has("vd-veri-32"):
            p, a, b = self.effn("vd-veri-34"), self.effn("vd-veri-33"), self.effn("vd-veri-32")
            if p is not None and a is not None and b:
                exp_p = a / b * 100
                if abs(exp_p - p) > 5:
                    self.add("SPEC-18", I("vd-veri-34"), f"Impacted % = {s(p)} but {s(a)}/{s(b)} = {exp_p:.1f} %.")
        if self.has("vd-e14") and self.has("fp-ed-2"):
            iv, tw = self.effn("vd-e14"), self.effn("fp-ed-2")
            if iv is not None and tw is not None and iv > tw:
                self.add("SPEC-18", I("vd-e14"), f"{s(iv)} worker interviews but only {s(tw)} workers.")
        for vis_k, have_keys, label in (("vd-veri-6", ["fp-bs-5"], "on-site dormitories"), ("vd-veri-7", ["fp-bui-4", "fp-bui-5"], "off-site dormitories")):
            if self.has(vis_k) and all(self.has(k) for k in have_keys):
                v = self.effn(vis_k)
                have = sum(self.effn(k) or 0 for k in have_keys)
                if v is not None and v > have:
                    self.add("SPEC-18", I(vis_k), f"{s(v)} {label} visited but the facility profile reports {s(have)}.")

        # SPEC-19 OS ID
        if self.has("fp-oar-1"):
            v = s(self.eff("fp-oar-1"))
            if v and norm(v) not in PLACEHOLDERS and not re.fullmatch(r"[A-Z]{2}\d{7}[A-Z0-9]{6}", v.replace(" ", "").upper()):
                self.add("SPEC-19", I("fp-oar-1"), f"'{v}' does not match the Open Supply Hub ID pattern (e.g. CN2019303BQ3FZP).")

    def _dupes(self, rule, items, label):
        seen = {}
        for it in items:
            v = self.eff(it)
            k = re.sub(r"[^a-z0-9]", "", norm(v))
            if not k or norm(v) in PLACEHOLDERS or not self.relevant(it):
                continue
            if k in seen:
                self.add(rule, it, f"{label.capitalize()} '{short(v, 50)}' is a duplicate of {seen[k].num or seen[k].key}.")
            else:
                seen[k] = it

    # ---------- 6. relevance ----------
    def rules_relevance(self):
        for it in self.items:
            if not it.show and not it.ms_key:
                continue
            if it.mtype in ("Header", "MS Header", "Instructions", "META", "CALCULATED"):
                continue
            sel = self.selnorm(it)
            answered = not blank(self.eff(it))
            rel = self.relevant(it)
            if answered and not rel:
                desc = self.why_not(it)
                if not desc:
                    continue  # only a Step restriction
                src = "Corrected Response" if not blank(it.cor) else "Facility Response"
                if not blank(it.cor):
                    tip = " Remove the Corrected Response or correct the parent."
                elif it.vtype == "only-verf":
                    tip = " Clear the answer - this verification-only question does not apply."
                elif it.vtype:
                    tip = " Mark it 'No longer applicable due to assessment/verification'."
                else:
                    tip = " Clear the answer."
                self.add("REL-01", it, f"{src} '{short(self.eff(it), 50)}' given, but parent: {desc}.{tip}")
            if sel.startswith("no longer applicable") and rel and it.vis == 1:
                if self.parse_show(it.show)[1] or it.ms_key:
                    self.add("REL-02", it, f"Parent answer still triggers this question ({self.parent_desc(it) or 'see header'}).")

        # REL-03 'none of the above'
        for hk, opts in self.ms_groups.items():
            boxes = [o for o in opts if o.dtype == "checkbox"]
            excl = [o for o in boxes if o.ms_unique == 2 or re.match(r"^(none of the above|no currently valid|no exceptions were granted|"
                                                                      r"no significant .* identified|not applicable)", o.text, re.I)]
            for e in excl:
                if norm(self.eff(e)) == "x":
                    others = [o for o in boxes if o is not e and o not in excl and norm(self.eff(o)) == "x"]
                    if others:
                        self.add("REL-03", e, f"'{short(e.text, 60)}' is ticked together with: "
                                 + "; ".join(short(o.text, 40) for o in others[:5]) + ("..." if len(others) > 5 else ""))

        # REL-06 visible & unanswered
        for it in self.items:
            if it.vis != 1 or it.mtype not in ("Question", "Follow-up") or it.key in ("fp-step-1",):
                continue
            if it.needs != 1 and it.vtype not in ("only-verf",):
                continue
            if blank(self.eff(it)) and not self.selnorm(it) and not it.mtype == "Follow-up":
                who = "verifier (Verification-only question)" if it.vtype == "only-verf" or not it.vtype else "facility/verifier"
                self.add("REL-06", it, f"No answer and no Verification Selection - to be completed by the {who}.")
        for hk, opts in self.ms_groups.items():
            h = self.by_key.get(hk)
            boxes = [o for o in opts if o.dtype == "checkbox"]
            if not h or not boxes or h.vis != 1 or not self.relevant(h):
                continue
            if not any(norm(self.eff(o)) == "x" for o in boxes) and not any(self.selnorm(o) for o in boxes):
                self.add("REL-06", h, "Visible multi-select question with no option ticked and no Verification Selection.")

    # ---------- 6b. numeric logic ----------
    PART_WHOLE = [
        # (part, whole, label)
        ("fp-ed-3", "fp-ed-2", "male workers vs total workers"),
        ("fp-wor-3", "fp-ed-5", "male full-time vs full-time workers"), ("fp-wor-4", "fp-ed-6", "male part-time vs part-time workers"),
        ("fp-wor-6", "fp-wor-5", "male permanent vs permanent workers"), ("fp-wor-8", "fp-wor-7", "male temporary vs temporary workers"),
        ("fp-wor-10", "fp-wor-9", "male agency vs agency/contract workers"),
        ("fp-wor-14", "fp-ed-8", "male foreign migrant vs foreign migrant workers"),
        ("fp-wor-15", "fp-ed-9", "male domestic migrant vs domestic migrant workers"),
        ("fp-wor-16", "fp-ed-10", "male piece-rate vs piece-rate workers"), ("fp-wor-17", "fp-ed-11", "male probation vs probation workers"),
        ("fp-wor-19", "fp-wor-18", "male casual vs casual workers"), ("fp-wor-20", "fp-ed-12", "male under-18 vs under-18 workers"),
        ("fp-wor-21", "fp-ed-13", "male trainees vs trainees"), ("fp-wor-24", "fp-ed-15", "male disabled vs disabled workers"),
        ("fp-wor-26", "fp-wor-25", "male refugee vs refugee workers"), ("fp-wor-27", "fp-ed-16", "male homeworkers vs homeworkers"),
        ("fp-wor-28", "fp-ed-19", "male supervisors vs supervisors"), ("fp-wor-29", "fp-ed-19", "foreign migrant supervisors vs supervisors"),
        ("fp-wor-30", "fp-wor-29", "male foreign migrant supervisors vs foreign migrant supervisors"),
        ("fp-wor-30", "fp-wor-28", "male foreign migrant supervisors vs male supervisors"),
        ("fp-wor-35", "fp-wor-34", "male managers vs managers"),
        ("wi-foa-6", "wi-foa-61", "female members vs members (largest union)"), ("wi-foa-8", "wi-foa-62", "female officials vs officials (largest union)"),
        ("wi-foa-62", "wi-foa-61", "officials vs members (largest union)"),
        ("wi-foa-12", "wi-foa-63", "female members vs members (2nd union)"), ("wi-foa-14", "wi-foa-64", "female officials vs officials (2nd union)"),
        ("wi-foa-64", "wi-foa-63", "officials vs members (2nd union)"),
        ("wi-foa-18", "wi-foa-65", "female members vs members (3rd union)"), ("wi-foa-20", "wi-foa-66", "female officials vs officials (3rd union)"),
        ("wi-foa-66", "wi-foa-65", "officials vs members (3rd union)"),
        ("wi-foa-61", "fp-ed-2", "largest union members vs total workers"),
        ("wi-wor-8", "wi-wor-5", "employer representatives vs body members"), ("wi-wor-9", "wi-wor-5", "worker representatives vs body members"),
        ("hs-hsc-3", "hs-hsc-2", "female vs OSH committee members"), ("hs-hsc-7", "hs-hsc-2", "union reps vs OSH committee members"),
        ("hs-hsc-4", "hs-hsc-2", "foreign migrant vs OSH committee members"), ("hs-hsc-5", "hs-hsc-2", "employer vs OSH committee members"),
        ("hs-hsc-6", "hs-hsc-2", "worker vs OSH committee members"),
        ("wt-dis-47", "disc-9--2", "work-related disabled vs all newly disabled workers"),
        ("vd-veri-4", "vd-e14", "contract-worker interviews vs all worker interviews"),
        ("wb-wage-87f", "fp-ed-2", "workers with other insurance vs total workers"),
        ("fp-bs-2", "fp-bs-1", "production buildings vs total buildings"), ("fp-bs-3", "fp-bs-1", "warehouses vs total buildings"),
        ("wi-gri-9", "wi-gri-11", "grievances by female workers vs grievance mechanism uses"),
        ("wi-gri-10", "wi-gri-11", "grievances by male workers vs grievance mechanism uses"),
        ("foa-cb-7--1", "wi-foa-56", "number of strikes vs total strike days"),
        ("wi-foa-56", "wi-foa-57", "strike days vs strike person-days"),
    ]
    # each category <= total workers
    CATEGORY_OF_TOTAL = ["fp-ed-5", "fp-ed-6", "fp-wor-5", "fp-wor-7", "fp-wor-9", "fp-ed-8", "fp-ed-9", "fp-ed-10", "fp-ed-11",
                         "fp-wor-18", "fp-ed-12", "fp-ed-13", "fp-ed-14", "fp-wor-22", "fp-wor-23", "fp-ed-15", "fp-wor-25", "fp-ed-16"]

    def _cmp(self, part, whole, label, sev="Error"):
        if not (self.has(part) and self.has(whole)):
            return
        p, w = self.effn(part), self.effn(whole)
        if p is None or w is None:
            return
        if not (self.relevant(self.item(part)) and self.relevant(self.item(whole))):
            return
        if p > w:
            self.add("REL-04", self.item(part), f"{label}: {s(p)} > {s(w)} ({self.item(whole).num}).", sev)

    def rules_logic(self):
        for part, whole, label in self.PART_WHOLE:
            # 'strikes vs days' style pairs are softer
            sev = "Warning" if part in ("foa-cb-7--1", "wi-foa-56", "vd-veri-4", "fp-bs-3", "wi-foa-61") else "Error"
            self._cmp(part, whole, label, sev)
        total = self.effn("fp-ed-2") if self.has("fp-ed-2") else None
        for k in self.CATEGORY_OF_TOTAL:
            it = self.item(k)
            if it:
                self._cmp(k, "fp-ed-2", f"'{short(it.text, 60)}' vs total workers")
        # female-only categories <= female workers
        if total is not None and self.has("fp-ed-3") and self.effn("fp-ed-3") is not None:
            female = total - self.effn("fp-ed-3")
            for k, label in (("fp-ed-14", "pregnant/breastfeeding workers"), ("fp-wor-22", "workers on maternity leave"),
                             ("fp-wor-23", "workers returned from maternity leave")):
                v = self.effn(k) if self.has(k) else None
                if v is not None and v > female:
                    self.add("REL-04", self.item(k), f"{label} ({s(v)}) exceed female workers ({s(female)} = total {s(total)} - male "
                             f"{s(self.effn('fp-ed-3'))}).")
        # parts add up
        if total is not None:
            for a, b, label in (("fp-ed-5", "fp-ed-6", "full-time + part-time"), ("fp-wor-5", "fp-wor-7", "permanent + temporary")):
                va, vb = (self.effn(a) if self.has(a) else None), (self.effn(b) if self.has(b) else None)
                if va is not None and vb is not None and va + vb > total:
                    self.add("REL-04", self.item(a), f"{label} = {s(va + vb)} exceeds total workers {s(total)}.")
                elif va is not None and vb is not None and va + vb < total and a == "fp-ed-5":
                    self.add("REL-05", self.item(a), f"{label} = {s(va + vb)} but total workers = {s(total)}.")
            male = self.effn("fp-ed-3") if self.has("fp-ed-3") else None
            ma, mb = (self.effn("fp-wor-3") if self.has("fp-wor-3") else None), (self.effn("fp-wor-4") if self.has("fp-wor-4") else None)
            if male is not None and ma is not None and mb is not None and ma + mb > male:
                self.add("REL-04", self.item("fp-wor-3"), f"male full-time + male part-time = {s(ma + mb)} exceeds male workers {s(male)}.")
            sup = self.effn("fp-ed-19") if self.has("fp-ed-19") else None
            if sup is not None and total > 0 and sup > SUPERVISOR_SHARE_MAX * total:
                self.add("REL-05", self.item("fp-ed-19"), f"Supervisors ({s(sup)}) are more than {int(SUPERVISOR_SHARE_MAX * 100)} % of "
                         f"total workers ({s(total)}).")
            mgr = self.effn("fp-wor-34") if self.has("fp-wor-34") else None
            if mgr is not None and total > 0 and mgr > SUPERVISOR_SHARE_MAX * total:
                self.add("REL-05", self.item("fp-wor-34"), f"Managers ({s(mgr)}) are more than {int(SUPERVISOR_SHARE_MAX * 100)} % of "
                         f"total workers ({s(total)}).")
            # nationalities
            nat_w = [k for k in ("fp-nat-8", "fp-nat-10", "fp-nat-12", "fp-nat-14") if self.has(k)]
            sw = sum(self.effn(k) or 0 for k in nat_w if self.relevant(self.item(k)))
            if sw > total * 1.05 and nat_w:
                self.add("REL-05", self.item(nat_w[0]), f"Workers by nationality add up to {s(sw)} > total workers {s(total)}.")
            if sup is not None:
                nat_s = [k for k in ("fp-nat-9", "fp-nat-11", "fp-nat-13", "fp-nat-15") if self.has(k)]
                ss = sum(self.effn(k) or 0 for k in nat_s if self.relevant(self.item(k)))
                if ss > sup * 1.05 and nat_s:
                    self.add("REL-05", self.item(nat_s[0]), f"Supervisors by nationality add up to {s(ss)} > supervisors {s(sup)}.")
            fm = self.effn("fp-ed-8") if self.has("fp-ed-8") else None
            nn = self.effn("fp-nat-1") if self.has("fp-nat-1") else None
            if fm is not None and fm > 0 and nn is not None and nn < 2:
                self.add("REL-05", self.item("fp-nat-1"), f"{s(fm)} foreign migrant workers but only {s(nn)} nationality represented.")
            # union totals
            um = [k for k in ("wi-foa-61", "wi-foa-63", "wi-foa-65") if self.has(k)]
            su = sum(self.effn(k) or 0 for k in um if self.relevant(self.item(k)))
            if su > total and um:
                self.add("REL-05", self.item(um[0]), f"Union members across unions = {s(su)} > total workers {s(total)} "
                         "(possible only with dual membership).")
            pct = self.effn("foa-cb-2--3") if self.has("foa-cb-2--3") else None
            if pct is not None and su and total and self.relevant(self.item("foa-cb-2--3")):
                calc = su / total * 100
                if abs(calc - pct) > 15:
                    self.add("REL-05", self.item("foa-cb-2--3"), f"Union membership {s(pct)} % vs members/total workers = {calc:.0f} %.")
            for big, small, lbl in (("wi-foa-61", "wi-foa-63", "2nd largest union > largest union"),
                                    ("wi-foa-63", "wi-foa-65", "3rd largest union > 2nd largest union")):
                if self.has(big) and self.has(small):
                    b, sm = self.effn(big), self.effn(small)
                    if b is not None and sm is not None and sm > b:
                        self.add("REL-05", self.item(small), f"{lbl}: {s(sm)} > {s(b)}.")
            # wage level totals
            lvl = [it for it in self.items if re.match(r"TOTAL number of workers in .*wage level", it.text) and self.relevant(it)]
            sl = sum(self.effn(it.key) or 0 for it in lvl)
            if lvl and sl > total:
                self.add("REL-05", lvl[0], f"Workers across wage levels = {s(sl)} > total workers {s(total)}.")
        # female per wage level <= total per wage level (pairs are adjacent rows)
        for i, it in enumerate(self.items[:-1]):
            nx = self.items[i + 1]
            if re.match(r"TOTAL number of workers in ", it.text) and re.match(r"Number of FEMALE workers in ", nx.text):
                self._cmp(nx.key, it.key, f"female vs total workers in '{short(it.text[27:], 40)}'")
        # OSH committee: employer + worker members
        if all(self.has(k) for k in ("hs-hsc-2", "hs-hsc-5", "hs-hsc-6")):
            t, e, w = self.effn("hs-hsc-2"), self.effn("hs-hsc-5"), self.effn("hs-hsc-6")
            if None not in (t, e, w) and e + w > t and self.relevant(self.item("hs-hsc-6")):
                self.add("REL-04", self.item("hs-hsc-6"), f"OSH committee employer ({s(e)}) + worker ({s(w)}) members exceed total members ({s(t)}).")
        if all(self.has(k) for k in ("wi-wor-5", "wi-wor-8", "wi-wor-9")):
            t, e, w = self.effn("wi-wor-5"), self.effn("wi-wor-8"), self.effn("wi-wor-9")
            if None not in (t, e, w) and e + w > t:
                self.add("REL-04", self.item("wi-wor-9"), f"Employer ({s(e)}) + worker ({s(w)}) representatives exceed body members ({s(t)}).")
        # grievance breakdowns
        if self.has("wi-gri-11"):
            tot = self.effn("wi-gri-11")
            for grp, lbl in ((["wi-gri-19", "wi-gri-20", "wi-gri-21", "wi-gri-22", "wi-gri-23", "wi-gri-24"], "by topic"),
                             (["wi-gri-27", "wi-gri-28", "wi-gri-29", "wi-gri-30"], "by worker type"),
                             (["wi-gri-33", "wi-gri-34", "wi-gri-35", "wi-gri-36", "wi-gri-37", "wi-gri-38"], "by outcome")):
                ks = [k for k in grp if self.has(k)]
                vals = [self.effn(k) for k in ks]
                if tot is not None and ks and any(v is not None for v in vals) and self.relevant(self.item(ks[0])):
                    sm = sum(v or 0 for v in vals)
                    if sm > tot:
                        self.add("REL-04", self.item(ks[0]), f"Grievances {lbl} add up to {s(sm)} > {s(tot)} uses of the mechanism.")
            fv, mv = (self.effn("wi-gri-9") if self.has("wi-gri-9") else None), (self.effn("wi-gri-10") if self.has("wi-gri-10") else None)
            if tot is not None and fv is not None and mv is not None and fv + mv > tot:
                self.add("REL-04", self.item("wi-gri-9"), f"Grievances by female ({s(fv)}) + male ({s(mv)}) workers > {s(tot)} uses.")
        # pay-method percentages
        pm = [k for k in ("wb-15-1f", "wb-15-2f", "wb-15-3f", "wb-15-4f", "wb-15-5f", "wb-wag-45") if self.has(k) and self.relevant(self.item(k))]
        vals = [self.effn(k) for k in pm]
        if pm and all(v is not None for v in vals) and sum(vals) < 99:
            self.add("REL-05", self.item(pm[0]), f"Payment-method percentages add up to {s(sum(vals))} % (< 100 %).")
        # take-home pay >= basic wage
        for basic, take in (("wb-wage-41", "wb-wage-47"), ("wb-wage-42", "wb-wage-48")):
            if self.has(basic) and self.has(take):
                b, t = self.effn(basic), self.effn(take)
                if b is not None and t is not None and t < TAKEHOME_MIN_SHARE * b:
                    self.add("REL-05", self.item(take), f"Average take-home pay {s(t)} is below {int(TAKEHOME_MIN_SHARE * 100)} % of the "
                             f"average basic wage {s(b)}.")
        # percentages of a language should not exceed 100 combined? (not enforced - people speak several languages)

    # ---------- 6c. plausibility (thresholds calibrated on real VRFs) ----------
    def val(self, key):
        """Effective numeric answer of a relevant question, else None."""
        it = self.item(key)
        if it is None or not self.relevant(it):
            return None
        return self.effn(key)

    def rules_plausibility(self):
        workers = self.val("fp-ed-2")
        for key, label, needs_workers in (("fp-nat-1", "nationalities represented", True),
                                          ("fp-lan-1", "languages needed to communicate with all workers", True),
                                          ("wb-wag-17", "wage grades / levels", False)):
            v = self.val(key)
            if v == 0 and (not needs_workers or (workers or 0) > 0):
                self.add("PLAUS-01", self.item(key), f"Number of {label} is 0" + (f" with {s(workers)} workers." if needs_workers else "."))
        lead = self.val("fp-pi-20")
        if lead is not None and lead > LEAD_TIME_MAX_WEEKS:
            self.add("PLAUS-02", self.item("fp-pi-20"), f"Maximum lead time {s(lead)} weeks (> {LEAD_TIME_MAX_WEEKS}) - was it entered in days?")
        for m, f, label in (("wb-wage-41", "wb-wage-42", "lowest grade basic wage"), ("wb-wage-47", "wb-wage-48", "lowest grade take-home pay"),
                            ("wb-wage-49", "wb-wage-50", "most represented grade basic wage")):
            vm, vf = self.val(m), self.val(f)
            if vm is not None and vf is not None and (vm == 0) != (vf == 0):
                zero = f if vf == 0 else m
                self.add("PLAUS-03", self.item(zero), f"{label.capitalize()}: male {s(vm)} vs female {s(vf)} - a wage of 0 is unlikely.")
        area = self.val("fp-bs-10")
        if area is not None and workers and area > 0 and area / workers < MIN_M2_PER_WORKER:
            self.add("PLAUS-04", self.item("fp-bs-10"), f"Built area {s(area)} m2 for {s(workers)} workers = {area / workers:.1f} m2 per worker "
                     f"(< {MIN_M2_PER_WORKER}) - square feet or another unit?")

    # ---------- 7. sync ----------
    def rules_sync(self):
        fields = [("fac", "Facility Response"), ("sel", "Verification Selection"), ("cor", "Corrected Response"),
                  ("exp", "Verification Data"), ("nc", "Non-Compliance"), ("lr", "Legal Reference")]
        defaults = {"verification only", "verification not required"}
        found = []
        for it in self.items:
            if it.mtype in ("Header", "MS Header", "Instructions", "META", "CALCULATED"):
                continue
            mv = it.msa_vals or {}
            for f, label in fields:
                a, b = getattr(it, f), mv.get(f)
                if f == "fac" and it.dtype == "date" and to_date(a) == to_date(b):
                    continue
                if f == "sel" and blank(b) and norm(a) in defaults:
                    continue  # tool default not yet written back
                if norm(a) != norm(b):
                    found.append((it, f"{label}: Data Collection Tool = '{short(a, 40)}' vs Main Survey Actual row {it.msa_row} "
                                      f"= '{short(b, 40)}'."))
        if len(found) > 25:
            ex = "; ".join(f"{it.num or it.key} ({m.split(':')[0]})" for it, m in found[:8])
            self.add("SYNC-01", found[0][0], f"{len(found)} inputs differ between the Data Collection Tool sheet and Main Survey Actual - "
                     f"the plain copy has not been updated. Save/sync the tool before submitting. First differences: {ex} ...")
        else:
            for it, m in found:
                self.add("SYNC-01", it, m)


# --------------------------------------------------------------------------------------
# Report
# --------------------------------------------------------------------------------------
def write_report(chk, out_path):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Summary"
    bold = Font(bold=True)
    hdr_fill = PatternFill("solid", fgColor="1F3864")
    hdr_font = Font(bold=True, color="FFFFFF")
    sev_fill = {"Error": PatternFill("solid", fgColor="F8CBAD"), "Warning": PatternFill("solid", fgColor="FFE699"),
                "Info": PatternFill("solid", fgColor="DDEBF7")}
    wrap = Alignment(wrap_text=True, vertical="top")

    issues = sorted(chk.issues, key=lambda x: (SEV_ORDER[x.severity], x.item.order if x.item else 0, x.rule))
    counts = defaultdict(lambda: defaultdict(int))
    for x in issues:
        counts[x.rule][x.severity] += 1
    tot = defaultdict(int)
    for x in issues:
        tot[x.severity] += 1

    ws["A1"] = "SLCP Verifier Tool - Quality Check Report"
    ws["A1"].font = Font(bold=True, size=14)
    info = [("Tool file", os.path.basename(chk.path)), ("Checked on", dt.datetime.now().strftime("%Y-%m-%d %H:%M")),
            ("Checker version", CHECKER_VERSION), ("Step selected", f"Step {chk.step}"),
            ("Facility", s(chk.eff("fp-bi-1"))), ("Country", s(chk.eff("fp-bi-7"))),
            ("Questions read", len(chk.items)),
            ("Errors", tot["Error"]), ("Warnings", tot["Warning"]), ("Info", tot["Info"])]
    for i, (k, v) in enumerate(info, 3):
        ws.cell(i, 1, k).font = bold
        ws.cell(i, 2, v)
    for sev in ("Error", "Warning"):
        r = [i for i, (k, _) in enumerate(info, 3) if k == sev + "s"][0]
        ws.cell(r, 2).fill = sev_fill[sev]
    r0 = len(info) + 5
    heads = ["Rule ID", "Category", "Check", "Errors", "Warnings", "Info"]
    for j, h in enumerate(heads, 1):
        c = ws.cell(r0, j, h)
        c.font, c.fill = hdr_font, hdr_fill
    r = r0 + 1
    for rid, (cat, title, _) in RULES.items():
        ws.cell(r, 1, rid)
        ws.cell(r, 2, cat)
        ws.cell(r, 3, title).alignment = wrap
        for j, sev in enumerate(("Error", "Warning", "Info"), 4):
            n = counts[rid][sev]
            c = ws.cell(r, j, n if n else None)
            if n:
                c.fill = sev_fill[sev]
        r += 1
    if chk.skipped:
        r += 1
        ws.cell(r, 1, "Notes - checks that could not fully run on this template").font = bold
        r += 1
        for rid, msg in chk.skipped:
            ws.cell(r, 1, rid)
            ws.cell(r, 3, msg).alignment = wrap
            r += 1
    for col, w in zip("ABCDEF", (16, 22, 95, 9, 10, 8)):
        ws.column_dimensions[col].width = w

    # Issues sheet
    wi = wb.create_sheet("Issues")
    cols = ["#", "Severity", "Rule ID", "Category", "Section", "Q Number", "Key", "Tool Row", "Field", "Issue",
            "Question", "Facility Response (S)", "Verification Selection (Y)", "Corrected Response (AB)",
            "Verification Data (AH)", "Non-Compliance (AN)", "Legal Reference (AP)"]
    widths = [5, 9, 9, 15, 18, 13, 14, 8, 20, 70, 50, 28, 26, 26, 34, 8, 26]
    for j, h in enumerate(cols, 1):
        c = wi.cell(1, j, h)
        c.font, c.fill, c.alignment = hdr_font, hdr_fill, Alignment(wrap_text=True, vertical="center")
        wi.column_dimensions[openpyxl.utils.get_column_letter(j)].width = widths[j - 1]
    tool_name = os.path.basename(chk.path)
    same_dir = os.path.dirname(os.path.abspath(out_path)) == os.path.dirname(os.path.abspath(chk.path))
    link_base = tool_name if same_dir else os.path.abspath(chk.path)
    for i, x in enumerate(issues, 2):
        it = x.item
        vals = [i - 1, x.severity, x.rule, RULES[x.rule][0], it.section, it.num, it.key, it.row, x.field, x.msg,
                short(it.text, 300), short(it.fac, 300), s(it.sel), short(it.cor, 300), short(it.exp, 300), s(it.nc), short(it.lr, 300)]
        for j, v in enumerate(vals, 1):
            c = wi.cell(i, j, v)
            c.alignment = wrap
        wi.cell(i, 2).fill = sev_fill[x.severity]
        c = wi.cell(i, 8)
        c.hyperlink = f"{link_base}#'{chk.dct_sheet}'!E{it.row}"
        c.font = Font(color="0563C1", underline="single")
    wi.freeze_panes = "A2"
    wi.auto_filter.ref = f"A1:{openpyxl.utils.get_column_letter(len(cols))}{max(2, len(issues) + 1)}"

    # Rules sheet
    wr = wb.create_sheet("Rules")
    for j, h in enumerate(["Rule ID", "Category", "Check", "Default severity"], 1):
        c = wr.cell(1, j, h)
        c.font, c.fill = hdr_font, hdr_fill
    for i, (rid, (cat, title, sev)) in enumerate(RULES.items(), 2):
        for j, v in enumerate((rid, cat, title, sev), 1):
            wr.cell(i, j, v).alignment = wrap
    for col, w in zip("ABCD", (10, 22, 100, 16)):
        wr.column_dimensions[col].width = w
    wb.save(out_path)


def main():
    ap = argparse.ArgumentParser(description="SLCP Verifier Tool quality checker")
    ap.add_argument("tool", help="filled Verifier Tool .xlsm")
    ap.add_argument("-o", "--out", help="report .xlsx path")
    a = ap.parse_args()
    if not os.path.isfile(a.tool):
        sys.exit(f"File not found: {a.tool}")
    out = a.out or os.path.join(os.path.dirname(os.path.abspath(a.tool)),
                                os.path.splitext(os.path.basename(a.tool))[0] + f" - QC Report {dt.date.today():%y%m%d}.xlsx")
    print(f"Reading {a.tool} ...")
    chk = Checker(a.tool)
    chk.run()
    write_report(chk, out)
    n = defaultdict(int)
    for x in chk.issues:
        n[x.severity] += 1
    print(f"{len(chk.items)} questions checked: {n['Error']} errors, {n['Warning']} warnings, {n['Info']} info")
    print(f"Report: {out}")


if __name__ == "__main__":
    main()
