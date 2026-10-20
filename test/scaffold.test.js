import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'yaml'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cli = path.join(root, 'node_modules', '@nera-static', 'nera', 'bin', 'nera.js')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'))

const TIMEOUT = 180_000

// What `nera new --starter` copies into a site (nera-cli/src/starter.js).
const STARTER_ENTRIES = ['pages', 'config', 'theme', 'assets', 'plugins', '.neraignore']

// The three sample projects, in their `order` (plan D3).
const PROJECTS = ['tides', 'blocks', 'orbits']

// The page set of plan D3, as built.
const PAGES = [
    'index.html', 'about.html', 'contact.html', 'imprint.html', 'privacy.html',
    'projects/index.html', ...PROJECTS.map((project) => `projects/${project}.html`),
]

// The legal placeholders are `robots: noindex`, so the sitemap leaves them out.
const NOINDEX = ['imprint.html', 'privacy.html']

// The theme fixture's config/validate.yaml (nera-theme-business test/site):
// every rule of `nera check` on, the opt-in ones included, promoted to error
// so a finding fails the check; its legal paths reduced to the English pages.
const STRICT_VALIDATE = `rules:
${[
        'a11y-html-lang', 'a11y-title', 'a11y-h1', 'a11y-heading-skip', 'a11y-img-alt',
        'a11y-form-label', 'a11y-link-name', 'a11y-main', 'a11y-skip-link', 'a11y-nav-name',
        'a11y-duplicate-id', 'a11y-viewport-zoom', 'a11y-link-lang', 'a11y-target-blank',
        'a11y-reduced-motion', 'privacy-third-party', 'privacy-insecure', 'privacy-storage',
        'legal-imprint-link', 'legal-privacy-link', 'legal-outdated-law',
    ].map((rule) => `    ${rule}: error`).join('\n')}
legal:
    imprint:
        en: /imprint.html
    privacy:
        en: /privacy.html
`

let tmp

beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nera-starter-portfolio-'))
})

afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
})

const nera = (args, cwd) =>
    execFileSync(process.execPath, [cli, ...args], {
        cwd,
        encoding: 'utf-8',
        stdio: 'pipe',
    })

// Scaffold `name` from this repo with the devDependency CLI, offline: a
// local starter path is read in place and --no-install skips npm. The site
// then resolves the CLI, the theme and the plugins from this repo's
// node_modules (they are this package's dependencies). Returns the site's
// path and what `nera new` printed.
function scaffold(name, extra = []) {
    const out = nera(['new', name, '--starter', root, '--yes', '--no-install', ...extra], tmp)
    const site = path.join(tmp, name)
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(site, 'node_modules'), 'dir')
    return { site, out }
}

const read = (dir, file) => fs.readFileSync(path.join(dir, file), 'utf-8')

// The `sizes` a seam override passes to plugin-images' picture mixin.
const seamSizes = (seam) => read(root, `theme/views/partials/${seam}.pug`).match(/^ {4}sizes: '([^']+)',$/m)[1]

// Every `sizes` attribute in `html`, on <source> and <img> alike.
const sizesOf = (html) => [...html.matchAll(/\ssizes="([^"]*)"/g)].map(([, sizes]) => sizes)

// Every file below `dir`, as paths relative to it.
function walk(dir, base = dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        return entry.isDirectory() ? walk(full, base) : [path.relative(base, full)]
    })
}

// A built page's <main>, so the header and the footer every page shares stay out.
function main(site, file) {
    const match = read(site, `public/${file}`).match(/<main\b[\s\S]*?<\/main>/)
    expect(match, file).not.toBeNull()
    return match[0]
}

// Build, check and validate: no finding, and no warning from core or a
// plugin anywhere in the build's text output.
function expectCleanBuild(site) {
    const out = nera(['build', '--check'], site)
    expect(out).toContain('No problems found')
    expect(out).not.toMatch(/\d+ error\(s\), \d+ warning\(s\)/)
    expect(out).not.toMatch(/warn|⚠/i)

    const json = JSON.parse(nera(['build', '--check', '--json'], site))
    expect(json).toEqual({ ok: true, results: [] })

    expect(nera(['validate'], site)).toContain('No problems found')
    expect(JSON.parse(nera(['validate', '--json'], site))).toEqual({ ok: true, results: [] })
}

