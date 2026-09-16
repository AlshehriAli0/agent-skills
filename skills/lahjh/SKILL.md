---
name: lahjh
description: Write or review Saudi Arabic across product UI, push notifications, SMS, email, and server errors. Use when Arabic feels translated, semantically wrong, inconsistent, or uncertain in register, naming, or plural behavior.
---

# لهجة

## Outcome

Produce Arabic that sounds natural for the product and the person using it, while preserving the product's meaning and minimizing review burden. Saudi register is evidence-led: choose spoken, neutral, or formal language from the project's context and reviewed examples, not from a fixed vocabulary list.

Every run leaves a source-controlled project brief and feedback ledger. Only explicit human approval freezes wording. Existing translations, marketing copy, and agent suggestions are evidence until a person approves them.

## Run order

### 1. Scope the language work

Inventory the requested keys, their call sites, sibling strings, routes, and every reached localization surface: frontend UI, push notifications, SMS, email, and server errors. Check whether the reported problem is language, product semantics, data, layout, or interaction. Record non-language defects and keep copy unchanged when language is not the cause.

Done when the requested scope, reached surfaces, and any non-language blockers are written down.

### 2. Create or update the project brief and feedback ledger

Find the project's Arabic brief, normally `BRIEF.ar.md` beside the locale files. Create it when absent and update it on every run. Read it before reusing a term. Keep these sections together:

- audience and user state;
- register evidence, with source and date;
- approved names and do-not-translate terms;
- product facts that must remain invariant;
- slot constraints and the actual placeholder/translation mechanism;
- a feedback ledger with this table shape:

| status | source phrase or term | preferred wording | product/scope | reason | approval source | date |
|---|---|---|---|---|---|---|
| approved / rejected / pending / conflict | … | … | … | … | … | YYYY-MM-DD |

Use `approved` only for explicit human approval. Record rejected wording and its preferred replacement when supplied. Mark low-confidence safe wording `pending`. If people disagree, record both positions as `conflict`, preserve both in the ledger, and ask the product owner before choosing. When a term is rejected, search the entire requested scope and update every occurrence governed by that decision. Keep rejected terms as project-scoped feedback, not global bans.

Done when the brief exists, every reused decision has a ledger status and source, and no conflict is silently resolved.

### 3. Establish meaning and mechanics

Treat the English as a brief, not a syntax source. For each string, establish the screen, slot, speaker, user action, adjacent copy, future product meaning, length constraint, facts, and placeholders. Use [`CONTEXT-MINING.md`](references/CONTEXT-MINING.md) when the key or call site does not answer these.

Classify the string as canonical, contextual, high-stakes, or creative. Canonical terms come from an approved ledger entry; add a pending decision rather than settling the same action twice. For feature names, placeholders, hero lines, and culturally expressive or dialect-sensitive copy, establish what the feature means now and later before proposing language. Show candidates to the human and wait for selection before changing code.

Done when every changed or proposed string has an established meaning, speaker, slot, constraint, fact set, and placeholder contract, with creative candidates separated from approved wording.

### 4. Write the smallest natural sentence

Use the safest natural register supported by the brief. Dialect is appropriate when the product speaks directly to the person; neutral or formal Arabic is appropriate when the slot, legal meaning, or product evidence calls for it. Label a choice as evidence, inference, or candidate; existing translations and a word's root or print frequency do not establish dialect confidence. If confidence is low, write the clearest natural option, mark it `pending`, and ask when the uncertainty affects meaning, naming, or the user's likely acceptance. Ask one focused decision at a time when the choice is subjective.

Write from meaning rather than English structure:

- lead with a verb for actions; use a bare noun for a label or name;
- keep sentences concise and remove imported politeness, passive scaffolding, duplicated context, and English clause order;
- use a question when the screen needs a question, and a direct user voice when that is natural for the button;
- make warmth earn its place through relevance, reassurance, or a useful invitation;
- use cultural imagery, personification, praise, or poetic phrasing only when the product context supports it and the human has approved the candidate;
- name a feature plainly when metaphor would add a claim, age badly, or obscure its job;
- preserve names, cities, dates, numbers, entities, actors, states, legal meaning, and other product facts exactly.

