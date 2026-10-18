/**
 * Smart Torrent & Episode Resume Engine (1-Click Full Lifecycle)
 * Bridges Movie/Series Full Card -> Torrent Selection -> TorrServer File/Episode -> Timeline Auto-Advance.
 */

import Storage from '../storage/storage'
import Utils from '../../utils/utils'

function getTimeline() {
    return (typeof window !== 'undefined' && window.Lampa && window.Lampa.Timeline) ? window.Lampa.Timeline : null
}
function getTorserver() {
    return (typeof window !== 'undefined' && window.Lampa && window.Lampa.Torserver) ? window.Lampa.Torserver : null
}
function getPlayer() {
    return (typeof window !== 'undefined' && window.Lampa && window.Lampa.Player) ? window.Lampa.Player : null
}
function getNoty() {
    return (typeof window !== 'undefined' && window.Lampa && window.Lampa.Noty) ? window.Lampa.Noty : null
}

const STORAGE_KEY = 'cub_pro_smart_resume_v1'
const MAX_SESSIONS = 100
const COMPLETED_THRESHOLD_PERCENT = 92

function getCardKey(card = {}) {
    if (!card || !card.id) return ''
    let isTv = Boolean(card.name || card.first_air_date || card.number_of_seasons)
    return (isTv ? 'tv_' : 'movie_') + card.id
}

function loadStore() {
    let raw = Storage.get(STORAGE_KEY, '{}')
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    return raw
}

function saveStore(store) {
    let keys = Object.keys(store)
    if (keys.length > MAX_SESSIONS) {
        keys.sort((a, b) => ((store[b] && store[b].updated_at) || 0) - ((store[a] && store[a].updated_at) || 0))
        let trimmed = {}
        keys.slice(0, MAX_SESSIONS).forEach(k => {
            trimmed[k] = store[k]
        })
        store = trimmed
    }
    Storage.set(STORAGE_KEY, store)
}

/**
 * Records when a user selects a torrent item in torrents.js
 */
export function recordTorrentSelection(card = {}, torrentElement = {}) {
    let key = getCardKey(card)
    if (!key || !torrentElement) return null

    let store = loadStore()
    let prev = store[key] || {}

    let magnetOrLink = torrentElement.MagnetUri || torrentElement.Link || torrentElement.magnet || torrentElement.link || ''
    let btih = torrentElement._btih || torrentElement.hash || ''
    let title = torrentElement.Title || torrentElement.title || ''
    let qualityLabel = torrentElement.num_quality_label || (torrentElement._qInfo && torrentElement._qInfo.label) || ''
    let voiceLabel = torrentElement.num_voice_label || (torrentElement._vInfo && (torrentElement._vInfo.studios[0] || torrentElement._vInfo.tierLabel)) || ''

    store[key] = Object.assign({}, prev, {
        card_id: card.id,
        media_type: (card.name || card.first_air_date || card.number_of_seasons) ? 'tv' : 'movie',
        card_title: card.title || card.name || '',
        original_title: card.original_title || card.original_name || '',
        poster: card.img || card.poster_path || '',
        torrent: {
            Title: title,
            title: title,
            MagnetUri: magnetOrLink,
            Link: magnetOrLink,
            hash: btih,
            _btih: btih,
            Tracker: torrentElement.Tracker || torrentElement.tracker || '',
            Size: torrentElement.Size || torrentElement.size || 0,
            Seeders: torrentElement.Seeders || torrentElement.seeds || 0,
            poster: card.img || '',
            num_quality_code: torrentElement.num_quality_code || 0,
            num_quality_label: qualityLabel,
            num_voice_label: voiceLabel
        },
        quality_label: qualityLabel || prev.quality_label || '',
        voice_label: voiceLabel || prev.voice_label || '',
        updated_at: Date.now()
    })

    saveStore(store)
    return store[key]
}

/**
 * Records when TorrServer resolves the file list or a specific file/episode starts playing in interaction/torrent.js
 */
