"""CS 5314 HW3: representations, coverage tests and Markov-OP for the Perch FSM.

    python3 scripts/testing/hw3/analyze.py

Reads docs/testing/hw3/fsm-v1.json (the validated FSM) and
docs/testing/hw3/walkthrough-sessions.json (observed team sessions), writes
docs/testing/hw3/analysis.json and docs/testing/hw3/fsm-diagram.png.
"""
import json
from collections import Counter, deque
from fractions import Fraction

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import FancyArrowPatch  # noqa: E402

D = "docs/testing/hw3/"
m = json.load(open(D + "fsm-v1.json"))
sessions = json.load(open(D + "walkthrough-sessions.json"))["sessions"]
S, L = m["states"], m["links"]
ids = list(S)
by_pair = {(l["from"], l["to"]): l for l in L}
out = {s: [l for l in L if l["from"] == s] for s in ids}

# ---------- other representations: transition list (table) and matrix ----------
table = [[l["id"], l["from"], l["input"], l["to"]] for l in L]
matrix = [[by_pair[(a, b)]["id"] if (a, b) in by_pair else "" for b in ids] for a in ids]


# ---------- coverage test cases ----------
def shortest(src, goal_fn):
    prev, q = {src: None}, deque([src])
    while q:
        s = q.popleft()
        if goal_fn(s) and s != src:
            path = [s]
            while prev[path[-1]] is not None:
                path.append(prev[path[-1]])
            return path[::-1]
        for l in out[s]:
            if l["to"] not in prev:
                prev[l["to"]] = s
                q.append(l["to"])
    return None


def node_tests():
    tests, todo = [], set(ids)
    while todo:
        path, cur = ["S1"], "S1"
        todo.discard("S1")
        while True:
            nxt = shortest(cur, lambda s: s in todo and s != "S10")
            if not nxt or len(path) > 8:
                break
            path += nxt[1:]
            cur = path[-1]
            todo -= set(nxt)
        path += shortest(cur, lambda s: s == "S10")[1:]
        todo -= set(path)
        tests.append(path)
    return tests


def link_tests(max_len=14):
    uncovered = {l["id"] for l in L}
    tests = []
    while uncovered:
        path, cur = ["S1"], "S1"
        while True:
            fresh = [l for l in out[cur] if l["id"] in uncovered and l["to"] != "S10"]
            # take a fresh non-exit link, preferring self-loops (repetition) first
            fresh.sort(key=lambda l: (l["to"] != cur, l["id"]))
            if fresh and len(path) < max_len:
                l = fresh[0]
                uncovered.discard(l["id"])
                path.append(l["to"])
                cur = l["to"]
                continue
            target = shortest(cur, lambda s: any(x["id"] in uncovered and x["to"] != "S10" for x in out[s]))
            if target and len(path) + len(target) < max_len:
                for a, b in zip(target, target[1:]):
                    uncovered.discard(by_pair[(a, b)]["id"])
                path += target[1:]
                cur = path[-1]
                continue
            break
        # leave through an uncovered exit when one is reachable, else the nearest exit
        def has_new_exit(s):
            return by_pair.get((s, "S10"), {}).get("id") in uncovered

        exit_from = [cur] if has_new_exit(cur) else shortest(cur, has_new_exit)
        if exit_from:
            for a, b in zip(exit_from, exit_from[1:]):
                uncovered.discard(by_pair[(a, b)]["id"])
            path += exit_from[1:]
            cur = path[-1]
        tail = shortest(cur, lambda s: s == "S10") if (cur, "S10") not in by_pair else [cur, "S10"]
        for a, b in zip(tail, tail[1:]):
            uncovered.discard(by_pair[(a, b)]["id"])
        path += tail[1:]
        tests.append(path)
    return tests


def links_of(path):
    return [by_pair[(a, b)]["id"] for a, b in zip(path, path[1:])]


nt, lt = node_tests(), link_tests()
assert set(s for p in nt for s in p) == set(ids)
assert set(x for p in lt for x in links_of(p)) == {l["id"] for l in L}

