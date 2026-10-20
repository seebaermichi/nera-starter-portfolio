// Renders the starter's sample images: abstract SVG compositions, encoded to
// JPEG with sharp, written to theme/assets/images/. They are the starter's own
// work (MIT, like the package), so a site may keep, replace or delete them.
// The output is committed; rerun after changing a composition:
//
//     node scripts/sample-images.js
//
// A seeded random generator keeps every rerun byte-identical.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'theme/assets/images')

// 4:3, the ratio of theme-business' cards, gallery cells and hero.
const WIDTH = 1600
const HEIGHT = 1200

// The theme's "Crust" colours (theme-business assets/css/theme.css), plus an
// ochre and a sage that sit between them.
const COLORS = {
    cream: '#fbf2e3',
    surface: '#f1e0c3',
    sand: '#dcc6a3',
    ochre: '#c98a2b',
    rust: '#a1400f',
    umber: '#6e4b2e',
    brown: '#3b2314',
    sage: '#7a8b6f',
    teal: '#1c5f74',
}
const { cream, surface, sand, ochre, rust, umber, brown, sage, teal } = COLORS

/** A small seeded PRNG (mulberry32), so the compositions never change between runs. */
function random(seed) {
    let state = seed
    return () => {
        state = (state + 0x6d2b79f5) | 0
        let t = Math.imul(state ^ (state >>> 15), 1 | state)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** Wraps shapes in an SVG document on a solid background. */
function svg(background, shapes) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">`
        + `<rect width="${WIDTH}" height="${HEIGHT}" fill="${background}"/>${shapes.join('')}</svg>`
}

/** "Tides": horizontal bands with sine-wave edges, back to front. */
function tides(seed, palette) {
    const rand = random(seed)
    const bands = palette.slice(1)
    const shapes = bands.map((color, i) => {
        const base = HEIGHT * (0.25 + (0.7 * i) / bands.length)
        const amplitude = 30 + rand() * 70
        const length = 300 + rand() * 500
        const phase = rand() * Math.PI * 2
        const points = []
        for (let x = 0; x <= WIDTH; x += 20) {
            const y = base + amplitude * Math.sin((x / length) * Math.PI * 2 + phase)
            points.push(`${x},${y.toFixed(1)}`)
        }
        return `<path d="M0,${HEIGHT} L${points.join(' L')} L${WIDTH},${HEIGHT} Z" fill="${color}"/>`
    })
    return svg(palette[0], shapes)
}

/** "Blocks": a grid of squares, each holding a quarter circle, half circle or bar. */
function blocks(seed, palette) {
    const rand = random(seed)
    const columns = 4
    const rows = 3
    const size = WIDTH / columns
    const pick = () => palette[1 + Math.floor(rand() * (palette.length - 1))]
    const shapes = []
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
            const x = column * size
            const y = row * size
            const background = rand() < 0.4 ? pick() : palette[0]
            let fill = pick()
            if (fill === background) fill = palette[0]
            shapes.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${background}"/>`)
            const kind = Math.floor(rand() * 4)
            if (kind === 0) {
                // A quarter circle from one corner.
                const cx = x + (rand() < 0.5 ? 0 : size)
                const cy = y + (rand() < 0.5 ? 0 : size)
                shapes.push(`<clipPath id="c${row}${column}"><rect x="${x}" y="${y}" width="${size}" height="${size}"/></clipPath>`
                    + `<circle cx="${cx}" cy="${cy}" r="${size}" fill="${fill}" clip-path="url(#c${row}${column})"/>`)
            } else if (kind === 1) {
                shapes.push(`<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size * 0.32}" fill="${fill}"/>`)
            } else if (kind === 2) {
                shapes.push(`<rect x="${x}" y="${y + size / 3}" width="${size}" height="${size / 3}" fill="${fill}"/>`)
            } else {
                shapes.push(`<path d="M${x},${y + size} L${x + size},${y + size} L${x + size},${y} Z" fill="${fill}"/>`)
            }
        }
    }
    return svg(palette[0], shapes)
}

/** "Orbits": a large disc with concentric rings and a few satellites. */
function orbits(seed, palette) {
    const rand = random(seed)
    const cx = WIDTH * (0.3 + rand() * 0.4)
    const cy = HEIGHT * (0.35 + rand() * 0.3)
    const shapes = [`<circle cx="${cx}" cy="${cy}" r="${HEIGHT * 0.22}" fill="${palette[1]}"/>`]
    for (let ring = 1; ring <= 5; ring++) {
        const r = HEIGHT * (0.22 + ring * 0.11)
        shapes.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${palette[2]}" stroke-width="${4 + ring * 2}"/>`)
        const angle = rand() * Math.PI * 2
        const satellite = palette[3 + (ring % (palette.length - 3))]
        shapes.push(`<circle cx="${(cx + r * Math.cos(angle)).toFixed(1)}" cy="${(cy + r * Math.sin(angle)).toFixed(1)}" r="${18 + rand() * 40}" fill="${satellite}"/>`)
    }
    return svg(palette[0], shapes)
}

/** "Hero": the three series in one composition — a band, a disc and a block. */
function hero() {
    return svg(cream, [
        `<rect x="0" y="${HEIGHT * 0.62}" width="${WIDTH}" height="${HEIGHT * 0.38}" fill="${surface}"/>`,
        `<path d="M0,${HEIGHT * 0.78} C${WIDTH * 0.3},${HEIGHT * 0.66} ${WIDTH * 0.6},${HEIGHT * 0.92} ${WIDTH},${HEIGHT * 0.74} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z" fill="${sand}"/>`,
        `<circle cx="${WIDTH * 0.62}" cy="${HEIGHT * 0.42}" r="${HEIGHT * 0.27}" fill="${rust}"/>`,
        `<circle cx="${WIDTH * 0.62}" cy="${HEIGHT * 0.42}" r="${HEIGHT * 0.36}" fill="none" stroke="${ochre}" stroke-width="10"/>`,
        `<rect x="${WIDTH * 0.12}" y="${HEIGHT * 0.2}" width="${WIDTH * 0.2}" height="${HEIGHT * 0.52}" fill="${teal}"/>`,
        `<rect x="${WIDTH * 0.12}" y="${HEIGHT * 0.72}" width="${WIDTH * 0.76}" height="12" fill="${brown}"/>`,
    ])
}

// file name → SVG: the home page's hero, and three per sample project (one series each).
const IMAGES = {
    'hero.jpg': hero(),
    'tides-1.jpg': tides(11, [cream, sand, ochre, rust, brown]),
    'tides-2.jpg': tides(12, [surface, sage, teal, umber]),
    'tides-3.jpg': tides(13, [sand, cream, rust, teal, brown]),
    'blocks-1.jpg': blocks(21, [cream, rust, teal, ochre, brown]),
    'blocks-2.jpg': blocks(22, [surface, sage, umber, rust]),
    'blocks-3.jpg': blocks(23, [brown, ochre, cream, teal]),
    'orbits-1.jpg': orbits(31, [cream, rust, sand, teal, brown]),
    'orbits-2.jpg': orbits(32, [teal, ochre, sage, cream, rust]),
    'orbits-3.jpg': orbits(33, [surface, umber, ochre, rust, sage]),
}

fs.mkdirSync(outDir, { recursive: true })
for (const [name, source] of Object.entries(IMAGES)) {
    const file = path.join(outDir, name)
    await sharp(Buffer.from(source)).jpeg({ quality: 80, mozjpeg: true }).toFile(file)
    console.log(`${path.relative(root, file)}  ${(fs.statSync(file).size / 1024).toFixed(1)} KB`)
}
