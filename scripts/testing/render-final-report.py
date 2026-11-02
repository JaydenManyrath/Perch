"""CS 7314: fill the {{MARKERS}} in docs/testing/final-report.md from the saved results,
writing docs/testing/final-report.filled.md (the source for the .docx)."""
import json

D = "docs/testing/"
ubst = json.load(open(D + "ubst/analysis.json"))
cov = json.load(open(D + "results/round4/coverage-by-technique.json"))
rounds = ubst["perRound"]
notes = {1: "before fixes", 2: "D15 fixed", 3: "same code as round 2", 4: "D16 fixed"}
found = {1: "D15 (10 sessions)", 2: "D16 (1 session)", 3: "none", 4: "none"}


def tbl(head, rows):
    out = ["| " + " | ".join(head) + " |", "| " + " | ".join("---" for _ in head) + " |"]
    return "\n".join(out + ["| " + " | ".join(str(c) for c in r) + " |" for r in rows])


ubst_rows = [[f"{r['round']}", notes.get(r["round"], ""), f"{r['defectFailures']} of {r['runs']}", f"{r['adjustedReliability']:.3f}",
              f"{r['ci95'][0]:.2f}-{r['ci95'][1]:.2f}", len(r["falsePositives"]), found.get(r["round"], "")] for r in rounds]
cmp_rows = [
    ["Baseline (existing suite)", "499", "0", "0", "-"],
    ["FSM/BBT", "74", "8", "0", "Event order, two actors, a missing transition"],
    ["PT/BBT", "78", "4", "1", "Unusual and invalid input classes"],
    ["CFT/WBT", "37", "1", "1", "A hidden fallback branch"],
    ["Markov-OP/UBST", f"{sum(r['runs'] for r in rounds)} sessions", "2", "1", "Failures on common user paths"],
    ["Code walkthrough", "-", "1", "0", "Hard-coded stay dates"],
]
sens = {v["variant"]: v["predictedReliability"] for v in ubst["sensitivityByRound"][0]["variants"]}
last = rounds[-1]
tail = (f"Rounds 3 and 4 found no failures; after the D16 fix, round 4 ran {last['runs']} sessions without a failure "
        f"(95% interval {last['ci95'][0]:.2f} to {last['ci95'][1]:.2f}).")
fills = {
    "COV_ALL": f"{cov['all']['total']['branches']:.1f}",
    "R_LAST": f"{last['adjustedReliability']:.2f}",
    "N_ROUNDS": str(len(rounds)),
    "UBST_TABLE": tbl(["Round", "Code", "Failed sessions", "Reliability", "95% interval", "Driver false positives", "Defects found"], ubst_rows),
    "CMP_TABLE": tbl(["Technique", "Test cases", "Defects", "High severity", "Kind of defect found"], cmp_rows),
    "ROUND_TAIL": tail,
    "GO_A": f"{ubst['growth']['a']:.2f}",
    "GO_B": f"{ubst['growth']['b']:.4f}",
    "GO_REMAINING": f"{ubst['growth']['expectedRemaining']:.2f}",
    "SENS_LOW": f"{sens['negotiate x0.5 (PERCHES->NEGOTIATE)']:.2f} (x0.5)",
    "SENS_HIGH": f"{sens['negotiate x1.5']:.2f} (x1.5)",
}
src = open(D + "final-report.md").read()
for k, v in fills.items():
    src = src.replace("{{" + k + "}}", v)
assert "{{" not in src, src[src.index("{{"):][:40]
open(D + "final-report.filled.md", "w").write(src)
print("ok", fills["COV_ALL"], fills["R_LAST"])
