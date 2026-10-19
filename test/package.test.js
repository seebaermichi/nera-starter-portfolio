import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'yaml'

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

// The plugins whose templates render t() keys; step 3 vendors them unchanged.
const TEMPLATE_PLUGINS = ['plugin-contact-form', 'plugin-images', 'plugin-navigation', 'plugin-social-media-links']

/** Lists the files under `dir` as paths relative to it, sorted. */
function listFiles(dir) {
    return fs.readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)))
        .sort()
}

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
