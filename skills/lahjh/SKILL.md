---
name: lahjh
description: Write Saudi Arabic for apps and websites — localizing UI strings and product copy, naming a feature in Arabic, or reviewing Arabic that reads like a translation. Use when Arabic must feel like a message from someone who knows the person, rather than English wearing Arabic words.
---

# لهجة

## The target

A Saudi opens the app and it feels like **a message from someone who knows them**. Not a system announcing, not a coach grading, not a brochure selling. Someone who noticed they showed up.

Warmth is **a verb, not an adjective.** It is what the sentence *does* for the person, never how nicely it describes things. Exclamation marks and friendly modifiers are a cold sentence wearing a smile.

Five moves do it, and the steps below say where each belongs: **do them a favour and say so** in the first person plural, **name things after their house**, **ask instead of claiming**, **frame an absence as *not yet***, and **let them speak** in their own voice on a button.

## The reframe

**The English is a brief, not a source.** It tells you what the product is doing and what the person needs. Read the brief, then write Arabic as if the English never existed.

Translating the English *shape* produces **عرنجية**: Arabic words in English syntax. It is grammatical, it passes review, and it reads like a machine.

The industry plans for Arabic to expand 20 to 30% against English. That expansion *is* the عرنجية. Written properly, the same meaning contracts, because English UI copy is padded with politeness and scaffolding that Arabic carries inside its morphology.

---

# Pass 1 — Brief the project, once

Most context is project-level, so derive it once. Produce these six from the repo, climbing [`CONTEXT-MINING.md`](references/CONTEXT-MINING.md):

1. **Who opens it, and in what state.** Stuck, bored, proud, worried, in a hurry. This is what the register is warm or cold *toward*.
2. **The register dial.** How far toward دارج this product sits, **and the evidence for it.** A canonical action already shipped in dialect settles the dial harder than any README, because someone signed off on it. A companion app sits warmer than a bank, and Thmanyah's football app sits stiffer than their radio app, so this is per-product.
3. **Names already decided.** Product name, feature names, anything in an existing `ar` file or on the marketing site. Fixed now, even where you would have chosen differently. Settle legal document names here too: they follow this product, not the English source and not another product's house style.
4. **Do-not-translate list.** Brand names, wordmarks, third-party product names, anything the source marks untranslatable.
5. **The plural and placeholder strategy.** Decide once whether counted strings dodge the count or emit all six Arabic plural categories, and which mechanism the repo uses. Details under *Placeholders and plurals*.
6. **Length constraints as word budgets.** Read them off the code (`numberOfLines`, `width`, `maxLength`, a tab bar), then set a budget by judgment rather than arithmetic, scaled to the slot: a label holds fewer words than a heading, a heading fewer than a body. Record each as a judgment call so a reviewer can overrule it.

Write it beside the locale files, as `BRIEF.ar.md` unless the repo has a convention of its own. Done when all six are there and every name in item 3 has exactly one spelling.

---

# Pass 2 — Write, string by string

Triage, then six moves. The moves are not a pipeline: register usually settles before you finish placing, and cutting runs throughout. Treat them as a checklist that must all hold when the string is done, in the order they resolve for that string.

## Triage first

Three classes, and the class decides how much of Pass 2 runs.

- **Canonical.** The string names a recurring product action: auth, save, cancel, retry, delete, search, settings. **Test:** would this action plausibly appear on another screen? Judge it from the action itself when there is no call site to check. If yes it is canonical, whether or not the termbase has it yet. Take the brief's answer, or set one and add it to the brief so the next occurrence matches. Deliberating twice on one action produces variance, not quality.
- **Contextual.** Everything else: empty states, errors, onboarding, feature copy. The default class, and the one the moves below were written for.
- **High-stakes.** Destructive, money, permissions, legal. Climb to the call site for anything the person could lose. Legal boilerplate is the exception: it has no meaningful call site, so tighten the sentence and move on.

## 1. Place the string

Write from the screen, not from the string. Climb [`CONTEXT-MINING.md`](references/CONTEXT-MINING.md) until you can answer:

- Which screen, and which slot on it.
- What the person just did, and what happens next.
- Who is speaking: the product, the team behind it, or the person themself.
- What else the screen already says, so you can leave it out.

The key path answers the first for free, and the slot noun in its last segment (`title`، `body`، `cta`، `error`، `legal`) answers most of the register question.

Done when each of those four is either **established** or **written down as an assumption**. An unlabelled guess is the defect; a labelled one is professional. Never cut a word on an assumption.

## 2. Set the register

Register is per slot, not per app, and the same screen carries several.

