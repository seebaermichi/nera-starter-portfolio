# Issue conventions

Review rules for work on `@nera-static/starter-portfolio`, run through Snagio from
`nera-starter-portfolio/`. The Snagio project **"Nera AI"** tracks
`../nera-cli/ROADMAP-ai.md` (starters are its **L5**, slice 5); its issues carry the
target repo as a title prefix. **Work an issue only from the repo it names** — the
step skills commit in the current repo.

The workspace `../CLAUDE.md` holds the fleet-wide rules (semver, CHANGELOG,
releases, publishing a brand-new package); this file only adds what a reviewer
checks per diff. Copied from `nera-starter-business` (the first starter on
`@nera-static/theme-business`) and adapted to an image-led portfolio.

## Non-negotiables

- **Two specs, no own ROADMAP.** `../nera-cli/ROADMAP-ai.md` (L5 and "Slice 5 —
  progress") is the spec for the starter; `../generator/ROADMAP-themes.md`
  "Starter-ready themes" §S3 (`@nera-static/theme-business`, which carries the
  business **and** the portfolio starter) and §S6 (what a starter must do so its
  theme passes) are the spec for how it uses the theme. Decisions go
  back into those sections. Extend them, never fork them.
- **The starter contract is what `nera new --starter` reads** (`nera-cli/src/starter.js`,
  `@nera-static/nera` ≥ 1.11.0): `package.json` with a `nera.starter`
  `{ label, description }` field and `keywords: ["nera-starter"]`; only `pages/`,
  `config/`, `theme/`, `assets/`, `plugins/` and `.neraignore` are copied into the
  site (starter wins); `dependencies` are merged into the site's (the site's own
  `@nera-static/nera` entry is kept); the README is printed after scaffolding, not
  copied. Anything else in the package never reaches a site — do not rely on it.
