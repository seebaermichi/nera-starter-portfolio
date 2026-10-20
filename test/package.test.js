import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'yaml'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Parses the `package.json` under `dir`, relative to the package root. */
function readPackage(dir = '.') {
    return JSON.parse(fs.readFileSync(path.join(root, dir, 'package.json'), 'utf-8'))
}

const pkg = readPackage()

// The theme and the plugins a scaffolded site gets (ROADMAP-ai.md L5, plan D4).
const DEPENDENCIES = [
    '@nera-static/plugin-contact-form',
    '@nera-static/plugin-images',
    '@nera-static/plugin-navigation',
    '@nera-static/plugin-sitemap',
    '@nera-static/plugin-social-media-links',
    '@nera-static/theme-business',
]

describe('package.json starter contract', () => {
    it('names the starter with a label and a description', () => {
        expect(pkg.nera.starter.label).toBe('Portfolio')
        expect(pkg.nera.starter.description.trim()).not.toBe('')
        // The `nera new` picker shows the npm description, so both say the same.
        expect(pkg.description).toBe(pkg.nera.starter.description)
    })

    it('is found by the starter search', () => {
        expect(pkg.keywords).toEqual(['nera', 'nera-starter', 'static-site-generator', 'starter', 'portfolio'])
    })

    it('depends on the business theme and its five plugins, with caret ranges', () => {
        expect(Object.keys(pkg.dependencies).sort()).toEqual(DEPENDENCIES)
        for (const range of Object.values(pkg.dependencies)) expect(range).toMatch(/^\^\d+\.\d+\.\d+$/)
        expect(pkg.peerDependencies).toBeUndefined()
        expect(pkg.optionalDependencies).toBeUndefined()
    })

    it('uses theme-business 1.x (the seams of ROADMAP-themes.md §S3)', () => {
        expect(pkg.dependencies['@nera-static/theme-business']).toMatch(/^\^1\./)
    })

    it('uses plugin-contact-form 1.1.1 or later (it publishes the client script)', () => {
        const [major, minor, patch] = pkg.dependencies['@nera-static/plugin-contact-form']
            .slice(1).split('.').map(Number)
        expect(major === 1 && (minor > 1 || (minor === 1 && patch >= 1))).toBe(true)
    })

    it('has no lifecycle scripts besides prepare', () => {
        const lifecycle = [
            'preinstall', 'install', 'postinstall', 'prepublish',
            'preprepare', 'postprepare', 'prepublishOnly', 'prepack', 'postpack',
            'publish', 'postpublish',
        ]
        expect(Object.keys(pkg.scripts).filter((s) => lifecycle.includes(s))).toEqual([])
        expect(Object.keys(pkg.scripts).sort()).toEqual(['lint', 'prepare', 'test'])
        expect(pkg.scripts.prepare).toBe('husky')
    })

    it('ships the starter folders plus the changelog', () => {
        // What `nera new --starter` copies (nera-cli/src/starter.js) is pages,
        // config, theme, assets, plugins and .neraignore; this starter uses the
        // first three. The image script under scripts/ stays out (plan D2).
        expect([...pkg.files].sort()).toEqual(['CHANGELOG.md', 'config', 'pages', 'theme'])
    })

    it('declares the toolchain floor and the npm package form', () => {
        expect(pkg.engines.node).toBe('>=22.12.0')
        expect(pkg.repository.url).toBe('git+https://github.com/seebaermichi/nera-starter-portfolio.git')
        expect(pkg.devDependencies['@nera-static/nera']).toMatch(/^\^1\.(1[3-9]|[2-9]\d)\./)
    })

    it('builds the sample images with the sharp that plugin-images uses, so it installs once', () => {
        const images = readPackage('node_modules/@nera-static/plugin-images')
        expect(pkg.devDependencies.sharp).toBe(images.dependencies.sharp)
        expect(pkg.dependencies.sharp).toBeUndefined()
    })
})

// The plugins whose templates theme/views/vendor/ holds unchanged.
const TEMPLATE_PLUGINS = ['plugin-contact-form', 'plugin-images', 'plugin-navigation', 'plugin-social-media-links']

// The seams of theme-business this starter fills (ROADMAP-themes.md §S2.4, §S3.2).
const SEAMS = ['hero-media', 'card-media', 'contact-form', 'nav-main', 'footer-extra']

// plugin-social-media-links' icon partial, which loads Font Awesome from a CDN.
const CDN_PARTIAL = 'fontawesome-cdn-link.pug'