# ---------- Markov-OP: observed (real) + imputed counts ----------
real = Counter()
for s in sessions:
    for a, b in zip(s["path"], s["path"][1:]):
        real[by_pair[(a, b)]["id"]] += 1

# Imputed counts for links that exist but were never observed in the walkthroughs.
# Rule-based (not random): add-one for every unseen link, plus one more where the
# target is a core screen (Flyway/Perches) or where task-driven walkthroughs are known
# to understate leaving (Map is often a last stop to check a commute).
IMPUTED = {
    "L09": (2, "Perches -> Flyway: core screen, back to events after browsing"),
    "L12": (1, "Perches -> Nest: add-one"),
    "L16": (1, "Migration -> Nest: add-one"),
    "L18": (2, "Chirps -> Perches: core screen, check a place a friend sent"),
    "L19": (1, "Chirps -> Migration: add-one"),
    "L22": (1, "Nest -> Perches: add-one"),
    "L23": (1, "Nest -> Migration: add-one"),
    "L24": (1, "Nest -> Chirps: add-one"),
    "L36": (1, "Booking -> Exit: add-one (walkthroughs always closed the sheet)"),
    "L37": (2, "Migration -> Exit: map is often a last stop; walkthroughs understate it"),
}
markov = []
for s in ids:
    if s == "S10":
        continue
    row = out[s]
    total = sum(real[l["id"]] + IMPUTED.get(l["id"], (0,))[0] for l in row)
    for l in row:
        r, i = real[l["id"]], IMPUTED.get(l["id"], (0, ""))[0]
        markov.append({"id": l["id"], "from": s, "to": l["to"], "input": l["input"], "real": r, "imputed": i,
                       "total": r + i, "rowTotal": total, "p": round((r + i) / total, 3)})
P = {(x["from"], x["to"]): Fraction(x["total"], x["rowTotal"]) for x in markov}

# Expected visits per session: fundamental matrix N = (I - Q)^-1, row S1 (exact fractions).
T = [s for s in ids if s != "S10"]
n = len(T)
A = [[(1 if i == j else 0) - P.get((T[i], T[j]), 0) for j in range(n)] + [Fraction(int(i == j)) for j in range(n)] for i in range(n)]
for c in range(n):
    piv = next(r for r in range(c, n) if A[r][c] != 0)
    A[c], A[piv] = A[piv], A[c]
    d = A[c][c]
    A[c] = [x / d for x in A[c]]
    for r in range(n):
        if r != c and A[r][c] != 0:
            f = A[r][c]
            A[r] = [x - f * y for x, y in zip(A[r], A[c])]
visits = {T[j]: A[0][n + j] for j in range(n)}
screens = [s for s in T if s != "S1"]
vsum = sum(visits[s] for s in screens)
musa_states = [{"state": s, "name": S[s], "visits": round(float(visits[s]), 3), "p": round(float(visits[s] / vsum), 3)} for s in screens]

# Musa-OP over operations (links = user actions): expected traversals per session.
ops = {}
for x in markov:
    if x["from"] == "S1" or x["to"] == "S10":
        continue
    key = x["input"] if not x["input"].startswith("tap ") or "tab" not in x["input"] else "switch tab (bottom nav)"
    ops[key] = ops.get(key, 0) + visits[x["from"]] * Fraction(x["total"], x["rowTotal"])
osum = sum(ops.values())
musa_ops = sorted(({"operation": k, "perSession": round(float(v), 3), "p": round(float(v / osum), 3)} for k, v in ops.items()), key=lambda r: -r["p"])

result = {
    "table": table, "matrixStates": ids, "matrix": matrix,
    "nodeTests": [{"id": f"N{i+1}", "path": p, "links": links_of(p)} for i, p in enumerate(nt)],
    "linkTests": [{"id": f"K{i+1}", "path": p, "links": links_of(p)} for i, p in enumerate(lt)],
    "realTransitions": sum(real.values()), "imputedTransitions": sum(v[0] for v in IMPUTED.values()),
    "imputationRationale": {k: v[1] for k, v in IMPUTED.items()},
    "markov": markov,
    "expectedScreensPerSession": round(float(vsum), 3),
    "musaStates": musa_states, "musaOperations": musa_ops,
}
json.dump(result, open(D + "analysis.json", "w"), indent=1)

