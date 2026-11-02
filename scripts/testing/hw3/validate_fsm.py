"""CS 5314 HW3: validate an FSM model (JSON) for the problems the assignment lists.

Checks: dangling links (missing source or destination), links to undefined states,
isolated states (no links at all), unreachable states (no path from start),
trap states (no path to exit), duplicate links (same from/to pair), and repetition
(self-loops or cycles). Usage: python3 validate_fsm.py model.json
"""
import json
import sys
from collections import defaultdict


def validate(m):
    states, links = m["states"], m["links"]
    issues = []
    out, inn = defaultdict(set), defaultdict(set)
    pairs = defaultdict(list)
    for l in links:
        f, t = l["from"], l["to"]
        if f is None or t is None:
            issues.append(("dangling link", f'{l["id"]} "{l["input"]}" from {f} to {t}'))
            continue
        for s in (f, t):
            if s not in states:
                issues.append(("undefined state", f'{l["id"]} refers to {s}'))
        out[f].add(t)
        inn[t].add(f)
        pairs[(f, t)].append(l["id"])
    for s in states:
        if s not in out and s not in inn:
            issues.append(("isolated state", f"{s} {states[s]}"))
    seen, todo = {m["start"]}, [m["start"]]
    while todo:
        for t in out[todo.pop()]:
            if t not in seen:
                seen.add(t)
                todo.append(t)
    for s in states:
        if s not in seen and (s in out or s in inn):
            issues.append(("unreachable state", f"{s} {states[s]}"))
    back, todo = {m["exit"]}, [m["exit"]]
    while todo:
        for f in inn[todo.pop()]:
            if f not in back:
                back.add(f)
                todo.append(f)
    for s in states:
        if s not in back and (s in out or s in inn):
            issues.append(("trap state (no way to exit)", f"{s} {states[s]}"))
    for (f, t), ids in pairs.items():
        if len(ids) > 1:
            issues.append(("duplicate link", f"{f}->{t}: {', '.join(ids)}"))
    loops = [l["id"] for l in links if l["from"] and l["from"] == l["to"]]
    return issues, loops


if __name__ == "__main__":
    m = json.load(open(sys.argv[1]))
    issues, loops = validate(m)
    print(f'{m["version"]}: {len(m["states"])} states, {len(m["links"])} links')
    for kind, what in issues:
        print(f"  PROBLEM {kind}: {what}")
    if not issues:
        print("  no problems found")
    print(f'  repetition: {len(loops)} self-loops ({", ".join(loops)})')
