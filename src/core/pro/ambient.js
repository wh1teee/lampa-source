/**
 * Ambient HSV Vivid Color Extraction & Living Cinema Backdrop Engine
 * Reverse-engineered from Gathin23/tv-vibehack (AppAdapter.vividColor & MainActivity.updateAmbient)
 * and Apple TV+ / tvOS dynamic artwork color bleed.
 */

const vividCache = new Map()

const GENRE_CINEMA_PALETTES = {
    878:   [43, 108, 255],  // Sci-Fi: Cinema Cobalt (#2B6CFF)
    28:    [235, 92, 39],   // Action: Ember Orange (#EB5C27)
    12:    [0, 168, 150],   // Adventure: Deep Teal (#00A896)
    27:    [196, 38, 68],   // Horror: Crimson Noir (#C42644)
    53:    [56, 132, 224],  // Thriller: Cold Steel Blue (#3884E0)
    16:    [148, 72, 255],  // Animation: Vivid Violet (#9448FF)
    35:    [240, 154, 36],  // Comedy: Warm Gold (#F09A24)
    18:    [92, 114, 214],  // Drama: Indigo Dusk (#5C72D6)
    10749: [218, 62, 122],  // Romance: Rose Velvet (#DA3E7A)
    14:    [138, 63, 252],  // Fantasy: Royal Amethyst (#8A3FFC)
    80:    [204, 118, 34],  // Crime: Amber Brass (#CC7622)
    10752: [110, 138, 98]   // War: Olive Slate (#6E8A62)
}

const DEFAULT_PALETTE = [
    [43, 92, 255],
    [0, 163, 154],
    [138, 63, 252],
    [224, 102, 27],
    [214, 51, 108]
]

function rgbToHsv(r, g, b) {
    let max = Math.max(r, g, b)
    let min = Math.min(r, g, b)
    let d = max - min
    let h = 0
    let s = max === 0 ? 0 : d / max
    let v = max

    if (d !== 0) {
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        else if (max === g) h = ((b - r) / d + 2) / 6
        else h = ((r - g) / d + 4) / 6
    }

    return [h, s, v]
}

function hsvToRgb(h, s, v) {
    let i = Math.floor(h * 6)
    let f = h * 6 - i
    let p = v * (1 - s)
    let q = v * (1 - f * s)
    let t = v * (1 - (1 - f) * s)
    let r = 0, g = 0, b = 0

    switch (i % 6) {
        case 0: r = v; g = t; b = p; break
        case 1: r = q; g = v; b = p; break
        case 2: r = p; g = v; b = t; break
        case 3: r = p; g = q; b = v; break
        case 4: r = t; g = p; b = v; break
        case 5: r = v; g = p; b = q; break
    }

    return [
        Math.round(Math.max(0, Math.min(255, r * 255))),
        Math.round(Math.max(0, Math.min(255, g * 255))),
        Math.round(Math.max(0, Math.min(255, b * 255)))
    ]
}

function buildColorDescriptor(R, G, B, source = 'hsv') {
    let hex = '#' + [R, G, B].map(x => x.toString(16).padStart(2, '0')).join('')
    return {
        r: R,
        g: G,
        b: B,
        rgb: R + ', ' + G + ', ' + B,
        hex: hex,
        glow36: 'rgba(' + R + ', ' + G + ', ' + B + ', 0.36)', // 0x5C alpha from tv-vibehack
        glow15: 'rgba(' + R + ', ' + G + ', ' + B + ', 0.15)', // 0x26 alpha from tv-vibehack
        cardGlow: 'rgba(' + R + ', ' + G + ', ' + B + ', 0.42)',
        source: source
    }
}

/**
 * Instant (0ms) deterministic vivid color fallback from card genres & ID
 * Used while poster image is still decoding or if CORS blocks canvas readback.
 */
export function computeDeterministicVividColor(card = {}) {
    let id = Number(card && card.id) || 1000
    let cacheKey = 'card_' + id
    if (vividCache.has(cacheKey)) return vividCache.get(cacheKey)

    let genres = []
    if (Array.isArray(card.genre_ids)) genres = card.genre_ids.map(Number)
    else if (Array.isArray(card.genres)) genres = card.genres.map(g => Number(g && g.id ? g.id : g))

    let base = null
    for (let i = 0; i < genres.length; i++) {
        if (GENRE_CINEMA_PALETTES[genres[i]]) {
            base = GENRE_CINEMA_PALETTES[genres[i]]
            break
        }
    }
    if (!base) {
        base = DEFAULT_PALETTE[Math.abs(id) % DEFAULT_PALETTE.length]
    }

    let [h, s, v] = rgbToHsv(base[0] / 255, base[1] / 255, base[2] / 255)
    let hueShift = (((id * 2654435761) >>> 0) % 18 - 9) / 360
    h = (h + hueShift + 1) % 1
    s = Math.min(1.0, Math.max(0.55, s * 1.05))
    v = Math.max(0.55, v)

    let [R, G, B] = hsvToRgb(h, s, v)
    let desc = buildColorDescriptor(R, G, B, 'deterministic')
    vividCache.set(cacheKey, desc)
    return desc
}