function computeTimelineHash(card = {}, item = {}) {
    if (item && item.timeline && item.timeline.hash) return item.timeline.hash
    if (item && item.timeline_hash) return item.timeline_hash
    let orig = (card && (card.original_name || card.original_title || card.title || card.name)) || ''
    if (item && item.season && item.episode && orig) {
        let s = Number(item.season)
        let e = Number(item.episode)
        return Utils.hash([s, s > 10 ? ':' : '', e, orig].join(''))
    }
    let str = (item && (item.title || item.fname || item.path)) || orig || ''
    return str ? Utils.hash(str) : ''
}

export function recordTorrentFileSession(card = {}, torrentObj = {}, serverHash = '', activeElement = null, allItems = []) {
    let key = getCardKey(card)
    if (!key) return null

    let store = loadStore()
    let prev = store[key] || {}

    let snapshot = Array.isArray(allItems) ? allItems.slice(0, 120).map(item => {
        let tlHash = computeTimelineHash(card, item)
        return {
            id: item.id,
            title: item.title || item.fname || '',
            path: item.path || '',
            url: item.url || '',
            season: Number(item.season || 0),
            episode: Number(item.episode || 0),
            timeline_hash: tlHash,
            duration: (item.timeline && item.timeline.duration) || 0
        }
    }) : (prev.files_snapshot || [])

    let lastFile = prev.last_file || null
    if (activeElement) {
        let tlHash = computeTimelineHash(card, activeElement)
        lastFile = {
            id: activeElement.id,
            title: activeElement.title || activeElement.fname || '',
            path: activeElement.path || '',
            url: activeElement.url || '',
            season: Number(activeElement.season || 0),
            episode: Number(activeElement.episode || 0),
            timeline_hash: tlHash,
            time: (activeElement.timeline && activeElement.timeline.time) || 0,
            duration: (activeElement.timeline && activeElement.timeline.duration) || 0,
            percent: (activeElement.timeline && activeElement.timeline.percent) || 0
        }
    }

    let mergedTorrent = Object.assign({}, prev.torrent || {}, torrentObj ? {
        Title: torrentObj.Title || torrentObj.title || (prev.torrent && prev.torrent.Title) || '',
        title: torrentObj.title || torrentObj.Title || (prev.torrent && prev.torrent.title) || '',
        MagnetUri: torrentObj.MagnetUri || torrentObj.Link || (prev.torrent && prev.torrent.MagnetUri) || '',
        Link: torrentObj.Link || torrentObj.MagnetUri || (prev.torrent && prev.torrent.Link) || '',
        num_quality_label: torrentObj.num_quality_label || (prev.torrent && prev.torrent.num_quality_label) || '',
        num_voice_label: torrentObj.num_voice_label || (prev.torrent && prev.torrent.num_voice_label) || ''
    } : {})

    store[key] = Object.assign({}, prev, {
        card_id: card.id,
        media_type: (card.name || card.first_air_date || card.number_of_seasons) ? 'tv' : 'movie',
        card_title: card.title || card.name || prev.card_title || '',
        original_title: card.original_title || card.original_name || prev.original_title || '',
        torrent_hash: serverHash || prev.torrent_hash || '',
        torrent: mergedTorrent,
        quality_label: mergedTorrent.num_quality_label || prev.quality_label || '',
        voice_label: mergedTorrent.num_voice_label || prev.voice_label || '',
        last_file: lastFile,
        files_snapshot: snapshot.length ? snapshot : (prev.files_snapshot || []),
        updated_at: Date.now()
    })

    saveStore(store)
    return store[key]
}

function formatCode(season, episode) {
    let s = String(season || 1).padStart(2, '0')
    let e = String(episode || 1).padStart(2, '0')
    return 'S' + s + 'E' + e
}

function formatRemainingOrTime(timeSec, durationSec) {
    let t = Number(timeSec || 0)
    let d = Number(durationSec || 0)
    if (d > t && d > 60) {
        let remMin = Math.max(1, Math.round((d - t) / 60))
        return 'остаток ' + remMin + ' мин'
    }
    if (t > 0) {
        return Utils.secondsToTime(t, true)
    }
    return ''
}

/**
 * Resolves the current Smart Resume state for a movie or series card.
 * Handles automatic episode progression: if SxxEyy is >= 92% watched, promotes SxxE(yy+1)!
 */
