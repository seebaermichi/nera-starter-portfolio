# @nera-static/starter-portfolio

[![Test](https://github.com/seebaermichi/nera-starter-portfolio/actions/workflows/test.yml/badge.svg)](https://github.com/seebaermichi/nera-starter-portfolio/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/@nera-static/starter-portfolio)](https://www.npmjs.com/package/@nera-static/starter-portfolio)

📖 **Documentation:** [nera.js.org](https://nera.js.org)

A ready-to-edit portfolio for a designer or illustrator, built with the
[Nera](https://github.com/seebaermichi/nera) static site generator on
[`@nera-static/theme-business`](https://www.npmjs.com/package/@nera-static/theme-business):
home with a hero image, a projects index with one image card per project,
three projects with captioned image galleries, about, a contact form,
navigation, responsive images, social links, a sitemap and imprint and privacy
placeholders. One small script for the contact form, no third-party requests;
a fresh site passes `nera build --check` and `nera validate` without a single
finding.

## Usage

```bash
npx @nera-static/nera new my-site --starter portfolio
npx @nera-static/nera new my-site --starter portfolio --name "Studio Kreis" --lang de
```

`--name` and `--lang` set `name` and `lang` in `config/app.yaml`; a new
language gets a copy of the English `translations:` entry to translate. The
pages never name the person or studio, so `--name` renames the whole site.

## What you get

- `pages/index.md` (home with the hero and a card per project), `about.md`,
  `contact.md` (with the form)
- `pages/projects/index.md`: the projects index on the theme's `pages/list.pug`,
  one card per project with its `image`
- `pages/projects/tides.md`, `blocks.md`, `orbits.md`: one project each on the
  theme's `pages/gallery.pug`, three captioned images laid out as a grid,
  numbered by `order`
- `pages/imprint.md`, `pages/privacy.md`: **placeholders, not legal texts**
- `config/app.yaml`: name, language, `theme: business`, `origin`, a city and
  a country under `business:` (no address, phone or opening hours) and the
  theme and plugin texts
- `config/theme.yaml`, `contact-form.yaml`, `navigation.yaml`, `images.yaml`
  (frontmatter `image` becomes a responsive picture), `social-media-links.yaml`
- `theme/views/partials/`: the theme's seams, filled with the plugins' output
- `theme/views/vendor/`: the plugins' published templates
- `theme/assets/js/contact-form.js`: the contact form's script, which opens
  the visitor's own mail program (the form has no backend)
- `theme/assets/images/`: the hero and three images per project
- plugins: contact-form, images, navigation, social-media-links, sitemap

## Sample images

The ten sample images are abstract compositions generated for this starter by
`scripts/sample-images.js` (in the repository, not in the package): its own
work under the MIT licence of this package, no photo agency, no attribution
owed. Keep, replace or delete them.

## German texts for `--lang de`

Replace the copied `de:` entry in `config/app.yaml` with:

```yaml
    de:
        language_name: Deutsch
        Skip to content: Zum Inhalt springen
        Main navigation: Hauptnavigation
        Language: Sprache
        Legal: Rechtliches
        Opening hours: Öffnungszeiten
        Closed: Geschlossen
        Contact details: Kontakt
        Phone: Telefon
        Email: E-Mail
        Imprint: Impressum
        Privacy: Datenschutz
        Navigation: Navigation
        Message from the website: Nachricht über die Website
        Send message: Nachricht senden
        Please fill in all required fields.: Bitte füllen Sie alle Pflichtfelder aus.
        Please enter a valid email address.: Bitte geben Sie eine gültige E-Mail-Adresse an.
        'Yes': Ja
        'No': Nein
        Your name: Ihr Name
        Your email: Ihre E-Mail-Adresse
        Message: Nachricht
        I have read the privacy notice: Ich habe die Datenschutzerklärung gelesen
        contact_intro: Erzählen Sie mir von Ihrem Projekt, seinem Umfang und seinem Zeitplan. Ich antworte innerhalb weniger Tage.
        contact_consent: 'Beim Senden öffnet sich Ihr eigenes E-Mail-Programm; diese Website versendet nichts. Mehr dazu in der <a href="/privacy.html">Datenschutzerklärung</a>.'
```

The pages themselves stay English: translate their copy by hand.

## Requirements

- `@nera-static/nera` 1.11.0 or later, with `@nera-static/core` 4.15.0 or
  later (the theme's floor; a fresh install brings the newest)
- Node.js `>=22.12.0` (its bundled npm 10.9 or later)

## License

MIT

## First steps

After `nera new` the files are yours: a starter has no update path. Each
file named in steps 1 to 5 marks its placeholders as such.

1. Replace `origin: https://example.com` in `config/app.yaml` with your
   site's real address. The sitemap is built from it.
2. Replace the city and country under `business:` in `config/app.yaml`.
   They show in the footer and next to the contact form.
3. Replace `recipient: hello@example.com` in `config/contact-form.yaml` with
   the address the contact form writes to.
4. Replace the social link in `config/social-media-links.yaml`.
5. Replace `pages/imprint.md` and `pages/privacy.md` with your own legal texts.
6. Replace the sample projects in `pages/projects/`, the copy of the other
   pages, the sample images in `theme/assets/images/` and the grey
   placeholder icon `theme/assets/favicon.ico` with your own. A new project
   is a page on `pages/gallery.pug` with an `order`, an `image` and an
   `image_alt` for its card.
