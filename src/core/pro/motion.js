/**
 * Apple TV / tv-vibehack Motion Choreography, Specular Glass Focus & ClockDream OLED Screensaver
 * Reverse-engineered from Gathin23/tv-vibehack (GlassView.java, AppAdapter.java, tile_enter.xml, ClockDream.java)
 */

const OLED_PALETTE = [
    [43, 92, 255],   // #2B5CFF Cinema Cobalt
    [0, 163, 154],   // #00A39A Deep Teal
    [138, 63, 252],  // #8A3FFC Royal Violet
    [224, 102, 27],  // #E0661B Warm Amber
    [214, 51, 108]   // #D6336C Crimson Rose
]

let motionStyleInjected = false

/**
 * Injects 2026 GPU-composited individual transform properties (scale, translate),
 * tv-vibehack GlassView specular highlight rim, staggered tile_enter animation,
 * and Smart Resume CTA / Ambient Full Card scrim styles.
 */
export function initMotionStyles() {
    if (motionStyleInjected || typeof document === 'undefined') return
    motionStyleInjected = true

    let style = document.createElement('style')
    style.id = 'cub-pro-tv-vibehack-motion'
    style.textContent = `
        :root {
            --lampa-focus-in-ease: cubic-bezier(0.22, 1, 0.36, 1);
            --lampa-focus-out-ease: cubic-bezier(0.22, 1, 0.36, 1);
            --lampa-dur-focus-in: 180ms;
            --lampa-dur-focus-out: 150ms;
            --lampa-vivid-rgb: 43, 92, 255;
            --lampa-vivid-hex: #2b5cff;
            --card-vivid-glow: rgba(43, 92, 255, 0.36);
        }

        /* Ambient HSV Radial Glow on Full Card (tv-vibehack MainActivity.java:310-316: center 32% 42%, radius 62%, alpha 0x5C -> 0x26 -> 0x00) */
        .full-start-new {
            position: relative;
        }
        .full-start-new::before {
            content: "";
            position: fixed;
            inset: 0;
            z-index: -1;
            pointer-events: none;
            background: radial-gradient(
                circle at 32% 42%,
                rgba(var(--lampa-vivid-rgb, 43, 92, 255), 0.36) 0%,
                rgba(var(--lampa-vivid-rgb, 43, 92, 255), 0.15) 48%,
                rgba(0, 0, 0, 0) 76%
            );
            transition: background 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms ease;
        }

        /* 1-Click Smart Torrent Resume Primary CTA Button */
        .full-start__button.view--smart-resume {
            position: relative;
            overflow: hidden;
            display: inline-flex !important;
            flex-direction: column;
            justify-content: center;
            padding: 0.55em 1.25em 0.72em 1.15em !important;
            margin-right: 0.85em !important;
            border-radius: 0.85em !important;
            color: #ffffff !important;
            background: linear-gradient(135deg, rgba(var(--lampa-vivid-rgb, 43, 92, 255), 0.44) 0%, rgba(20, 24, 34, 0.90) 100%) !important;
            border: 1px solid rgba(255, 255, 255, 0.34) !important;
            transition:
                background 180ms ease,
                box-shadow 220ms ease !important;
        }
        .full-start__button.view--smart-resume.hide {
            display: none !important;
        }
        .full-start__button.view--smart-resume span {
            display: inline !important;
            color: #ffffff !important;
        }
        .full-start__button.view--smart-resume.focus {
            background: linear-gradient(135deg, rgba(var(--lampa-vivid-rgb, 43, 92, 255), 0.86) 0%, rgba(var(--lampa-vivid-rgb, 43, 92, 255), 0.48) 100%) !important;
            color: #ffffff !important;
            border: 1.5px solid rgba(255, 255, 255, 0.95) !important;
            box-shadow:
                0 0 0 2px rgba(255, 255, 255, 0.25),
                0 10px 28px rgba(0, 0, 0, 0.65),
                0 0 26px var(--card-vivid-glow, rgba(43, 92, 255, 0.55)) !important;
        }
        .smart-resume__row {
            display: flex;
            align-items: center;
            gap: 0.6em;
        }
        .smart-resume__row svg {
            width: 1.25em !important;
            height: 1.25em !important;
            flex-shrink: 0;
            margin-right: 0 !important;
            color: #ffffff !important;
        }
        .smart-resume__labels {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            line-height: 1.15;
        }
        .smart-resume__title {
            font-weight: 700;
            font-size: 1.0em;
            white-space: nowrap;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
        }
        .smart-resume__meta {
            font-size: 0.74em;
            opacity: 0.90;
            margin-top: 0.14em;
            white-space: nowrap;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
        }
        .smart-resume__bar {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 4px;
            background: rgba(0, 0, 0, 0.32);
        }
        .full-start__button.view--smart-resume.focus .smart-resume__bar {
            background: rgba(0, 0, 0, 0.36);
        }
        .smart-resume__bar-fill {
            height: 100%;
            background: #ffffff;
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.9);
            border-radius: 0 2px 2px 0;
            transition: width 300ms ease;
        }

        /* TV Remote Color Key Dots inside Torrent Quick Filter Chips (NUM TorrentsKeyHandler port) */
        .torrent-quick-chip__color-dot {
            display: inline-block;
            width: 0.55em;
            height: 0.55em;
            border-radius: 50%;
            margin-right: 0.42em;
            vertical-align: middle;
            box-shadow: 0 0 6px currentColor;
        }

        /* ClockDream OLED Burn-In Drift Screensaver (tv-vibehack/ClockDream.java port) */
        .screensaver-oled {
            position: fixed;
            inset: 0;
            background: #000000;
            z-index: 9999;
            overflow: hidden;
            user-select: none;
        }
        .screensaver-oled__ambient {
            position: absolute;
            inset: 0;
            pointer-events: none;
            transition: background 1800ms ease, opacity 1200ms ease;
        }
        .screensaver-oled__cluster {
            position: absolute;
            left: 12%;
            top: 18%;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            transition: opacity 900ms cubic-bezier(0.22, 1, 0.36, 1), translate 900ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .screensaver-oled__time {
            font-size: 5.8em;
            font-weight: 200;
            letter-spacing: -0.04em;
            color: rgba(255, 255, 255, 0.90);
            line-height: 1;
            font-variant-numeric: tabular-nums;
        }
        .screensaver-oled__date {
            font-size: 1.05em;
            font-weight: 500;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.54);
            margin-top: 0.45em;
        }
        .screensaver-oled__badge {
            margin-top: 0.85em;
            padding: 0.35em 0.8em;
            border-radius: 999px;
            font-size: 0.85em;
            color: rgba(255, 255, 255, 0.68);
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
        }
    `
    if (document.head) document.head.appendChild(style)
}