Use [`EXAMPLES.md`](references/EXAMPLES.md) for slot patterns and [`ARINJIYAH.md`](references/ARINJIYAH.md) when a grammatical string still feels translated. Those references provide diagnostics and candidates, not approval or a global word list. When presenting a subjective choice, give at least three genuinely distinct candidates with a short context-based rationale; give a larger set only when breadth is requested. Never replace wording a user selected with an agent-preferred alternative; record a concern separately.

Done when each proposed string is concise, semantically faithful, context-appropriate, and either approved for code or clearly marked pending in the ledger.

### 5. Validate plurals and interpolation at runtime

Inspect the real translation resolver and interpolation helper before editing a counted string. Determine whether the helper passes the plural count through to the library, whether the parameter name triggers plural selection, and whether locale fallback can expose a raw key. A locale-only edit is incomplete when the runtime bypasses plural resolution.

Use a count-free construction when it preserves meaning. Otherwise implement the categories supported by the actual mechanism and test the actual runtime path with `0`, `1`, `2`, `3`, `11`, and `100` where relevant. Check names, dates, numbers, markup, and all placeholder syntax against sibling locales. Do not hide a missing plural behind a fixed noun or abbreviation unless that wording is semantically correct at every tested value.

Done when each relevant value renders the intended Arabic through the production resolver, or the ledger records why a count-free form is correct.

### 6. Sweep the complete set

Search the entire requested scope, including backend templates and sibling surfaces, for every changed source term, Arabic term, key, placeholder, and fact. When backend surfaces are reached, use the same project ledger and approved frontend vocabulary; keep one decision across UI, notifications, SMS, email, and server errors unless the call site proves a meaning change. Compare facts across language sources. Recheck names, future semantics, numbers, dates, actors, states, punctuation, and assumptions. Keep pending items visible for review.

Round-trip the Arabic for meaning, not English structure. A pass keeps the meaning while allowing Arabic to change the clause order, verb form, and length. A failure retains مصدر chains, copular scaffolding, literal idioms, or a one-for-one word swap from English.

Done when every requested surface has been searched, every decision is reflected consistently, every runtime-sensitive string has been exercised, and the final ledger contains all pending and approved changes.

## Slot guidance

Use this as a decision aid, not a rigid register table:

| slot | starting point | check |
|---|---|---|
| label, tab, title, feature name | short noun, plain or product-specific | does it name the actual thing and survive future use? |
| hero or onboarding line | concise hook | is the image or voice earned by the screen? |
| promise or explanation | clear statement | did Arabic carry the meaning without English padding? |
| favour, reassurance, empty state, error | direct user-facing language | does it help without forced warmth or blame? |
| button | imperative or the person's voice | does it describe the actual action? |
| destructive, permission, legal, money | tight language with explicit consequence | can the person tell what changes or is lost? |

Mix registers inside a string when meaning requires it. Saudi wording may be Najdi-leaning and broadly understood, but the brief must carry the evidence for the choice. A natural phrase can be valid even when it is not formal, classical, or present in existing shipped copy.

## Mechanics

Keep placeholder syntax byte-identical unless the runtime change explicitly requires a coordinated migration. Preserve intentional line breaks and markup. Use the project's established digit, date, currency, punctuation, and brand conventions after checking their source of truth. If those conventions are inconsistent, record the conflict instead of silently normalizing it.

## Reference

- [`CONTEXT-MINING.md`](references/CONTEXT-MINING.md) — context sources, project evidence, surface inventory, and degraded mode. Read during scope and meaning checks.
- [`EXAMPLES.md`](references/EXAMPLES.md) — illustrative slot patterns and candidate shapes. Read when writing an unfamiliar slot or presenting creative options.
- [`ARINJIYAH.md`](references/ARINJIYAH.md) — structural diagnostics for Arabic that remains translated after the meaning and context checks.
