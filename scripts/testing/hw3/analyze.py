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
S, L, START, EXIT = m["states"], m["links"], m["start"], m["exit"]
ids = list(S)
by_pair = {(l["from"], l["to"]): l for l in L}
out = {s: [l for l in L if l["from"] == s] for s in ids}

# ---------- other representations: transition list (table) and matrix ----------
table = [[l["id"], l["from"], l["input"], l["to"]] for l in L]
matrix = [[by_pair[(a, b)]["id"] if (a, b) in by_pair else "" for b in ids] for a in ids]


# ---------- coverage test cases (paths from START to EXIT) ----------
def shortest(src, goal):
    prev, q = {src: None}, deque([src])
    while q:
        s = q.popleft()
        if goal(s) and s != src:
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
        path, cur = [START], START
        todo.discard(START)
        while (nxt := shortest(cur, lambda s: s in todo and s != EXIT)):
            path += nxt[1:]
            cur = path[-1]
            todo -= set(nxt)
        path += shortest(cur, lambda s: s == EXIT)[1:]
        todo -= set(path)
        tests.append(path)
    return tests


def link_tests():
    uncovered = {l["id"] for l in L}
    tests = []

    def take(path):
        for a, b in zip(path, path[1:]):
            uncovered.discard(by_pair[(a, b)]["id"])

    while uncovered:
        path, cur = [START], START
        while True:
            fresh = sorted((l for l in out[cur] if l["id"] in uncovered and l["to"] != EXIT),
                           key=lambda l: (l["to"] != cur, l["id"]))  # self-loops first
            if fresh:
                take([cur, fresh[0]["to"]])
                path.append(fresh[0]["to"])
                cur = path[-1]
                continue
            nxt = shortest(cur, lambda s: any(x["id"] in uncovered and x["to"] != EXIT for x in out[s]))
            if not nxt:
                break
            take(nxt)
            path += nxt[1:]
            cur = path[-1]

        def new_exit(s):
            return by_pair.get((s, EXIT), {}).get("id") in uncovered

        tail = [cur] if new_exit(cur) else (shortest(cur, new_exit) or [cur])
        if tail[-1] != EXIT:
            tail += shortest(tail[-1], lambda s: s == EXIT)[1:]
        take(tail)
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

# Rule-based imputation for links that exist but were never taken in the walkthroughs
# (add-one), plus one more where task-driven walkthroughs are known to understate it.
IMPUTED = {
    "L10": (1, "add-one: Perches back to Feed was never taken"),
    "L16": (2, "add-one, +1: users often leave right after sending a request"),
}
markov = []
for s in ids:
    if s == EXIT:
        continue
    total = sum(real[l["id"]] + IMPUTED.get(l["id"], (0,))[0] for l in out[s])
    for l in out[s]:
        r, i = real[l["id"]], IMPUTED.get(l["id"], (0,))[0]
        markov.append({"id": l["id"], "from": s, "to": l["to"], "input": l["input"], "real": r, "imputed": i,
                       "rowTotal": total, "p": round((r + i) / total, 3)})
P = {(x["from"], x["to"]): Fraction(x["real"] + x["imputed"], x["rowTotal"]) for x in markov}

# Expected visits per session: fundamental matrix N = (I - Q)^-1, row START (exact fractions).
T = [s for s in ids if s != EXIT]
n = len(T)
A = [[(1 if i == j else 0) - P.get((T[i], T[j]), 0) for j in range(n)] + [Fraction(int(i == j)) for j in range(n)] for i in range(n)]
for c in range(n):
    piv = next(r for r in range(c, n) if A[r][c] != 0)
    A[c], A[piv] = A[piv], A[c]
    A[c] = [x / A[c][c] for x in A[c]]
    for r in range(n):
        if r != c and A[r][c] != 0:
            f = A[r][c]
            A[r] = [x - f * y for x, y in zip(A[r], A[c])]
visits = {T[j]: A[T.index(START)][n + j] for j in range(n)}
screens = [s for s in T if s != START]
vsum = sum(visits[s] for s in screens)
musa = [{"state": s, "name": S[s], "visits": round(float(visits[s]), 3), "p": round(float(visits[s] / vsum), 3)} for s in screens]

result = {
    "table": table, "matrixStates": ids, "matrix": matrix,
    "nodeTests": [{"id": f"N{i+1}", "path": p, "links": links_of(p)} for i, p in enumerate(nt)],
    "linkTests": [{"id": f"K{i+1}", "path": p, "links": links_of(p)} for i, p in enumerate(lt)],
    "realTransitions": sum(real.values()), "imputedTransitions": sum(v[0] for v in IMPUTED.values()),
    "imputationRationale": {k: v[1] for k, v in IMPUTED.items()},
    "markov": markov, "expectedScreensPerSession": round(float(vsum), 3), "musa": musa,
}
json.dump(result, open(D + "analysis.json", "w"), indent=1)

# ---------- diagram ----------
pos = {"S1": (0, 2), "S2": (2, 3.4), "S3": (2.6, 1.0), "S4": (5, 2.2), "S5": (7.4, 3.4), "S6": (9.4, 2.2), "S7": (5.6, -0.6)}
R = 0.45
fig, ax = plt.subplots(figsize=(10, 4.6))
for st, (x, y) in pos.items():
    ax.add_patch(plt.Circle((x, y), R, fc="#d9d9d9" if st in (START, EXIT) else "#e8f1fb", ec="black", lw=1.2, zorder=3))
    ax.text(x, y + 0.1, st, ha="center", va="center", fontsize=11, weight="bold", zorder=4)
    ax.text(x, y - 0.17, S[st], ha="center", va="center", fontsize=7, zorder=4)
for l in L:
    a, b = l["from"], l["to"]
    (x1, y1), (x2, y2) = pos[a], pos[b]
    if a == b:
        ax.add_patch(FancyArrowPatch((x1 - 0.22, y1 + 0.38), (x1 + 0.22, y1 + 0.38), connectionstyle="arc3,rad=-1.7",
                                     arrowstyle="-|>", mutation_scale=12, lw=0.9, zorder=2))
        ax.text(x1, y1 + 0.95, l["id"], fontsize=8, ha="center", color="#b00")
        continue
    rad = 0.15 if (b, a) in by_pair else 0.0
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), connectionstyle=f"arc3,rad={rad}", arrowstyle="-|>",
                                 mutation_scale=12, lw=0.9, shrinkA=30, shrinkB=30, color="#333", zorder=1))
    f = 0.3 if l["id"] == "L4" else 0.5  # keep L4's label clear of L6
    mx, my = x1 + (x2 - x1) * f + rad * (y2 - y1) * 0.5, y1 + (y2 - y1) * f - rad * (x2 - x1) * 0.5
    ax.text(mx, my, l["id"], fontsize=8, color="#b00", ha="center", va="center",
            bbox=dict(boxstyle="round,pad=0.1", fc="white", ec="none", alpha=0.9), zorder=2)
ax.set_xlim(-0.7, 10.1); ax.set_ylim(-1.3, 4.5); ax.set_aspect("equal"); ax.axis("off")
plt.tight_layout()
plt.savefig(D + "fsm-diagram.png", dpi=200)

print("node", [" ".join(p) for p in nt])
print("link", [" ".join(p) for p in lt])
print("real", result["realTransitions"], "imputed", result["imputedTransitions"], "screens", result["expectedScreensPerSession"])
for x in markov:
    print(x["id"], x["from"], x["to"], x["real"], x["imputed"], x["p"])
print(musa)
