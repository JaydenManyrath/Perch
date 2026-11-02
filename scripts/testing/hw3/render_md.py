"""CS 5314 HW3: fill the {{MARKERS}} in docs/testing/hw3/hw3-template.md with tables
generated from the model and analysis JSON, writing docs/testing/hw3/hw3.md."""
import json

D = "docs/testing/hw3/"
m = json.load(open(D + "fsm-v1.json"))
a = json.load(open(D + "analysis.json"))
S = m["states"]


def tbl(head, rows):
    out = ["| " + " | ".join(head) + " |", "| " + " | ".join("---" for _ in head) + " |"]
    out += ["| " + " | ".join(str(c) for c in r) + " |" for r in rows]
    return "\n".join(out)


tests = [("Node", t) for t in a["nodeTests"]] + [("Link", t) for t in a["linkTests"]]
fills = {
    "TRANSITIONS": tbl(["Link", "Current state", "Input", "Next state"],
                       [[i, f"{f} {S[f]}", e, f"{t} {S[t]}"] for i, f, e, t in a["table"]]),
    "MATRIX": tbl(["From \\ To"] + a["matrixStates"], [[s] + row for s, row in zip(a["matrixStates"], a["matrix"])]),
    "TESTS": tbl(["Test", "Coverage", "Path", "Links covered"],
                 [[t["id"], kind, " > ".join(t["path"]), ", ".join(x[1:] for x in t["links"])] for kind, t in tests]),
    "MARKOV": tbl(["Link", "From", "To", "Real", "Imputed", "Probability"],
                  [[x["id"], S[x["from"]], S[x["to"]], x["real"], x["imputed"] or "", f'{x["p"]:.3f}'] for x in a["markov"]]),
    "MUSA": tbl(["Operation (screen)", "Expected visits per session", "Musa-OP probability"],
                [[f'{r["state"]} {r["name"]}', f'{r["visits"]:.2f}', f'{r["p"]:.3f}'] for r in sorted(a["musa"], key=lambda r: -r["p"])]),
    "REAL_N": str(a["realTransitions"]),
    "IMP_N": str(a["imputedTransitions"]),
    "SCREENS": f'{a["expectedScreensPerSession"]:.1f}',
}
src = open(D + "hw3-template.md").read()
for k, v in fills.items():
    src = src.replace("{{" + k + "}}", v)
assert "{{" not in src
open(D + "hw3.md", "w").write(src)
print("ok")
