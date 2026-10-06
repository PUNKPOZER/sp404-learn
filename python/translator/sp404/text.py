"""All user-facing tutorial wording lives here.

Button names are the ones printed on the SP-404MKII and used in Roland's official
"SP-404MK2 Reference Manual" (checked 2026-10-06):
  Creating a new pattern (TR-REC): https://static.roland.com/manuals/sp-404mk2_reference_v4/en-US/7921805978489483.html
  Playing back patterns in order (PATTERN CHAIN): https://static.roland.com/manuals/sp-404mk2_reference_v500/en-US/7925133978493323.html
Do not add a button combination here unless it appears in that documentation."""

BTN_PATTERN = "PATTERN SELECT"
BTN_REC = "REC"
BTN_REMAIN = "REMAIN"
BTN_SUBPAD = "SUB PAD"
BTN_EXIT = "EXIT"
BTN_HOLD = "HOLD"

STEP_NAMES_NOTE = "В TR-REC пэды [1]–[16] — это шаги такта (1 = первый шаг)."

# TR-REC setup, as printed in the manual: PATTERN SELECT → REC → empty (red) pad → REMAIN (method "TR-REC") → REC.
TRREC_CONTROLS = [BTN_PATTERN, BTN_REC, BTN_REMAIN, BTN_SUBPAD]
TRREC_HOWTO = (f"[{BTN_PATTERN}] → [{BTN_REC}] → пустой (красный) пэд → [{BTN_REMAIN}] (способ записи «TR-REC») → [{BTN_REC}]; "
               f"дальше, удерживая [{BTN_SUBPAD}], выбирай пэд сэмпла, а пэды [1]–[16] — это шаги такта.")
