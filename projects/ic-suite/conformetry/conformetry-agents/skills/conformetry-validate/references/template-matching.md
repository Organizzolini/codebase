# How a path is attributed to a template

Nothing records where an instance came from. There is no marker, no manifest, no
provenance field — an instance is ordinary code. So the template is **inferred**
from how much of its structure the path already has.

This is why two of the outcomes are themselves reported as differences: the
matcher can fail to reach an answer, and that failure is a real finding rather
than something to skip silently.

## The pipeline

1. **The host expands the configured instance globs into candidates.** A
   candidate is a directory the template's tree would be laid over, plus the name
   it renders with. Under Nx, a group carrying tags is read inside each project
   it selects; a group without tags is a plain workspace glob.
2. **Every template is scored against the candidate** by counting how many of its
   files the candidate already has, after rendering the template's own file names
   with that candidate's substitutions.
3. **Templates sharing no file at all are discarded.** Any overlap qualifies —
   the bar is deliberately at the floor, so a badly drifted instance still gets
   attributed and reported rather than vanishing.
4. **The survivors are ranked**, and the verdict follows from the top of that
   ranking.

## The ranking rules

In order:

1. **Coverage ratio** — matched files divided by the template's total files.
2. **Absolute matched count**, breaking ratio ties.
3. **Template name**, so the result is deterministic.

Ratio leads rather than count because otherwise a large template wins on a weak
partial match: a five-file module matching three files of a seven-file template
would beat a template it fits completely.

Count breaking the tie is what lets a five-file module template beat a two-file
file-level template when both match completely.

## The four outcomes

**Matched.** One template tops the ranking. The instance is compared against it.

**Matched against several.** When templates tie _completely_ — every file of each
is present — the instance is compared against all of them. A module holding both
a command and a service genuinely is an instance of both, and calling that
ambiguous would demand narrowing a glob that is not wrong.

**Ambiguous.** Templates tie but only partially. Reported as a difference naming
every tied template. Fix by giving those templates distinguishing files, or by
narrowing the glob so only one applies.

**No match.** Nothing shared a single file. Reported as a difference. Either the
path is not generated code and does not belong in the instance globs, or it has
drifted past recognition.

## Why file globs and directory globs differ

A **directory** glob leaves the match scope open, and the largest fitting
template wins.

A **file** glob narrows the scope to the matched files, so a template describing
exactly those files fits better than one describing a whole directory. That is
what lets a two-file template win where a whole-module template would otherwise
dominate.

If a path is being attributed to a template you did not expect, the glob's shape
is the first thing to check.

## Deduplication, and the second round of differences

Only **one finding per instance file** is reported, taken from the **smallest**
template that reported it — fewest files, then name.

The consequence is documented in the implementation and worth planning for: a
requirement unique to a larger template goes unreported for any file a smaller
template also covers. So after satisfying everything in a report, a re-run can
surface a fresh batch.

**Iterate until the run is clean.** A second report is not a regression, and it
is not the check contradicting itself — it is the next layer becoming visible.

## Diagnosing an attribution failure

```bash
conformetry templates --instances <path>
```

reports every template that explains the path, its matched-file count against
the template's total, and the resulting percentage — the ranking above, for a
real path:

```text
  nestjs-service-module (nsm)
    Template: configuration/conformetry-templates/nestjs-service-module
    Instances:
      packages/widgets/src/modules/orders 5/5 files 100%
  nestjs-command-module (ncm)
    Template: configuration/conformetry-templates/nestjs-command-module
    Instances:
      packages/widgets/src/modules/orders 3/5 files 60%
```

There is no single verdict line, deliberately: a path can belong to several
templates at once, and collapsing that to one answer is what makes an ambiguous
outcome unreadable. The ranking _is_ the answer.

Going the other way, `conformetry instances --templates <name>` lists every
instance a template explains — which is how you find everything a template
change would touch before making it.

Read it as a diff of expectations: a template you expected near the top sitting
low means its files are not where the candidate has them, which is usually a
destination mistake or an empty placeholder in a rendered file name rather than
missing content.