export function getSmartResumeState(card = {}) {
    let key = getCardKey(card)
    if (!key) return null

    let Timeline = getTimeline()
    let store = loadStore()
    let session = store[key]
    if (!session || !session.torrent) return null

    let isTv = session.media_type === 'tv' || Boolean(card.name || card.first_air_date || card.number_of_seasons)
    let badgeParts = [session.quality_label, session.voice_label].filter(Boolean)
    let badgeText = badgeParts.length ? badgeParts.join(' • ') : 'Торрент'

    let snapshot = Array.isArray(session.files_snapshot) ? session.files_snapshot : []

    if (isTv && snapshot.length > 0) {
        // Hydrate live Timeline percentages for each episode in snapshot
        let hydrated = snapshot.map((f, idx) => {
            let liveView = (f.timeline_hash && Timeline) ? Timeline.view(f.timeline_hash) : null
            let percent = liveView && typeof liveView.percent === 'number' ? liveView.percent : 0
            let time = liveView && typeof liveView.time === 'number' ? liveView.time : 0
            let duration = (liveView && liveView.duration) || f.duration || 0

            if (session.last_file && session.last_file.timeline_hash === f.timeline_hash) {
                if (!percent && session.last_file.percent) percent = session.last_file.percent
                if (!time && session.last_file.time) time = session.last_file.time
            }
            return Object.assign({}, f, {
                _idx: idx,
                percent: percent,
                time: time,
                duration: duration
            })
        })

        // Find the furthest episode with progress > 0, or fallback to last_file
        let lastWatchedIdx = -1
        for (let i = 0; i < hydrated.length; i++) {
            if (hydrated[i].percent > 0 || hydrated[i].time > 0) {
                lastWatchedIdx = i
            }
        }
        if (lastWatchedIdx === -1 && session.last_file) {
            lastWatchedIdx = hydrated.findIndex(f =>
                (session.last_file.id && f.id === session.last_file.id) ||
                (session.last_file.episode && f.episode === session.last_file.episode && f.season === session.last_file.season)
            )
        }
        if (lastWatchedIdx === -1) lastWatchedIdx = 0

        let currentEp = hydrated[lastWatchedIdx]
        if (currentEp && currentEp.percent >= COMPLETED_THRESHOLD_PERCENT) {
            // Auto-advance to next episode if available!
            if (lastWatchedIdx + 1 < hydrated.length) {
                let nextEp = hydrated[lastWatchedIdx + 1]
                let epCode = formatCode(nextEp.season || 1, nextEp.episode || (lastWatchedIdx + 2))
                return {
                    mode: 'next_episode',
                    is_tv: true,
                    season: nextEp.season || 1,
                    episode: nextEp.episode || (lastWatchedIdx + 2),
                    episode_code: epCode,
                    percent: nextEp.percent || 0,
                    time: nextEp.time || 0,
                    duration: nextEp.duration || 0,
                    title_text: 'След. серия ' + epCode,
                    meta_text: badgeText,
                    target_file: nextEp,
                    session: session
                }
            } else {
                // Series finale finished
                return null
            }
        }

        if (currentEp) {
            let epCode = formatCode(currentEp.season || 1, currentEp.episode || (lastWatchedIdx + 1))
            let remStr = formatRemainingOrTime(currentEp.time, currentEp.duration)
            return {
                mode: 'resume_episode',
                is_tv: true,
                season: currentEp.season || 1,
                episode: currentEp.episode || (lastWatchedIdx + 1),
                episode_code: epCode,
                percent: Math.max(4, currentEp.percent || 0),
                time: currentEp.time || 0,
                duration: currentEp.duration || 0,
                title_text: 'Продолжить ' + epCode + (remStr ? ' • ' + remStr : ''),
                meta_text: badgeText,
                target_file: currentEp,
                session: session
            }
        }
    }

    // Movie or single-file / pre-selected torrent
    let lf = session.last_file || (snapshot[0] || null)
    let defaultTlHash = computeTimelineHash(card, lf)
    let tlHash = (lf && lf.timeline_hash) || defaultTlHash
    let liveView = (tlHash && Timeline) ? Timeline.view(tlHash) : null

    let percent = (liveView && liveView.percent) || (lf && lf.percent) || 0
    let time = (liveView && liveView.time) || (lf && lf.time) || 0
    let duration = (liveView && liveView.duration) || (lf && lf.duration) || ((Number(card.runtime) || 0) * 60)

    if (percent >= COMPLETED_THRESHOLD_PERCENT) {
        return null
    }

    let remStr = formatRemainingOrTime(time, duration)
    let titleText = time > 0
        ? ('Продолжить • ' + remStr)
        : ('Продолжить просмотр')

    return {
        mode: 'resume_movie',
        is_tv: isTv,
        percent: Math.max(5, percent || 0),
        time: time,
        duration: duration,
        title_text: titleText,
        meta_text: badgeText,
        target_file: lf,
        session: session
    }
}