/** Lists the files under `dir` as paths relative to it, sorted. */
function listFiles(dir) {
    return fs.readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)))
        .sort()
}

describe('theme folder', () => {
    it('ships none of the scaffold-default views, which would shadow the theme', () => {
        for (const file of ['theme/views/layouts/layout.pug', 'theme/views/pages/default.pug']) {
            expect(fs.existsSync(path.join(root, file)), file).toBe(false)
        }
    })

    it('fills the seams, each with the plugin template the theme names for it', () => {
        const includes = {
            'hero-media': '/vendor/plugin-images/picture',
            'card-media': '/vendor/plugin-images/picture',
            'contact-form': '/vendor/plugin-contact-form/contact-form',
            'nav-main': '/vendor/plugin-navigation/partials/link-list-navigation',
            'footer-extra': '/vendor/plugin-social-media-links/social-media-links',
        }
        expect(Object.keys(includes)).toEqual(SEAMS)
        for (const seam of SEAMS) {
            const file = path.join(root, 'theme/views/partials', `${seam}.pug`)
            expect(fs.readFileSync(file, 'utf-8'), seam).toMatch(new RegExp(`^include ${includes[seam]}$`, 'm'))
        }
    })

    it('reads the card and hero images from the `image` frontmatter key plugin-images resolves', () => {
        const partial = (seam) => fs.readFileSync(path.join(root, 'theme/views/partials', `${seam}.pug`), 'utf-8')
        expect(partial('card-media')).toContain('item.meta.images.image')
        expect(partial('hero-media')).toContain('meta.images.image')
        expect(partial('hero-media')).toContain('loading: \'eager\'')
        expect(readConfig('images').frontmatter_keys).toContain('image')
    })

    it('ships no CDN partial', () => {
        expect(listFiles(path.join(root, 'theme')).filter((f) => path.basename(f) === CDN_PARTIAL)).toEqual([])
    })

    it.each(TEMPLATE_PLUGINS)('vendors the templates of the installed %s unchanged', (plugin) => {
        const source = path.join(root, 'node_modules/@nera-static', plugin, 'views')
        const vendor = path.join(root, 'theme/views/vendor', plugin)
        const templates = listFiles(source).filter((f) => f.endsWith('.pug') && path.basename(f) !== CDN_PARTIAL)
        expect(templates).not.toEqual([])
        expect(listFiles(vendor)).toEqual(templates)
        for (const file of templates) {
            expect(fs.readFileSync(path.join(vendor, file), 'utf-8'), file)
                .toBe(fs.readFileSync(path.join(source, file), 'utf-8'))
        }
    })

    it('ships the contact form\'s client script unchanged', () => {
        const source = path.join(root, 'node_modules/@nera-static/plugin-contact-form/views/contact-form.js')
        expect(fs.readFileSync(path.join(root, 'theme/assets/js/contact-form.js'), 'utf-8'))
            .toBe(fs.readFileSync(source, 'utf-8'))
    })
})

/** Parses `config/<name>.yaml`. */
function readConfig(name) {
    return parse(fs.readFileSync(path.join(root, 'config', `${name}.yaml`), 'utf-8'))
}