# ---------- diagram: (a) task flow + exits, (b) bottom-nav links between tabs ----------
TABS = {"S3", "S4", "S7", "S8", "S9"}
nav = [l for l in L if l["from"] in TABS and l["to"] in TABS and l["from"] != l["to"]]
flow = [l for l in L if l not in nav]
R = 0.42


def draw(ax, pos, links, short=False):
    for st, (x, y) in pos.items():
        ax.add_patch(plt.Circle((x, y), R, fc="#e8f1fb" if st not in ("S1", "S10") else "#d9d9d9", ec="black", lw=1.2, zorder=3))
        ax.text(x, y + 0.09, st, ha="center", va="center", fontsize=10, weight="bold", zorder=4)
        ax.text(x, y - 0.16, S[st].split(" (")[0].replace("Booking requested", "Booking"), ha="center", va="center", fontsize=6.5, zorder=4)
    pairs = {(l["from"], l["to"]) for l in links}
    for l in links:
        a, b = l["from"], l["to"]
        (x1, y1), (x2, y2) = pos[a], pos[b]
        num = l["id"]
        if a == b:
            ax.add_patch(FancyArrowPatch((x1 - 0.22, y1 + 0.36), (x1 + 0.22, y1 + 0.36), connectionstyle="arc3,rad=-1.7",
                                         arrowstyle="-|>", mutation_scale=11, lw=0.9, zorder=2))
            ax.text(x1, y1 + 0.9, num, fontsize=7, ha="center", color="#b00")
            continue
        rad = 0.15 if (b, a) in pairs else (0.32 if num == "L04" else 0.0)
        ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), connectionstyle=f"arc3,rad={rad}", arrowstyle="-|>",
                                     mutation_scale=11, lw=0.8, shrinkA=27, shrinkB=27, color="#333", zorder=1))
        f = 0.5 if not short else 0.35
        mx, my = x1 + (x2 - x1) * f, y1 + (y2 - y1) * f
        mx += rad * (y2 - y1) * 0.5
        my -= rad * (x2 - x1) * 0.5
        ax.text(mx, my, num, fontsize=6.5, color="#b00", ha="center", va="center",
                bbox=dict(boxstyle="round,pad=0.1", fc="white", ec="none", alpha=0.9), zorder=2)


fig, (a1, a2) = plt.subplots(1, 2, figsize=(14, 6.2), gridspec_kw={"width_ratios": [1.55, 1]})
pa = {"S1": (0, 2.2), "S2": (1.8, 3.8), "S3": (2.6, 1.4), "S4": (4.6, 3.0), "S5": (6.6, 4.2), "S6": (8.6, 3.0),
      "S7": (4.6, -0.6), "S8": (6.6, -0.6), "S9": (8.6, -0.6), "S10": (9.4, 1.2)}
draw(a1, pa, flow)
a1.set_xlim(-0.7, 10.1); a1.set_ylim(-1.3, 5.3); a1.axis("off")
a1.set_title("(a) Task flow, repetition (self-loops) and exits", fontsize=11)
import math
pb = {}
for k, st in enumerate(["S3", "S4", "S9", "S8", "S7"]):
    ang = math.pi / 2 + k * 2 * math.pi / 5
    pb[st] = (2.3 * math.cos(ang), 2.3 * math.sin(ang))
draw(a2, pb, nav, short=True)
a2.set_xlim(-3.2, 3.2); a2.set_ylim(-3.0, 3.2); a2.set_aspect("equal"); a2.axis("off")
a2.set_title("(b) Bottom-nav links L05-L24 between the five tabs", fontsize=11)
plt.tight_layout()
plt.savefig(D + "fsm-diagram.png", dpi=200)
print("node tests", [" ".join(p) for p in nt])
print("link tests", len(lt))
for t in lt:
    print("  ", " ".join(t))
print("real", sum(real.values()), "imputed", sum(v[0] for v in IMPUTED.values()), "screens/session", result["expectedScreensPerSession"])
print(musa_states)
print(musa_ops[:6])