| Slot | Register | Shape |
|---|---|---|
| Name: nav, tab, screen title, feature | فصحى, one or two words | bare noun |
| Hero: paywall, onboarding, launch screen | دارج or فصحى, whichever lands | a hook, and a verb is welcome |
| Promise or pitch | فصحى, nominal | no copula |
| Favour, reassurance, benefit | **دارج** | dialect verb, said *to* them and often *by* us |
| Question | **دارج** | question mark optional |
| Empty state | **دارج**, framed as *not yet* | `حتى الآن!` |
| Error | **دارج**, with a team behind it | `ما قدرنا…` |
| Button | imperative, or **the person's own voice** | `سجّل دخولك` / `خليني أشوف` |
| Destructive confirm | دارج opener, فصحى consequence | keep the noun, name what is lost |
| Legal, permission, money | فصحى, nominal, tight | `استمرارك يعني موافقتك على…` |

Mixing inside one string is correct: dialect verb, فصحى continuation.

The dialect is pan-Saudi, Najdi-leaning, non-regional: وش، زين، أبغى، الحين، اللي، راح، ما فيه، تقدر، عشان، مرّة، عاد. Anything that reveals which region the writer is from gets levelled out, and Egyptian, Shami, and non-Saudi Gulf forms stay out.

**Word choice:** take the word people say, and prefer the one with a classical root over a borrowing when both are live. `أيش` earns its place as منحوت من «أيّ شيء». When you cannot tell whether a word has that pedigree, prefer the word you have seen in print.

## 3. Answer in a verb

For any string that carries an action, answer **وش يصير الحين؟** with a verb and let the verb lead. عرنجية is what you get when you answer with a مصدر instead: native Saudi copy is verb-led or bare-nominal, translated copy is مصدر-led and copular.

Names and pitches carry no action and take no verb. Register decides which you have, which is why it comes first.

Done when the string either leads with a verb or is a nominal sentence with no copula.

## 4. Name, don't describe

For anything that names a thing, in order:

1. **An Arabic term already won?** Use it, unmarked. `مدونة`، `البث`، `تطبيق`.
2. **An arabization already won?** Use it, unmarked. `بودكاست`، `آيفون`، `بزنس`.
3. **Does a physical object or place resemble it?** Name it that. This is where identity comes from: Thmanyah's home feed is `الصالة`, the majlis. Their play queue is `الطابور`. Data migration is `نقل العفش`.
4. **Nothing fits?** Arabize by house rules: ق for /g/ (`قوقل`), drop the unpronounced madd (`متا`), and write a brand the way the brand writes itself in Arabic (`أبل`).

Only the two or three places a person *inhabits* earn a metaphor. Utility screens take plain nouns: `الإشعارات`، `التحميلات`، `مكتبتي`.

A wordmark stays in Latin when arabizing it would collide with a common noun or flatten a pun. A mark that arabizes into an ordinary Arabic word stops reading as a name, which costs more than the Latin does.

Done when the name is a noun a person could say aloud, and nothing in it explains.

## 5. Cut

- Delete `بنجاح`. English needs "successfully"; Arabic does not.
- Delete the imported please. The Arabic imperative is not rude.
- Elide the relative pronoun where speech elides it: `مجالات تهمك`.
- Prefer one word over a compound. Arabic names a thing with one word, and a multi-word name is عرنجية until proven otherwise.
- Leave out what a neighbouring string already says, **once the call site has confirmed what that is**.

For strings of five words or more, the Arabic comes in under the English, usually well under. Below five words there is no padding to remove, and a definite article or a vocative particle can legitimately make Arabic longer.

## 6. Round-trip

Translate your Arabic back to English and ask one question: **did the English structure come back?** Not the meaning. The meaning is supposed to come back, and on an error or a confirmation it must.

What a failure looks like: the مصدر chain survives, the copula survives, `من خلال` returns as "through", the clause order and comma count match the source, a relative clause sits where the English put one. That is transliterated syntax, so go back to step 3.

What a pass looks like: `حُفِظت تعديلاتك` returns "Your edits were saved" — same meaning, and the periphrastic passive and the "successfully" are gone. `ما قدرنا نجيب بياناتك` returns "We couldn't fetch your data" — same meaning, English's `لم نتمكن من` + مصدر replaced by a verb.

The gate's sharpest catch is the **one-for-one swap**: one English verb replaced by one Arabic verb with the clause untouched, which is what a hero or a title looks like when it has been translated rather than written.

---

# Pass 3 — Sweep the set

Per-string work leaves inconsistencies that only appear across a file.