/**
 * Launches the saved torrent session in 1 click.
 */
export function resumeTorrentSession(card = {}, state = null, fallbackOpenTorrents = null) {
    let resolved = state || getSmartResumeState(card)
    if (!resolved || !resolved.session || !resolved.session.torrent) {
        if (typeof fallbackOpenTorrents === 'function') fallbackOpenTorrents()
        return false
    }

    let Timeline = getTimeline()
    let Torserver = getTorserver()
    let Player = getPlayer()
    let Noty = getNoty()

    let session = resolved.session
    let targetFile = resolved.target_file

    // Store auto-resume target hint so interaction/torrent.js can auto-focus or auto-play the exact episode
    window.__cubProAutoResumeTarget = {
        card_id: card.id,
        mode: resolved.mode,
        season: resolved.season,
        episode: resolved.episode,
        target_file: targetFile,
        timestamp: Date.now()
    }

    if (Noty) Noty.show('▶ ' + resolved.title_text + (resolved.meta_text ? ' [' + resolved.meta_text + ']' : ''))

    // If we have a direct TorrServer stream URL and active TorrServer hash, and it's a single movie or exact episode URL
    if (targetFile && targetFile.path && session.torrent_hash && Torserver && Torserver.url() && Timeline && Player) {
        let streamUrl = Torserver.stream(targetFile.path, session.torrent_hash, targetFile.id)
        let tlHash = computeTimelineHash(card, targetFile)
        let view = Timeline.view(tlHash)
        if (resolved.mode === 'next_episode' && view.percent >= COMPLETED_THRESHOLD_PERCENT) {
            view.percent = 0
            view.time = 0
        }

        let playElement = {
            title: (card.title || card.name || targetFile.title || '') + (resolved.episode_code ? ' (' + resolved.episode_code + ')' : ''),
            poster: card.img || (session.torrent && session.torrent.poster) || '',
            url: Torserver.toPlayUrl(streamUrl),
            timeline: view,
            card: card,
            season: resolved.season,
            episode: resolved.episode,
            torrent_hash: session.torrent_hash
        }

        // Build playlist from snapshot if series
        if (Array.isArray(session.files_snapshot) && session.files_snapshot.length > 1) {
            playElement.playlist = session.files_snapshot.map(f => {
                let fUrl = Torserver.toPlayUrl(Torserver.stream(f.path, session.torrent_hash, f.id))
                let fView = Timeline.view(computeTimelineHash(card, f))
                return {
                    title: f.title || (card.title || card.name || ''),
                    url: fUrl,
                    timeline: fView,
                    season: f.season,
                    episode: f.episode,
                    card: {
                        id: card.id,
                        imdb_id: card.imdb_id,
                        title: card.title || card.name,
                        original_name: card.original_name
                    }
                }
            })
        }

        Player.play(playElement)
        if (playElement.playlist) Player.playlist(playElement.playlist)
        return true
    }

    // Otherwise invoke Lampa.Torrent.start with the remembered torrent object
    if (window.Lampa && window.Lampa.Torrent) {
        let torrentObj = Object.assign({}, session.torrent, {
            poster: card.img || session.torrent.poster
        })
        if ( torrentObj.MagnetUri || torrentObj.Link ) {
            window.Lampa.Torrent.start(torrentObj, card)
            return true
        } else if (session.torrent_hash) {
            window.Lampa.Torrent.open(session.torrent_hash, card)
            return true
        }
    }

    if (typeof fallbackOpenTorrents === 'function') fallbackOpenTorrents()
    return false
}

export default {
    recordTorrentSelection,
    recordTorrentFileSession,
    getSmartResumeState,
    resumeTorrentSession,
    COMPLETED_THRESHOLD_PERCENT
}