- **The portfolio starter uses `@nera-static/theme-business`** (`theme: business`
  in `config/app.yaml`) and is image-led, built on **plugin-images** (the L5 line:
  `portfolio` (images)). Its projects use the theme's views for them (§S3,
  `generator/ROADMAP-themes.md` table of starters): a projects index on
  `pages/list.pug` (a card grid of its child pages) and one page per project on
  `pages/gallery.pug` (every `figure.nera-image` in the body laid out as a grid),
  plus the home page with a hero, an about page, a contact page and the legal
  footer. Further plugins (navigation, contact-form, sitemap) only as the
  decisions recorded in L5 / §S3 say. It follows §S6 to the letter: keeps a
  `theme/views/` folder with the vendor copies and seam overrides, ships **no**
  `nera:scaffold-default` files (they would shadow the theme's views), and fills
  the §S3.2 seams it uses (`hero-media`, `card-media`, `contact-form`) plus the
  shared ones (§S2.4). `app.business` (opening hours) only if a page shows it.
- **It is not the business starter with photos.** No services or opening-hours
  page unless the spec asks for it; what differs from `nera-starter-business` is
  the point of having two starters.
- **Prerequisites ship first.** `@nera-static/theme-business` (1.0.2 on npm
  since 2026-10-17) and `@nera-static/plugin-images` are on npm; anything else
  this starter needs must be too before it is built — a dependency that is not on npm is a
  blocker, not something to stub.
- **Semver + `CHANGELOG.md` in the same commit as the change** (Keep a Changelog,
  four-space bullets, `**BREAKING**:` prefix). Bump with
  `npm version <bump> --no-git-tag-version`. A starter has no update path (the site
  owns the files after `nera new`), so "breaking" means: a site scaffolded from the
  new version differs in a way a user following the old README would trip over.
- **Never publish or push.** No `npm publish`, no `git push`, no tags pushed, no repo
  created on GitHub, no posts anywhere public. The maintainer does the one-time
  bootstrap publish of 1.0.0 by hand, then a CI-published x.y.1 within ~2 days so the
  Trusted Publisher does not expire; the session hands over the exact commands.
- Paste-ready text for the maintainer goes in a fenced code block between
  `----- START: … -----` and `----- END -----` lines, never in a blockquote.

## Framework correctness

- A scaffolded site builds, validates and checks clean: `nera build`,
  `nera validate` and `nera check` report no problems on the starter's sample pages.
- Every dated sample page sets `date` (CI stamps every file with the same birth
  time), page bodies start at `##`, every image has an `alt` (plugin-images keeps
  it; an empty `alt` only for a purely decorative image), translations of one page
  share a `slug`, and every theme `t()` key (§S2.6, §S3.3) — plus the opening-hours `days` /
  `hours_note` if a page shows them — is translated under `translations.<lang>`.
- `footer_links` in `config/theme.yaml` point at the imprint and privacy pages with
  labels the legal rules recognise; legal placeholders cite § 5 DDG and the TDDDG.
- Every sample page has a `layout`; `config/app.yaml` keeps the keys `--name`/`--lang`
  edit line by line (`name`, `lang`) and a `translations:` entry for its language.
- No `postinstall` or other lifecycle scripts (the CLI packs with
  `--ignore-scripts`, and a starter must not need them).
- `files` in `package.json` is limited to what a site receives plus `CHANGELOG.md`
  (`README.md`, `LICENSE` and `package.json` ship anyway).

## UI / template rules

- Sample content and docs in English. Enough sample pages to show every page type
  (home with hero, the projects list, at least two project gallery pages, about,
  contact, imprint, privacy), invented details marked as placeholders, and
  nothing a user would only delete.
- Sample images are small, licence-clean (own work or a public-domain/CC0 source,
  recorded in the README) and few: they ship in every scaffolded site and the
  npm tarball. plugin-images generates the sizes and formats; never commit
  pre-resized variants, and keep `.nera-cache/` out of the package.

## UI walkthrough

The starter has no interactive UI of its own; a browser test is normally skipped.
When one is wanted:

- Browser tooling: Playwright MCP (`mcp__playwright__browser_navigate`,
  `mcp__playwright__browser_snapshot`, `mcp__playwright__browser_console_messages`).
- Boot (a throwaway site from the *local* starter, never from npm):
  `R=$PWD; T=$(mktemp -d) && cd "$T" && npx @nera-static/nera new site --starter "$R" --yes && cd site && npx nera build && npx nera serve --port 3124`
  (Node 22 if npm crashes: `PATH=~/.nvm/versions/node/v22.22.0/bin:$PATH`). Delete
  `$T` afterwards.
- Base URL / login: http://localhost:3124/, no login.
- Surfaces:
    | surface | url | role | how to open |
    |---|---|---|---|
    | home (hero) | `/` | visitor | open the URL |
    | projects list | the projects index's href | visitor | header navigation |
    | project gallery | a project page's href | visitor | a card on the projects list |
    | contact | the contact page's href | visitor | header navigation |
    | imprint / privacy | the `footer_links` | visitor | footer links |

## Tests & hygiene

- `npx vitest run && npm run lint` must pass (`npm test` is watch mode — never use
  it here). Run from the package root.
- An integration test scaffolds a site from this folder with the published CLI
  (`nera new <tmp> --starter <this repo> --yes`), then builds, validates and checks it
  in a temp directory. Unit tests check the `package.json` contract.
- Generate the lockfile with npm ≥ 10.9 (Node 22); commit it before any workflow that
  runs `npm ci`.
- The repo matches the fleet: `.github/workflows/test.yml` and `publish.yml` copied
  from a recent package (`../nera-plugin-sitemap`), `.github/dependabot.yml`,
  `LICENSE`, `README.md` with the two badges linking https://nera.js.org.

## Reconciliation steps (run when resolving an issue)

- Version bump + `CHANGELOG.md` entry in the change's commit, if it ships in the
  tarball; none for tests, CI or `.claude/`.
- Update the L5 status and "Slice 5 — progress" in `../nera-cli/ROADMAP-ai.md`. On
  the first release, the slice-5 leftovers there become due: `--starter` in the
  template's `AGENTS.md` and the skill, the CLI docs page on nera.js.org. Those are
  commits in other repos — hand them over or file them as issues.
- Hand over the release commands (GitHub repo creation, `git push`, bootstrap
  `npm publish`, `git tag -a v<x.y.z> …`) — do not run them. After the GitHub remote
  exists: `../generator/scripts/fleet-check.sh --fix nera-starter-portfolio`.
- Remove the issue's plan files last, once nothing else needs them:
  `git rm` its tracked files under `plans/` (`plans/issues/<id>-*`,
  `plans/issues/browser-tests/<id>-*`, `plans/cloud/<id>-*`), delete the
  untracked ones, and commit
  `chore(plan): remove the plan files of the resolved <short title> issue`.
  Git history keeps them; `plans/` holds only open issues.

## Step order

<!-- The dependency ladder /plan-issue orders steps by: one rung per line, in
     dependency order, each with what it holds in THIS codebase and the Verify
     that proves a step on it is done. Leave "…" to use the skill's default
     (Data → Contract → Behaviour → UI → Docs). Examples to replace:

     Laravel:
     1. Data — migration, enum, model cast / relation, seeder — migrates up and down
     2. Contract — route + middleware, policy, Form Request, feature flag — feature
        test: valid input accepted, invalid refused
     3. Behaviour — actions, services, jobs, events, queries — `php artisan test --filter=…`
     4. UI — Livewire / Blade / Vue pages and components, labels — tests + walkthrough
     5. Docs — handbook, README

     Node / TypeScript:
     0. Toolchain — dependencies, tsconfig, build config — build and `tsc --noEmit` pass
     1. Data — Prisma / Drizzle migration, schema — applies and rolls back
     2. Contract — handler registration, guard, zod schema — `vitest run -t …`
     3. Behaviour — services, repositories, jobs — `vitest run -t …`
     4. Client — API functions, hooks, stores — `tsc --noEmit`
     5. UI — components, i18n strings — `tsc` + walkthrough
     6. Docs — README, ADRs -->

- …

## Static analysis

<!-- Read by /implement-step, /review-step and /work-issue: the command runs over the
     WHOLE project before review, in review and before resolving; red blocks all three. -->

- Command: `npm run lint` (ESLint over the whole package; plain JavaScript, no type checker)
- Green: exit code 0, no output
- Suppressions: fix every finding at its cause — no `eslint-disable` comments, no rule switched off to get green.