/**
 * Exact 12x12 grid HSV vividColor extraction ported from Gathin23/tv-vibehack (AppAdapter.java:207-247)
 * Samples 144 pixels (<0.08ms), scores saturation * min(1, value * 1.4), boosts saturation 1.1x, clamps value >= 0.50.
 */
export function extractVividColorFromImage(img, fallbackCard = null) {
    if (!img) return computeDeterministicVividColor(fallbackCard || {})
    let src = img.currentSrc || img.src || ''
    if (src && vividCache.has(src)) return vividCache.get(src)

    try {
        let canvas = document.createElement('canvas')
        canvas.width = 12
        canvas.height = 12
        let ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, 12, 12)
        let data = ctx.getImageData(0, 0, 12, 12).data

        let bestScore = -1
        let bestH = 0, bestS = 0, bestV = 0
        let sumR = 0, sumG = 0, sumB = 0
        let count = 0

        for (let i = 0; i < data.length; i += 4) {
            let a = data[i + 3]
            if (a < 32) continue
            let r = data[i] / 255
            let g = data[i + 1] / 255
            let b = data[i + 2] / 255

            sumR += data[i]
            sumG += data[i + 1]
            sumB += data[i + 2]
            count++

            let [h, s, v] = rgbToHsv(r, g, b)
            let score = s * Math.min(1.0, v * 1.4)
            if (score > bestScore) {
                bestScore = score
                bestH = h
                bestS = s
                bestV = v
            }
        }

        if (count === 0) {
            return computeDeterministicVividColor(fallbackCard || {})
        }

        if (bestScore < 0.25) {
            let ar = (sumR / count) / 255
            let ag = (sumG / count) / 255
            let ab = (sumB / count) / 255
            let [ah, as, av] = rgbToHsv(ar, ag, ab)
            bestH = ah
            bestS = as
            bestV = Math.max(av, 0.55)
        } else {
            bestS = Math.min(1.0, bestS * 1.1)
            bestV = Math.max(0.50, bestV)
        }

        let [R, G, B] = hsvToRgb(bestH, bestS, bestV)
        let desc = buildColorDescriptor(R, G, B, 'hsv_canvas_12x12')
        if (src) vividCache.set(src, desc)
        return desc
    } catch (e) {
        return computeDeterministicVividColor(fallbackCard || {})
    }
}

/**
 * Applies the living cinema ambient radial backdrop to a Full Card container and global root variables.
 */
export function applyFullCardAmbient(htmlContainer, card = {}, posterImg = null) {
    let initial = computeDeterministicVividColor(card)
    let applyDescriptor = (desc) => {
        if (!desc) return
        let root = document.documentElement
        if (root && root.style) {
            root.style.setProperty('--lampa-vivid-rgb', desc.rgb)
            root.style.setProperty('--lampa-vivid-hex', desc.hex)
            root.style.setProperty('--card-vivid-glow', desc.cardGlow)
        }
        let el = htmlContainer && htmlContainer[0] ? htmlContainer[0] : htmlContainer
        if (el && el.style) {
            el.style.setProperty('--lampa-vivid-rgb', desc.rgb)
            el.style.setProperty('--lampa-vivid-hex', desc.hex)
            el.style.setProperty('--card-vivid-glow', desc.cardGlow)
            el.setAttribute('data-ambient-rgb', desc.rgb)
            el.setAttribute('data-ambient-source', desc.source)
        }
    }

    applyDescriptor(initial)

    let targetImg = posterImg || (htmlContainer && htmlContainer.find ? htmlContainer.find('.full--poster')[0] : null)
    if (targetImg) {
        if (targetImg.complete && targetImg.naturalWidth > 0) {
            let extracted = extractVividColorFromImage(targetImg, card)
            applyDescriptor(extracted)
            return extracted
        } else {
            let onLoaded = () => {
                targetImg.removeEventListener('load', onLoaded)
                let extracted = extractVividColorFromImage(targetImg, card)
                applyDescriptor(extracted)
            }
            targetImg.addEventListener('load', onLoaded, { once: true })
        }
    }

    return initial
}

export default {
    extractVividColorFromImage,
    computeDeterministicVividColor,
    applyFullCardAmbient
}
