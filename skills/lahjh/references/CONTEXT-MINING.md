# Context mining

Where context lives, cheapest first. Stop climbing when the string's meaning, speaker, slot, and constraints are established; record remaining uncertainty in the project brief.

Rank by cost to read, not by rung number. **In a repo small enough to read whole, read it whole** — per-string triage costs more than climbing. The rungs are for when the repo is too large to hold, and then: rung 1 is free, rung 3 changes answers rather than confirming them, rung 5 binds you to what shipped, and rung 6 is one file that often sets the register in a single sentence. Rung 2 is a cheap look that usually returns a confirmed negative. Rungs 4 and 7 mostly restate what rung 3 already said.

---

## Rung 1 — the string and its key

Free, and it answers more than people expect.

- **Namespace** gives the screen: `settings.notifications.empty.title` → settings screen, notifications section, empty state, title slot.
- **Slot noun** in the last segment gives a starting hypothesis: `title`، `body`، `cta`، `label`، `placeholder`، `toast`، `error`، `hint`، `confirm`، `legal`. Call-site evidence can override it.
- **Sibling keys** give what else is on screen. If `empty.title` and `empty.body` and `cta.create` all exist, you know the title must not repeat what the body says and neither may repeat the button.
- **Placeholders** declare the grammar problem: `{count}` means a plural decision, `{name}` means a vocative decision, `{date}` means a locale-format decision.
- **Punctuation and case** in the source: a trailing period means body text, its absence means a label, and Title Case in English usually means a UI element name that other strings will reference.

## Rung 2 — format metadata

Every modern format has a context field. Read it before guessing.

| Format | Where context lives |
|---|---|
| ARB (Flutter) | `"@key": { "description": …, "placeholders": {…} }` — description *and* typed placeholders |
| `.xcstrings` (Xcode 15+) | per-key `comment`; Xcode can auto-generate these from surrounding code |
| XLIFF | `<note>` elements, and Apple marks auto-generated ones |
| Android `strings.xml` | XML comments above the entry, plus `translatable="false"` |
| i18next JSON | sibling `_comment` keys by convention; plural suffixes `_zero _one _two _few _many _other` |
| `.po` / gettext | `#.` extracted comments, `#:` source references, `msgctxt` disambiguator |

A `translatable="false"` or a do-not-translate marker is context too: it tells you the house treats that token as a name.

## Rung 3 — the call site

Grep the key across the repo. One hit usually settles everything rungs 1 and 2 left open.

What the call site tells you that the key cannot:

- **Which component renders it.** A string inside `<Button>` is an action; the same words inside `<Text>` are a statement. This informs imperative versus nominal.
- **Length constraints.** `numberOfLines`, `ellipsizeMode`, `maxLength`, a fixed-width container, a tab bar. Arabic that overflows is worse than Arabic that is plain.
- **Conditional branches.** If the string only renders when `items.length === 0 && !isLoggedIn`, the person is not just empty-handed, they are logged out, which changes what the string should offer.
- **Adjacent strings in the same JSX block.** The real "what else is on screen", better than sibling keys.
- **Interpolation values.** What `{count}` is actually counting, whether it can be 0, 1, or 2 in practice, and which helper resolves it. A count that is never 1 may not need a singular, but verify the real runtime path.

## Rung 4 — the route

Navigation config, route names, file paths. `app/(tabs)/library/index.tsx` says the screen is a tab, which caps the label length and marks it as a place the person returns to. It does not by itself justify a metaphor. Rung 3 usually told you this already.

## Rung 5 — existing translations

If an `ar` file already exists, it is evidence whether or not anyone called it a termbase. The feedback ledger, not the file's age or presence in production, records approval.

- Mine it for recurring terms, register clues, and facts. Match a term only when the project ledger approves it; existing copy can itself be wrong or unapproved.
- Compare sibling surfaces for consistency, then record any disagreement instead of silently choosing the majority.
- Read other locales for product facts and implementation shape, not as approval of Arabic wording.

## Rung 6 — product surfaces

README, App Store listing, marketing site, design file, notification templates, SMS, email, and server error catalogs. These are product evidence for names, facts, audience, and tone. Record their source and date; they become approved wording only through explicit human approval.

## Rung 7 — git

`git log -S"<the English string>"` finds the commit and PR that introduced it. Read that when a string is genuinely opaque and the stakes justify it. This is the last rung because it is the most expensive and it usually only confirms what rung 3 already told you.

---

## Surface inventory

Search the requested source term and key across all reached surfaces before changing it. A frontend label may have a matching push notification, SMS, email, or server error. Shared meaning does not guarantee shared wording, but an explicit rejection or approved term must be swept through every governed occurrence.

## When the problem is not language

If the reported defect is caused by layout, font rendering, data, interaction, navigation, or a product rule, record it and leave the translation unchanged. Hand it to the relevant workflow; Lahjah covers language, semantics, consistency, and localization mechanics, not visual or device validation.

## When you cannot climb

Sometimes there is only a JSON file. This is the normal vendor situation, not a failure.

State an assumption rather than inventing a certainty. Write the string on the assumption, then flag it in the brief, since a locale file usually cannot hold a comment:

```
cart.badge.items — assumed the badge sits beside the cart icon, so the noun is
redundant and the digit stands alone. If it renders as standalone text, it needs
the noun back.
```

Flagging costs one line and turns a silent defect into a question someone can answer. A guess dressed as a decision is the thing to avoid; a guess labelled as a guess is professional.

Two rules for degraded mode:

- **Assume from the key, never from the vibe.** `error.network` licenses "the person is stuck and it is not their fault". It does not license inventing what else is on the screen.
- **Keep unresolved meaning visible.** Never delete or rename on an assumption. "Cut what the screen already says" needs rung 3 or a screenshot. Without one, keep the noun and mark the decision pending. An extra word is recoverable; a pronoun with no antecedent is a bug.