- **One English term, one Arabic term.** Every occurrence of the same source word resolves the same way, unless the slot genuinely changed its meaning.
- **One Arabic term, one English term.** Two different source words that both became `إعدادات` means one of them is wrong.
- **Names match the brief.** Every name and every do-not-translate token appears with its one spelling.
- **Every counted string** either dodges the count or emits all six categories.
- **Every assumption is still flagged**, and the flags are collected somewhere a human will read them.
- **Register is consistent per slot** across screens. Two empty states in different registers is a decision, not an accident; make it deliberately or not at all.
- **The file is warm where it can be.** Read the set end to end and count the strings making one of the five moves. A whole file where none does is technically correct and cold, and cold is the failure. Errors and empty states are where that count is won.

Done when each of those seven has been checked against the whole set, not sampled.

---

## عرنجية markers

Keyword markers are the last fifth of the job: measured at 9% of sentence-length strings in shipped Spotify Arabic and 19% in Jitsi. The rest is structural, which is what passes 1 and 2 are for.

| عرنجي | Write this |
|---|---|
| `قم بتسجيل الدخول` | `سجّل دخولك` |
| `تم حفظ التغييرات` | `حُفِظت تعديلاتك` |
| `تم إرسال الطلب بنجاح` | `طلبك وصلنا` |
| `الإعدادات الخاصة بك` | `إعداداتك` |
| `الرجاء المحاولة مرة أخرى` | `جرّب مرة ثانية` |
| `لم نتمكن من تحميل البيانات` | `ما قدرنا نجيب بياناتك` |
| `هل أنت متأكد أنك تريد حذف هذا الملف؟` | `تحذف الملف؟` |
| `من خلال تجربة طلب مميزة` | `بتجربة طلب مميزة` |
| `الطريقة الأكثر سرعة` | `أسرع طريقة` |
| `أسرع بشكل كبير` | `أسرع بكثير` |
| `يجعل العثور عليه أسهل` | `يسهّل عليك تلقاه` |
| `في نفس الوقت` | `في الوقت نفسه` |

`بشكل` deserves its own note: its presence means the sentence is built wrong, so rebuild the sentence rather than swapping the word. Where English intensifies with an adverb, Arabic often has a مفعول مطلق: `يحطم الأسعار تحطيمًا`.

Keep the dual where speech keeps it (`نقرتين`، `يومين`)، and let the masculine cover the general address rather than pairing genders.

## Placeholders and plurals

Arabic has **six** CLDR plural categories, and Arabic UI localization fails here more than anywhere else.

| Category | Condition | Example |
|---|---|---|
| zero | n = 0 | 0 |
| one | n = 1 | 1 |
| two | n = 2 | 2 |
| few | n % 100 = 3..10 | 3 to 10, 103 |
| many | n % 100 = 11..99 | 11 to 26, 111 |
| other | everything else | 100, 1000 |

**Dodge the count** where you can. The digit stops governing grammar and one template covers every value. Three ways, in order of reach:

- **Apposition.** Make the digit a label rather than a quantity: `اليوم {count}`، `الحلقة {count}`. This is the only dodge that survives when the number itself is the content, so reach for it first on counters, streaks, and badges.
- **Possession or state.** Replace counting with having: `طلبك في الطريق` rather than "1 order is on the way".
- **Deletion.** Drop the number when the screen already shows it, or when it was never load-bearing.

**Emit all six** when the count must be inflected. Check the mechanism first: i18next suffixes, an ICU `plural` block, `.stringsdict`, or ARB `plural`. A single template with a bare `{count} يوم` is wrong for every count from 3 to 10.

Verify a dodge by substituting one value from each of the six rows above and reading each aloud. A dodge that only works for one range is not a dodge.

`{name}` carries its own decision: whether the vocative `يا` belongs in front of an interpolated name, and whether the name is ever a company rather than a person.

Match the placeholder **syntax** the source file already uses, even when it looks wrong for the library. A locale that interpolates differently from its siblings is a bug that outlives you.

## Mechanics

Western digits. Mirrored `؟`. Arabic comma `،`, no space before and one after. Currency by name (`ريال`), except where a platform injects the code. Embedded Latin goes after the Arabic: `الجداول البيانية لبرنامج Excel`. Titles in `«»`, and a wordmark kept in Latin stays bare.

## Reference

- [`CONTEXT-MINING.md`](references/CONTEXT-MINING.md) — where context lives, ranked by cost to read, and how to work when there is only a locale file. Read during Pass 1, and again for any high-stakes string.
- [`EXAMPLES.md`](references/EXAMPLES.md) — shipped strings by slot, each annotated with the move behind it, plus naming and register-switching at length. Read before writing a slot you have not written yet.
- [`ARINJIYAH.md`](references/ARINJIYAH.md) — three diagnostics for a string that is grammatical, passes every check, and still smells translated. Its catalogue below them covers prose-length copy: reach for that half when writing marketing or onboarding paragraphs, not UI labels.