/**
 * ClockDream OLED Burn-In Drift Screensaver class compatible with Lampa.Screensaver
 */
export class OledDriftScreensaver {
    constructor(params = {}) {
        this.params = params
        this.html = null
        this.driftTimer = null
        this.clockTimer = null
        this.paletteIdx = 0
    }

    create() {
        initMotionStyles()
        this.html = $(`
            <div class="screensaver-oled">
                <div class="screensaver-oled__ambient"></div>
                <div class="screensaver-oled__cluster">
                    <div class="screensaver-oled__time">00:00</div>
                    <div class="screensaver-oled__date"></div>
                    <div class="screensaver-oled__badge">CUB PRO • OLED Ambient Protection</div>
                </div>
            </div>
        `)

        this.updateClock()
        this.moveAndMorph(true)

        this.clockTimer = setInterval(() => this.updateClock(), 10000)
        this.driftTimer = setInterval(() => this.moveAndMorph(false), 60000)
    }

    updateClock() {
        if (!this.html) return
        let now = new Date()
        let hh = String(now.getHours()).padStart(2, '0')
        let mm = String(now.getMinutes()).padStart(2, '0')
        this.html.find('.screensaver-oled__time').text(hh + ':' + mm)

        try {
            let dateStr = now.toLocaleDateString('ru-RU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            })
            this.html.find('.screensaver-oled__date').text(dateStr)
        } catch (e) {
            this.html.find('.screensaver-oled__date').text(now.toDateString())
        }
    }

    moveAndMorph(immediate = false) {
        if (!this.html) return
        let cluster = this.html.find('.screensaver-oled__cluster')[0]
        let ambient = this.html.find('.screensaver-oled__ambient')[0]
        if (!cluster || !ambient) return

        let applyPosition = () => {
            let rx = Math.round(10 + Math.random() * 62) // [10%..72%] safe horizontal bounds
            let ry = Math.round(12 + Math.random() * 64) // [12%..76%] safe vertical bounds
            let rgb = OLED_PALETTE[this.paletteIdx % OLED_PALETTE.length]
            this.paletteIdx++

            cluster.style.left = rx + '%'
            cluster.style.top = ry + '%'
            ambient.style.background = `radial-gradient(circle at ${rx + 8}% ${ry + 8}%, rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.25) 0%, rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.08) 45%, rgba(0, 0, 0, 0) 75%)`
            cluster.style.opacity = '1'
        }

        if (immediate) {
            applyPosition()
        } else {
            cluster.style.opacity = '0'
            setTimeout(() => {
                if (this.html) applyPosition()
            }, 900)
        }
    }

    render() {
        return this.html
    }

    destroy() {
        clearInterval(this.driftTimer)
        clearInterval(this.clockTimer)
        if (this.html) {
            this.html.remove()
            this.html = null
        }
    }
}

export default {
    initMotionStyles,
    OledDriftScreensaver
}