/** The literal keys of every `t('…')` call in the .pug files under `dir`. */
function literalKeys(dir) {
    return listFiles(dir)
        .filter((f) => f.endsWith('.pug'))
        .flatMap((f) => [...fs.readFileSync(path.join(dir, f), 'utf-8').matchAll(/\bt\('([^']+)'\)/g)])
        .map((match) => match[1])
}

/** The texts of config/contact-form.yaml, every one a t() key in the plugin's template. */
function contactFormKeys(config) {
    const keys = [
        'subject', 'submit_label', 'error_required', 'error_email',
        'checkbox_checked_label', 'checkbox_unchecked_label', 'intro_text', 'consent_text',
    ].map((key) => config[key])
    for (const field of config.fields) {
        keys.push(field.label, ...(field.options || []).map((option) => option.label))
        if (field.placeholder) keys.push(field.placeholder)
    }
    return keys
}

describe('site config', () => {
    const appYaml = fs.readFileSync(path.join(root, 'config/app.yaml'), 'utf-8')
    const app = parse(appYaml)

    it('keeps the lines `nera new --name/--lang` edit, the theme, the origin and a translations entry', () => {
        // setAppValue and addLangTranslations in nera-cli/src/scaffold.js are line-based.
        expect(appYaml).toMatch(/^name: \S.*$/m)
        expect(appYaml).toMatch(/^lang: en$/m)
        expect(appYaml).toMatch(/^theme: business$/m)
        expect(appYaml).toMatch(/^translations:\n {4}en:$/m)
        expect(app.origin).toBe('https://example.com')
    })

    it('gives app.business only a city and a country (plan D4)', () => {
        expect(app.business).toEqual({ city: expect.any(String), country: expect.any(String) })
    })

    it('translates every theme, plugin and footer-link key', () => {
        const keys = new Set([
            'language_name',
            ...literalKeys(path.join(root, 'node_modules/@nera-static/theme-business/views')),
            ...TEMPLATE_PLUGINS.flatMap((plugin) => literalKeys(path.join(root, 'node_modules/@nera-static', plugin, 'views'))),
            ...readConfig('theme').footer_links.map((link) => link.label),
            ...contactFormKeys(readConfig('contact-form')),
        ])
        const missing = [...keys].filter((key) => typeof app.translations.en[key] !== 'string')
        expect(missing).toEqual([])
    })

    it('carries no opening-hours translations, since no page shows them', () => {
        for (const key of ['Mon–Fri', 'Sat', 'Sun', 'Closed on public holidays.']) {
            expect(app.translations.en[key], key).toBeUndefined()
        }
    })

    it('links the imprint and the privacy page from the footer and the consent text', () => {
        expect(readConfig('theme').footer_links).toEqual([
            { label: 'Imprint', href: '/imprint.html' },
            { label: 'Privacy', href: '/privacy.html' },
        ])
        expect(app.translations.en.contact_consent).toContain('href="/privacy.html"')
    })

    it('asks only for name, email, message and the privacy checkbox', () => {
        const form = readConfig('contact-form')
        expect(form.recipient).toBe('hello@example.com')
        expect(form.fields.map((field) => [field.name, field.type])).toEqual([
            ['name', 'text'], ['email', 'email'], ['message', 'textarea'], ['privacy', 'checkbox'],
        ])
        expect(form.fields.every((field) => field.required)).toBe(true)
    })

    it('configures images, navigation and social links as the theme expects', () => {
        expect(readConfig('images')).toEqual({ eager_first: false, og: false, frontmatter_keys: ['image'] })
        const navigation = readConfig('navigation')
        expect(Object.keys(navigation)).toEqual(['elements'])
        expect(navigation.elements.map((element) => element.href)).toEqual([
            '/index.html', '/projects/index.html', '/about.html', '/contact.html',
        ])
        const social = readConfig('social-media-links')
        expect(social.open_in_new_tab).toBe(false)
        expect(social.social_media_links).toHaveLength(1)
    })
})

// The sample images scripts/sample-images.js renders (plan D2).
const IMAGES_DIR = path.join(root, 'theme/assets/images')

// What plugin-images names its variants (`<base>-<hash8>-<width>.<ext>`), plus
// the usual hand-made `-800w` / `@2x` suffixes: the starter ships originals only.
const VARIANT_NAME = /(-[0-9a-f]{8}-\d+|-\d+w|@\dx)\.\w+$/

describe('sample images', () => {
    const images = listFiles(IMAGES_DIR)

    it('are a few JPEGs, the hero among them', () => {
        expect(images).toContain('hero.jpg')
        expect(images.length).toBeLessThanOrEqual(12)
        for (const file of images) expect(file, file).toMatch(/^[a-z0-9-]+\.jpg$/)
    })

    it('ships originals only, no resized variants and no image cache', () => {
        expect(images.filter((file) => VARIANT_NAME.test(file))).toEqual([])
        expect(fs.existsSync(path.join(root, '.nera-cache'))).toBe(false)
        expect(listFiles(path.join(root, 'theme')).filter((f) => f.split(path.sep).includes('.nera-cache'))).toEqual([])
    })

    it.each(images)('%s is at most 100 KB and wide enough for plugin-images to scale down', async (file) => {
        const source = path.join(IMAGES_DIR, file)
        expect(fs.statSync(source).size).toBeLessThanOrEqual(100 * 1024)
        const { format, width, height } = await sharp(source).metadata()
        expect(format).toBe('jpeg')
        expect(width).toBeGreaterThanOrEqual(1200)
        expect(width).toBeLessThanOrEqual(1600)
        // 4:3, the ratio of theme-business' cards, gallery cells and hero.
        expect(width * 3).toBe(height * 4)
    })
})
