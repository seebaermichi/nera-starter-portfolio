import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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