describe('the sample pages', () => {
    const pagesDir = path.join(root, 'pages')
    const files = walk(pagesDir)
    const front = (file) => parse(read(pagesDir, file).split(/^---$/m)[1])
    const body = (file) => read(pagesDir, file).split(/^---$/m).slice(2).join('---')

    it('are the page set of plan D3, each with a layout and without lang or slug (plan D5)', () => {
        expect(files.sort()).toEqual(PAGES.map((p) => p.replace(/\.html$/, '.md')).sort())
        for (const file of files) {
            expect(front(file).layout, file).toMatch(/^pages\/\w+\.pug$/)
            expect(front(file), file).not.toHaveProperty('lang')
            expect(front(file), file).not.toHaveProperty('slug')
        }
    })

    it('put the projects on the theme\'s list and gallery views, numbered by order', () => {
        expect(front('projects/index.md').layout).toBe('pages/list.pug')
        PROJECTS.forEach((project, i) => {
            const meta = front(`projects/${project}.md`)
            expect(meta.layout, project).toBe('pages/gallery.pug')
            expect(meta.order, project).toBe(i + 1)
            expect(meta.description, project).toEqual(expect.any(String))
        })
    })

    it('never name the person, so `nera new --name` renames the whole site (plan D1)', () => {
        for (const file of files) {
            expect(read(pagesDir, file), file).not.toMatch(/Linea/)
        }
    })

    it('start their bodies at ##', () => {
        for (const file of files) {
            expect(body(file), file).not.toMatch(/^# /m)
        }
    })

    it('give every image an alt text, and every gallery image a caption', () => {
        for (const file of files) {
            const meta = front(file)
            if (meta.image) {
                expect(meta.image_alt, file).toMatch(/\S/)
                expect(fs.existsSync(path.join(root, 'theme/assets', meta.image)), file).toBe(true)
            }
            for (const [, alt, src, caption] of body(file).matchAll(/!\[([^\]]*)\]\((\S+)(?: "([^"]*)")?\)/g)) {
                expect(alt, `${file} → ${src}`).toMatch(/\S/)
                expect(fs.existsSync(path.join(root, 'theme/assets', src)), `${file} → ${src}`).toBe(true)
                if (meta.layout === 'pages/gallery.pug') expect(caption, `${file} → ${src}`).toMatch(/\S/)
            }
        }
        for (const project of PROJECTS) {
            expect(body(`projects/${project}.md`).match(/^!\[/gm), project).toHaveLength(3)
        }
    })
})

describe('nera new --starter <this repo>', () => {
    let site
    let out

    beforeAll(() => {
        ({ site, out } = scaffold('site'))
    }, TIMEOUT)

    it('scaffolds a site that builds, checks and validates clean', () => {
        expectCleanBuild(site)
    }, TIMEOUT)

    it('prints the README\'s whole First steps section, naming every placeholder', () => {
        const readme = read(root, 'README.md')
        // The last section: the CLI prints it from its heading to the end.
        const steps = readme.slice(readme.indexOf('\n## First steps\n') + 1).trim()
        expect(steps).toMatch(/^## First steps\n/)
        expect(steps).not.toMatch(/\n#{1,2} /)
        expect(out).toContain(steps)
        for (const placeholder of [
            'origin: https://example.com', '`business:` in `config/app.yaml`',
            'recipient: hello@example.com', 'config/social-media-links.yaml',
            'pages/imprint.md', 'pages/privacy.md', 'pages/projects/',
            'theme/assets/images/', 'theme/assets/favicon.ico',
        ]) {
            expect(steps, placeholder).toContain(placeholder)
        }
        // No fence: the CLI prints the section raw.
        expect(steps).not.toContain('```')
    })

    it('stays clean with every check rule on and promoted to error', () => {
        const { site: strict } = scaffold('site-strict')
        fs.writeFileSync(path.join(strict, 'config', 'validate.yaml'), STRICT_VALIDATE)
        expectCleanBuild(strict)
    }, TIMEOUT)

    it('renders every page and the sitemap', () => {
        const pub = path.join(site, 'public')
        for (const file of [...PAGES, 'sitemap.xml', 'robots.txt']) {
            expect(fs.existsSync(path.join(pub, file)), file).toBe(true)
        }
        const sitemap = read(site, 'public/sitemap.xml')
        for (const page of PAGES) {
            const loc = `<loc>https://example.com/${page}</loc>`
            if (NOINDEX.includes(page)) expect(sitemap, page).not.toContain(loc)
            else expect(sitemap, page).toContain(loc)
        }
        expect(sitemap.match(/<loc>/g)).toHaveLength(PAGES.length - NOINDEX.length)
        expect(read(site, 'public/robots.txt')).toContain('Sitemap: https://example.com/sitemap.xml')
    })

    it('serves the placeholder favicon, so the browser\'s /favicon.ico request finds a file', () => {
        const built = fs.readFileSync(path.join(site, 'public', 'favicon.ico'))
        expect(built.equals(fs.readFileSync(path.join(root, 'theme', 'assets', 'favicon.ico')))).toBe(true)
        // An ICO header: reserved 0, type 1 (icon), at least one image.
        expect(built.readUInt16LE(0)).toBe(0)
        expect(built.readUInt16LE(2)).toBe(1)
        expect(built.readUInt16LE(4)).toBeGreaterThan(0)
    })

    it('fills the seams: navigation, an eager hero picture, social links and the city', () => {
        const home = read(site, 'public/index.html')
        expect(home).toContain('<ul class="nav nav--list">')
        expect(home).toContain('<nav class="social-media-links" aria-label="Social media">')
        expect(home).not.toContain('target="_blank"')
        expect(home).toContain('<span class="address__line">Berlin</span>')

        const hero = home.match(/<div class="hero__media">[\s\S]*?<\/picture>/)
        expect(hero).not.toBeNull()
        expect(hero[0]).toContain('<picture>')
        expect(hero[0]).toMatch(/<img class="hero__image" src="\/_img\/hero-[0-9a-f]{8}-\d+\.jpg"/)
        expect(hero[0]).toContain('alt="A rust-red disc inside a thin ochre ring beside a teal block, above sand-coloured waves"')
        expect(hero[0]).toContain('loading="eager"')
        expect(sizesOf(hero[0])).toEqual(Array(3).fill(seamSizes('hero-media')))
        // The hero is the home's only image, so nothing on it loads lazily.
        expect(home.match(/<img\b/g)).toHaveLength(1)

        expect(home).toContain('<a class="button" href="/projects/index.html">See the projects</a>')
        expect(home.match(/<li class="card">/g)).toHaveLength(PROJECTS.length)
        // No opening hours and no phone: app.business holds a city and a country.
        expect(home).not.toContain('opening-hours')
        expect(home).not.toContain('href="tel:')
    })

    it('lists exactly the three projects in their order, each as a card with a lazy picture', () => {
        const list = main(site, 'projects/index.html')
        const cards = [...list.matchAll(/<li class="card">([\s\S]*?)<\/li>/g)].map(([, card]) => card)
        expect(cards.map((card) => card.match(/<a class="card__link" href="([^"]+)">/)[1]))
            .toEqual(PROJECTS.map((project) => `/projects/${project}.html`))
        for (const [i, card] of cards.entries()) {
            expect(card, PROJECTS[i]).toMatch(/<div class="card__media">\s*<picture>/)
            expect(card, PROJECTS[i]).toMatch(new RegExp(`<img class="card__image" src="/_img/${PROJECTS[i]}-1-[0-9a-f]{8}-\\d+\\.jpg"`))
            expect(card, PROJECTS[i]).toMatch(/ alt="\S[^"]*"/)
            expect(card, PROJECTS[i]).toContain('loading="lazy"')
            // One per <source> and the <img>, all the seam's grid value.
            expect(sizesOf(card), PROJECTS[i]).toEqual(Array(3).fill(seamSizes('card-media')))
            expect(card, PROJECTS[i]).toMatch(/<p class="card__text">\S/)
        }
    })

    it('lays every project\'s captioned images out in the gallery, lazily loaded', () => {
        for (const project of PROJECTS) {
            const page = main(site, `projects/${project}.html`)
            const gallery = page.match(/<div class="page__body gallery">([\s\S]*)<\/div>/)
            expect(gallery, project).not.toBeNull()
            const figures = gallery[1].match(/<figure class="nera-image">[\s\S]*?<\/figure>/g)
            expect(figures, project).toHaveLength(3)
            for (const figure of figures) {
                expect(figure, project).toContain('<picture>')
                expect(figure, project).toMatch(/ alt="\S[^"]*"/)
                expect(figure, project).toContain('loading="lazy"')
                expect(sizesOf(figure), project).toEqual(Array(3).fill(parse(read(root, 'config/images.yaml')).sizes))
                expect(figure, project).toMatch(/<figcaption class="nera-image__caption">\S[^<]*<\/figcaption>/)
            }
            expect(page, project).not.toContain('loading="eager"')
        }
    })

    it('renders the contact form with its recipient hidden, its script loaded and the city beside it', () => {
        const contact = main(site, 'contact.html')
        expect(contact).toContain('<form class="contact-form" novalidate data-contact-form>')
        for (const label of ['Your name', 'Your email', 'Message', 'I have read the privacy notice', 'Send message']) {
            expect(contact).toContain(label)
        }
        expect(contact).toContain('<a href="/privacy.html">privacy notice</a>')
        expect(contact).not.toContain('hello@example.com')
        expect(contact).toContain('<script src="/js/contact-form.js"></script>')
        expect(contact).toMatch(/<aside class="contact__aside">[\s\S]*<span class="address__line">Berlin<\/span>/)
    })

    it('makes no third-party request and ships only the contact-form script', () => {
        const pub = path.join(site, 'public')
        const html = walk(pub).filter((f) => f.endsWith('.html'))
        expect(html.sort()).toEqual([...PAGES].sort())
        for (const file of html) {
            const page = read(pub, file)
            const scripts = [...page.matchAll(/<script\b[^>]*>/gi)].map(([tag]) => tag)
            const expected = file === 'contact.html'
                ? ['<script type="application/json" data-contact-config>', '<script src="/js/contact-form.js">']
                : []
            expect(scripts, file).toEqual(expected)
            expect(page, file).not.toMatch(/<(?:link|img|source|iframe|video|audio)\b[^>]*\s(?:href|src|srcset)="(?:https?:)?\/\//i)
        }
        expect(walk(pub).filter((f) => f.endsWith('.js'))).toEqual(['js/contact-form.js'])
        for (const file of walk(pub).filter((f) => f.endsWith('.css'))) {
            expect(read(pub, file), file).not.toMatch(/url\(\s*['"]?(?:https?:)?\/\/|@import/i)
        }
    })

    it('links only to pages and files that exist', () => {
        const pub = path.join(site, 'public')
        for (const file of walk(pub).filter((f) => f.endsWith('.html'))) {
            for (const [, url] of read(pub, file).matchAll(/\s(?:href|src)="(\/[^"#?]*)/g)) {
                expect(fs.existsSync(path.join(pub, url)), `${file} → ${url}`).toBe(true)
            }
            for (const [, set] of read(pub, file).matchAll(/\ssrcset="([^"]*)"/g)) {
                for (const url of set.split(',').map((s) => s.trim().split(/\s+/)[0])) {
                    expect(fs.existsSync(path.join(pub, url)), `${file} → ${url}`).toBe(true)
                }
            }
        }
    })

    it('copies only the starter folders into the site, byte for byte', () => {
        for (const file of [
            'README.md', 'CHANGELOG.md', 'LICENSE', 'eslint.config.js', 'scripts',
            'package-lock.json', 'test', '.github', '.husky', 'plans',
        ]) {
            expect(fs.existsSync(path.join(site, file)), file).toBe(false)
        }
        const entries = STARTER_ENTRIES.filter((e) => fs.existsSync(path.join(root, e)))
        const files = entries.flatMap((e) => walk(path.join(root, e)).map((f) => path.join(e, f)))
        expect(files.length).toBeGreaterThan(40)
        for (const file of files) {
            expect(fs.readFileSync(path.join(site, file)).equals(fs.readFileSync(path.join(root, file))), file)
                .toBe(true)
        }
    })

    it('leaves out the scaffold\'s nera:scaffold-default views', () => {
        for (const file of ['theme/views/layouts/layout.pug', 'theme/views/pages/default.pug']) {
            expect(fs.existsSync(path.join(site, file)), file).toBe(false)
        }
    })

    it('keeps the site\'s own CLI entry and adds the theme and the plugins', () => {
        const sitePkg = JSON.parse(read(site, 'package.json'))
        expect(sitePkg.name).toBe('site')
        expect(sitePkg.dependencies).toHaveProperty('@nera-static/nera')
        expect(sitePkg.dependencies).toEqual({
            '@nera-static/nera': sitePkg.dependencies['@nera-static/nera'],
            ...pkg.dependencies,
        })
    })
})

describe('nera new --starter <this repo> --name "Studio Kreis & Co" --lang de', () => {
    let site

    beforeAll(() => {
        ({ site } = scaffold('site-de', ['--name', 'Studio Kreis & Co', '--lang', 'de']))
    }, TIMEOUT)

    it('sets name and lang and copies the English texts into a de entry', () => {
        const app = read(site, 'config/app.yaml')
        // Quoted: written by --name, not the starter's own unquoted line.
        expect(app).toMatch(/^name: "Studio Kreis & Co"$/m)
        expect(app).toMatch(/^lang: de$/m)
        expect(app).toMatch(/^theme: business$/m)
        expect(parse(app).translations.de).toEqual(parse(app).translations.en)
    })

    it('still builds, checks and validates clean', () => {
        expectCleanBuild(site)
        const html = read(site, 'public/index.html')
        expect(html).toContain('<html lang="de">')
        expect(html).toContain('&amp; Co</title>')
        // `en` stays beside the copied `de`, but no English page exists: no
        // one-item switch.
        expect(html).not.toContain('lang-switch')
    }, TIMEOUT)

    it('renders German with the README\'s German texts alone, which cover every English key', () => {
        const readme = read(root, 'README.md')
        const de = readme.match(/```yaml\n( {4}de:\n[\s\S]*?)```/)[1]
        const app = read(site, 'config/app.yaml')
        // As the README says: replace the copied `de:` entry, keep `en:`.
        fs.writeFileSync(path.join(site, 'config', 'app.yaml'), `${app.split(/^ {4}de:$/m)[0]}${de}`)
        const { translations } = parse(read(site, 'config/app.yaml'))
        expect(Object.keys(translations.de)).toEqual(Object.keys(translations.en))
        for (const [key, text] of Object.entries(translations.de)) {
            // Translated, except where German and English agree.
            if (!['Navigation'].includes(key)) expect(text, key).not.toBe(translations.en[key])
        }

        expectCleanBuild(site)
        const home = read(site, 'public/index.html')
        expect(home).not.toContain('lang-switch')
        expect(home).toContain('Zum Inhalt springen')
        expect(home).toContain('aria-label="Hauptnavigation"')
        expect(home).toContain('>Impressum</a>')
        expect(home).toContain('>Datenschutz</a>')

        const contact = read(site, 'public/contact.html')
        for (const label of [
            'Ihr Name', 'Ihre E-Mail-Adresse', 'Ich habe die Datenschutzerklärung gelesen',
            'Nachricht senden', 'Erzählen Sie mir von Ihrem Projekt',
        ]) {
            expect(contact, label).toContain(label)
        }
        expect(contact).toContain('<a href="/privacy.html">Datenschutzerklärung</a>')
        expect(contact).not.toMatch(/Your name|Send message|privacy notice|Tell me about your project/)
    }, TIMEOUT)
})
