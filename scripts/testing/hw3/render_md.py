"""CS 5314 HW3: fill the {{MARKERS}} in docs/testing/hw3/hw3-template.md with tables
generated from the model and analysis JSON, writing docs/testing/hw3/hw3.md."""
import json

D = "docs/testing/hw3/"
m = json.load(open(D + "fsm-v1.json"))
v0 = json.load(open(D + "fsm-v0-draft.json"))
a = json.load(open(D + "analysis.json"))
w = json.load(open(D + "walkthrough-sessions.json"))["sessions"]
cov = {r["id"]: r for r in json.load(open(D + "coverage-test-results.json"))["sessions"]}
S = m["states"]


def tbl(head, rows):
    out = ["| " + " | ".join(head) + " |", "| " + " | ".join("---" for _ in head) + " |"]
    out += ["| " + " | ".join(str(c) for c in r) + " |" for r in rows]
    return "\n".join(out)


def short(s):
    return S[s].split(" (")[0]


DESC = {
    "S1": "Landing page; start onboarding or reopen the app",
    "S2": "Offer upload, review, account, Spotify, Takeout, photo, flock",
    "S3": "Event feed with comments (Flyway tab)",
    "S4": "Swipe deck of sublets (Perches tab)",
    "S5": "Detail sheet for one listing",
    "S6": "Request-to-book sent, waiting on the host",
    "S7": "City map with layers (Migration tab)",
    "S8": "Conversation list and threads (Chirps tab)",
    "S9": "Own profile and checklist (Nest tab)",
    "S10": "User leaves the app",
}
fills = {
    "STATES": tbl(["State", "Name", "What the user sees"], [[s, S[s], DESC[s]] for s in S]),
    "TRANSITIONS": tbl(["Link", "From", "Input (user action)", "To"],
                       [[i, f"{f} {short(f)}", e, f"{t} {short(t)}"] for i, f, e, t in a["table"]]),
    "MATRIX": tbl(["From \\ To"] + a["matrixStates"],
                  [[s] + [c[1:].lstrip("0") if c else "" for c in row] for s, row in zip(a["matrixStates"], a["matrix"])]),
    "NODE_TESTS": tbl(["Test", "Path (states)", "New states covered", "Result on app"],
                      [[t["id"], " > ".join(t["path"]), ", ".join(sorted(set(t["path"]) - set(x for u in a["nodeTests"][:k] for x in u["path"]), key=lambda s: int(s[1:]))),
                        "pass" if cov[t["id"]]["ok"] else "fail"] for k, t in enumerate(a["nodeTests"])]),
    "LINK_TESTS": tbl(["Test", "Path (states)", "Links covered", "Result on app"],
                      [[t["id"], " > ".join(t["path"]), ", ".join(x[1:].lstrip("0") for x in t["links"]),
                        "pass" if cov[t["id"]]["ok"] else "fail"] for t in a["linkTests"]]),
    "SESSIONS": tbl(["Session", "Task", "Observed path"], [[s["id"], s["task"], " > ".join(s["path"])] for s in w]),
    "MARKOV": tbl(["Link", "From", "To", "Real", "Imputed", "Prob."],
                  [[x["id"], short(x["from"]), short(x["to"]), x["real"], x["imputed"] or "", f'{x["p"]:.3f}'] for x in a["markov"]]),
    "IMPUTED": tbl(["Link", "Imputed count", "Rule"], [[k, next(x["imputed"] for x in a["markov"] if x["id"] == k), v] for k, v in a["imputationRationale"].items()]),
    "MUSA_STATES": tbl(["Screen (operation)", "Expected visits per session", "Musa-OP probability"],
                       [[f'{r["state"]} {r["name"]}', f'{r["visits"]:.3f}', f'{r["p"]:.3f}'] for r in sorted(a["musaStates"], key=lambda r: -r["p"])]),
    "MUSA_OPS": tbl(["Operation (user action)", "Expected per session", "Probability"],
                    [[r["operation"], f'{r["perSession"]:.3f}', f'{r["p"]:.3f}'] for r in a["musaOperations"]]),
    "REAL_N": str(a["realTransitions"]),
    "IMP_N": str(a["imputedTransitions"]),
    "SCREENS_PER_SESSION": f'{a["expectedScreensPerSession"]:.2f}',
    "V0_LINKS": str(len(v0["links"])),
}
src = open(D + "hw3-template.md").read()
for k, v in fills.items():
    src = src.replace("{{" + k + "}}", v)
assert "{{" not in src, src[src.index("{{"):src.index("{{") + 40]
open(D + "hw3.md", "w").write(src)
print("ok")
