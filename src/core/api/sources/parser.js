import Storage from '../../storage/storage'
import Utils from '../../../utils/utils'
import Reguest from '../../../utils/reguest'
import Lang from '../../lang'
import Search from '../../../interaction/search/global'
import Activity from '../../../interaction/activity/activity'
import Torrent from '../../../interaction/torrent'
import Torserver from '../../../interaction/torserver'
import Platform from '../../platform'
import CardParser from '../../../interaction/card_parser/card_parser'
import CubPro from '../../cub_pro'

let network = new Reguest()

const TMDB_GENRE_ANIMATION = 16
const ANIME_LANGUAGES = ['ja', 'zh']

function isAnimeMovie(movie){
    return ANIME_LANGUAGES.includes(movie.original_language)
        && (movie.genres || []).some(g => g.id == TMDB_GENRE_ANIMATION)
}

function init(){
    Storage.set('parser_torrent_type', Storage.get('parser_torrent_type') || 'jackett')

    let source = {
        title: Lang.translate('title_parser'),
        search: (params, oncomplite)=>{
            get({
                search: decodeURIComponent(params.query),
                other: true,
                from_search: true
            },(json)=>{
                json.Results.sort((a,b)=>{
                    return (b.Seeders || 0) - (a.Seeders || 0)
                })
                
                json.title   = Lang.translate('title_parser')
                json.results = json.Results.slice(0,20)
                json.total   = json.Results.length
                json.total_pages = Math.ceil(json.total / 20)

                json.Results = null

                json.results.forEach((element)=>{
                    element.Title = Utils.shortText(element.Title,110)

                    element.params = {
                        createInstance: (item)=>new CardParser(item)
                    }
                })

                oncomplite(json.results.length ? [json] : [])
            },()=>{
                oncomplite([])
            })
        },
        onRecall: (data, last_query)=>{
            data[0].results.forEach((element) => {
                element.params = {
                    createInstance: (item)=>new CardParser(item)
                }
            })
        },
        onCancel: network.clear.bind(network),
        params: {
            lazy: true
        },
        onMore: (params, close)=>{
            close()

            Activity.push({
                url: '',
                title: Lang.translate('title_torrents'),
                component: 'torrents',
                search: params.query,
                from_search: true,
                page: 1
            })
        },
        onSelect: (params, close)=>{
            Torrent.start(params.element, {
                title: params.element.Title
            })

            Torrent.back(params.line.toggle.bind(params.line))
        }
    }

    function addSource(){
        let reg = Platform.is('android') ? true : Torserver.url()

        if(Storage.field('parse_in_search') && reg) Search.addSource(source)
    }

    Storage.listener.follow('change',(e)=>{
        if(e.name == 'parse_in_search' || e.name == 'torrserver_url' || e.name == 'torrserver_url_two' || e.name == 'torrserver_use_link'){
            Search.removeSource(source)

            addSource()
        }
    })

    addSource()
}

const BUILTIN_JACKETT_MIRRORS = [
    { url: 'https://jr.maxvol.pro', key: '1', rank: 2 },
    { url: 'http://jac.red', key: '1', rank: 3 }
]

let torrentsSwrMemory = {}
let inFlightSwrCallbacks = {}
const TORRENTS_FRESH_TTL_MS = 60 * 1000 // 60s fresh (no network needed)
const TORRENTS_STALE_TTL_MS = 24 * 60 * 60 * 1000 // 24h stale-while-revalidate

function parserLinks(type){
    if(type == 'jackett'){
        return [
            {url: Storage.field('jackett_url').replace('jacred.xyz','jac.red'), key: Storage.field('jackett_key'), rank: 0},
            {url: Storage.field('jackett_url_two').replace('jacred.xyz','jac.red'), key: Storage.field('jackett_key_two'), rank: 1}
        ]
    }
    else if(type == 'prowlarr'){
        return [
            {url: Storage.field('prowlarr_url'), key: Storage.field('prowlarr_key'), rank: 0},
            {url: Storage.field('prowlarr_url_two'), key: Storage.field('prowlarr_key_two'), rank: 1}
        ]
    }
    else return []
}

function selectParserLinks(type){
    let use   = Storage.field('parser_use_link') || 'one'
    let links = parserLinks(type)
    let selected = []

    if(use == 'one') selected = links[0] && links[0].url ? [links[0]] : []
    else if(use == 'two') selected = links[1] && links[1].url ? [links[1]] : []
    else selected = links.filter(l=>l && l.url)

    if(type == 'jackett'){
        let seenHosts = {}
        selected.forEach(l => {
            let clean = String(l.url || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase()
            if(clean) seenHosts[clean] = true
        })
        BUILTIN_JACKETT_MIRRORS.forEach(mirror => {
            let clean = mirror.url.replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase()
            if(!seenHosts[clean] && selected.length < 2){
                seenHosts[clean] = true
                selected.push(mirror)
            }
        })
    }

    return selected
}

function extractInfoHash(uri = ''){
    if(!uri) return ''
    let m = String(uri).match(/xt=urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i)
    return m ? m[1].toLowerCase() : ''
}

function resultKey(item){
    let btih = item._btih || extractInfoHash(item.MagnetUri || item.downloadUrl || item.Link || '')
    if(btih){
        item._btih = btih
        return 'btih:' + btih
    }

    if(item.MagnetUri) return 'm:' + item.MagnetUri
    if(item.downloadUrl) return 'm:' + item.downloadUrl

    let size    = item.Size || item.size || ''
    let tracker = item.Tracker || ''
    let hash    = item.hash || Utils.hash((item.Title || '') + size + tracker)

    return 'h:' + hash + '|' + size + '|' + tracker
}

function fuseDuplicateTorrent(primary, secondary){
    if(!primary || !secondary) return primary || secondary
    let fused = Object.assign({}, primary)
    if(!fused._btih && secondary._btih) fused._btih = secondary._btih
    fused.Seeders = Math.max(Number(primary.Seeders || 0), Number(secondary.Seeders || 0))
    fused.Peers   = Math.max(Number(primary.Peers || 0), Number(secondary.Peers || 0))
    if(!fused.ffprobe && secondary.ffprobe) fused.ffprobe = secondary.ffprobe
    if(!fused.languages && secondary.languages) fused.languages = secondary.languages
    if(secondary.info){
        fused.info = fused.info || {}
        if(!fused.info.videotype && secondary.info.videotype) fused.info.videotype = secondary.info.videotype
        if(Array.isArray(secondary.info.voices)){
            fused.info.voices = fused.info.voices || []
            secondary.info.voices.forEach(v => {
                if(fused.info.voices.indexOf(v) === -1) fused.info.voices.push(v)
            })
        }
    }
    return fused
}

function mergeResults(items){
    let map = new Map()

    items.forEach(item=>{
        let key  = resultKey(item)
        let prev = map.get(key)

        if(!prev) map.set(key, item)
        else{
            let prev_rank = typeof prev.source_rank == 'number' ? prev.source_rank : 0
            let next_rank = typeof item.source_rank == 'number' ? item.source_rank : 0

            if(next_rank < prev_rank) {
                map.set(key, fuseDuplicateTorrent(item, prev))
            }
            else if(prev_rank < next_rank) {
                map.set(key, fuseDuplicateTorrent(prev, item))
            }
            else {
                let prev_seeds = Number(prev.Seeders || 0)
                let next_seeds = Number(item.Seeders || 0)
                if(next_seeds > prev_seeds) map.set(key, fuseDuplicateTorrent(item, prev))
                else map.set(key, fuseDuplicateTorrent(prev, item))
            }
        }
    })

    return Array.from(map.values())
}

function buildSwrKey(params = {}){
    let movieId = params.movie && params.movie.id ? (params.movie.id + ':' + (params.movie.number_of_seasons || params.movie.original_name ? 'tv' : 'movie')) : 'search'
    let query   = String(params.search || (params.movie && (params.movie.title || params.movie.name)) || '').toLowerCase().trim()
    let clar    = params.clarification ? '1' : '0'
    let glob    = params.global ? '1' : '0'
    return movieId + '|' + query + '|' + clar + '|' + glob
}

function cloneTorrentResults(list = []){
    return (list || []).map(item => {
        let copy = Object.assign({}, item)
        copy.viewed = viewed(copy.hash)
        if(item.info) copy.info = Object.assign({}, item.info, { voices: Array.isArray(item.info.voices) ? item.info.voices.slice() : [] })
        return copy
    })
}

function runFastMirrorPool(calls, onSuccess, onFail){
    if(calls.length === 1){
        calls[0](onSuccess, onFail)
        return
    }

    let results = new Array(calls.length)
    let pending = calls.length
    let settled = false
    let graceTimer = null
    let firstError = null

    function finishNow(){
        if(settled) return
        settled = true
        if(graceTimer) clearTimeout(graceTimer)

        let allItems = []
        let hasAny = false
        for(let i = 0; i < results.length; i++){
            if(results[i] && Array.isArray(results[i].Results)){
                hasAny = true
                allItems = allItems.concat(results[i].Results)
            }
        }

        if(hasAny){
            onSuccess({ Results: mergeResults(allItems) })
        } else {
            onFail(firstError || '')
        }
    }

    calls.forEach((call, index)=>{
        call((json)=>{
            results[index] = json
            pending--

            if(pending === 0){
                finishNow()
            } else if(!graceTimer && json && Array.isArray(json.Results) && json.Results.length > 0){
                // Fastest mirror succeeded with results: give slower mirror 220ms to merge, never block for 15s
                graceTimer = setTimeout(finishNow, 220)
            }
        },(e)=>{
            results[index] = null
            firstError = firstError || e
            pending--

            if(pending === 0){
                finishNow()
            }
        })
    })
}

function get(params = {}, oncomplite, onerror){
    let swrKey = buildSwrKey(params)
    let now = Date.now()
    let cachedEntry = torrentsSwrMemory[swrKey]

    let numPreIndexed = (!params.from_search && params.movie)
        ? CubPro.getNumTorrentsForCard(params.movie).map(item => {
            item.viewed = viewed(item.hash)
            return item
        })
        : []

    function finalizeResults(rawList){
        let combined = numPreIndexed.length ? mergeResults(numPreIndexed.concat(rawList || [])) : mergeResults(rawList || [])
        let cleaned = combined.filter(item => !CubPro.isJunkTorrent(item.Title || item.title || ''))
        let finalItems = cleaned.length ? cleaned : combined

        finalItems.forEach(item => {
            let q = CubPro.classifyTorrentQuality(item.Title || '', item.num_quality_code, item.info, item.ffprobe)
            item.num_quality_code = q.code
            item.num_quality_label = q.label

            if (!item.num_voice_label) {
                let v = CubPro.classifyTorrentVoice(item.Title || '', item.num_voice_code)
                item.num_voice_code = v.code
                item.num_voice_label = v.studios[0] || v.tierLabel || ''
                if (item.info && Array.isArray(item.info.voices)) {
                    v.studios.forEach(s => {
                        if (item.info.voices.indexOf(s) === -1) item.info.voices.push(s)
                    })
                } else if (v.studios.length) {
                    item.info = item.info || {}
                    item.info.voices = v.studios.slice()
                }
            }
        })

        return finalItems
    }

    let servedFromCache = false
    if(cachedEntry && Array.isArray(cachedEntry.items) && cachedEntry.items.length > 0 && !params.force_refresh){
        let age = now - (cachedEntry.time || 0)
        if(age < TORRENTS_FRESH_TTL_MS){
            oncomplite({
                Results: cloneTorrentResults(cachedEntry.items),
                from_cache: true,
                revalidating: false
            })
            return
        }
        if(age < TORRENTS_STALE_TTL_MS){
            servedFromCache = true
            oncomplite({
                Results: cloneTorrentResults(cachedEntry.items),
                from_cache: true,
                revalidating: true
            })
        }
    }

    // Если спекулятивный prefetch уже летит по этому же ключу — присоединяемся к нему без дублирования запросов
    if(!servedFromCache && inFlightSwrCallbacks[swrKey]){
        inFlightSwrCallbacks[swrKey].push({ oncomplite, onerror })
        return
    }
    if(!servedFromCache){
        inFlightSwrCallbacks[swrKey] = [{ oncomplite, onerror }]
    }

    function complite(data){
        let list = (data && Array.isArray(data.Results)) ? data.Results : []
        let finalItems = finalizeResults(list)

        if(finalItems.length > 0){
            torrentsSwrMemory[swrKey] = {
                time: Date.now(),
                items: cloneTorrentResults(finalItems)
            }
        }

        if(servedFromCache){
            if(typeof params.onRevalidate === 'function'){
                params.onRevalidate({
                    Results: cloneTorrentResults(finalItems),
                    revalidated_at: Date.now()
                })
            }
        } else {
            let waiters = inFlightSwrCallbacks[swrKey] || [{ oncomplite }]
            delete inFlightSwrCallbacks[swrKey]
            waiters.forEach(w => {
                if(w && typeof w.oncomplite === 'function'){
                    w.oncomplite({ Results: cloneTorrentResults(finalItems) })
                }
            })
        }
    }

    function error(e){
        if(servedFromCache) return
        let waiters = inFlightSwrCallbacks[swrKey] || [{ oncomplite, onerror }]
        delete inFlightSwrCallbacks[swrKey]

        if (numPreIndexed.length) {
            let fallbackItems = finalizeResults([])
            torrentsSwrMemory[swrKey] = {
                time: Date.now(),
                items: cloneTorrentResults(fallbackItems)
            }
            waiters.forEach(w => {
                if(w && typeof w.oncomplite === 'function'){
                    w.oncomplite({ Results: cloneTorrentResults(fallbackItems) })
                }
            })
            return
        }
        if (Storage.field('parser_torrent_type') !== 'torrserver' && !params.__ts_fallback_tried) {
            let torr_link = Storage.field(Storage.field('torrserver_use_link') == 'two' ? 'torrserver_url_two' : 'torrserver_url')
            if (torr_link) {
                params.__ts_fallback_tried = true
                inFlightSwrCallbacks[swrKey] = waiters
                torrserver(params, Utils.checkEmptyUrl(torr_link), complite, () => {
                    delete inFlightSwrCallbacks[swrKey]
                    waiters.forEach(w => w && w.onerror && w.onerror(e))
                })
                return
            }
        }
        waiters.forEach(w => w && w.onerror && w.onerror(e))
    }

    if(Storage.field('parser_torrent_type') == 'jackett'){
        let links = selectParserLinks('jackett')

        if(links.length){
            let calls = links.map(link=>{
                return (done, fail)=>{
                    let base = Utils.checkEmptyUrl(link.url)
                    jackett(params, base, link.key, link.rank, done, fail)
                }
            })

            runFastMirrorPool(calls, complite, error)
        }
        else{
            error(Lang.translate('torrent_parser_set_link') + ': Jackett')
        }
    } 
    else if(Storage.field('parser_torrent_type') == 'prowlarr'){
        let links = selectParserLinks('prowlarr')

        if(links.length){
            let calls = links.map(link=>{
                return (done, fail)=>{
                    let base = Utils.checkEmptyUrl(link.url)
                    prowlarr(params, base, link.key, link.rank, done, fail)
                }
            })

            runFastMirrorPool(calls, complite, error)
        } 
        else {
            error(Lang.translate('torrent_parser_set_link') + ': Prowlarr')
        }
    } 
    else if(Storage.field('parser_torrent_type') == 'torrserver'){
        let torr_link = Storage.field(Storage.field('torrserver_use_link') == 'two' ? 'torrserver_url_two' : 'torrserver_url')

        if(torr_link){
            torrserver(params, Utils.checkEmptyUrl(torr_link), complite, error)
        } else {
            error(Lang.translate('torrent_parser_set_link') + ': TorrServer')
        }
    }
}

function prefetch(movie){
    if(!movie || !movie.id) return
    let searchTitle = movie.title || movie.name || movie.original_title || movie.original_name || ''
    if(!searchTitle) return
    let params = {
        movie: movie,
        search: searchTitle
    }
    let swrKey = buildSwrKey(params)
    let cached = torrentsSwrMemory[swrKey]
    if(cached && (Date.now() - (cached.time || 0)) < TORRENTS_FRESH_TTL_MS) return

    get(params, ()=>{}, ()=>{})
}

function viewed(hash){
    let view  = Storage.cache('torrents_view', 5000, [])

    return view.indexOf(hash) > -1
}

function jackett(params = {}, base_url, api_key, source_rank, oncomplite, onerror){
    network.timeout(1000 * Storage.field('parse_timeout'))

    let u = base_url + '/api/v2.0/indexers/'+(Storage.field('jackett_interview') == 'healthy' ? 'status:healthy' : 'all')+'/results?apikey='+(api_key || '')+'&Query='+encodeURIComponent(params.search)

    if(!params.from_search){
        let genres = params.movie.genres.map((a)=>{
            return a.name
        })

        if(!params.clarification){
            u = Utils.addUrlComponent(u,'title='+encodeURIComponent(params.movie.title))
            u = Utils.addUrlComponent(u,'title_original='+encodeURIComponent(params.movie.original_title))
        }

        u = Utils.addUrlComponent(u,'year='+encodeURIComponent(((params.movie.first_air_date || params.movie.release_date || '0000') + '').slice(0,4)))
        u = Utils.addUrlComponent(u,'is_serial='+(params.movie.original_name ? '2' : params.other ? '0' : '1'))
        u = Utils.addUrlComponent(u,'genres='+encodeURIComponent(genres.join(',')))
        if(!params.global) u = Utils.addUrlComponent(u, 'Category[]=' + (params.movie.number_of_seasons > 0 ? 5000 : 2000) + (isAnimeMovie(params.movie) ? ',5070' : ''))
    }

    network.native(u,(json)=>{
        if(json.Results){
            let checked_at = Date.now()
            json.Results.forEach(element => {
                element.PublisTime  = Utils.strToTime(element.PublishDate)
                element.hash        = Utils.hash(element.Title)
                element.viewed      = viewed(element.hash)
                element.size        = Utils.bytesToSize(element.Size)
                element.checked_at  = checked_at
                element.source_rank = source_rank
            })

            oncomplite(json)
        }
        else onerror(Lang.translate('torrent_parser_no_responce') + ' (' + base_url + ')')
    },(a,c)=>{
        onerror(Lang.translate('torrent_parser_no_responce') + ' (' + base_url + ')')
    })
}

// доки https://wiki.servarr.com/en/prowlarr/search#search-feed
function prowlarr(params = {}, base_url, api_key, source_rank, oncomplite, onerror){
    
    let q = []

    q.push({name: 'apikey', value: api_key || ''})
    q.push({name: 'query', value: params.search})

    if(!params.from_search){
        const isSerial = !!(params.movie.original_name);

        if(!params.global){
            const baseCategory = params.movie.number_of_seasons > 0 ? '5000' : '2000'
            q.push({name: 'categories', value: baseCategory})
            if(isAnimeMovie(params.movie)) q.push({name: 'categories', value: '5070'})
        }
        q.push({name: 'type', value: isSerial ? 'tvsearch' : 'search'})
    }

    let u = Utils.buildUrl(base_url, '/api/v1/search', q)

    network.timeout(1000 * Storage.field('parse_timeout'));
    network.native(u,(json)=> {
        if(Array.isArray(json)) {
            let checked_at = Date.now()
            oncomplite({
                Results: json
                    .filter((e) => e.protocol === 'torrent')
                    .map((e) => {
                        const hash = Utils.hash(e.title);
						const timeValue = Utils.strToTime(e.publishDate);

                        return {
                            Title: e.title,
                            Tracker: e.indexer,
                            Size: e.size,
                            PublishDate: Utils.strToTime(e.publishDate),
							PublisTime: timeValue,
                            Seeders: parseInt(e.seeders),
                            Peers: parseInt(e.leechers),
                            MagnetUri: e.downloadUrl,
                            viewed: viewed(hash),
                            checked_at,
                            source_rank,
                            hash
                        }
                    })
            })
        } else {
            onerror(Lang.translate('torrent_parser_request_error') + ' (' + JSON.stringify(json) + ')')
        }
    },
        ()=>{
        onerror(Lang.translate('torrent_parser_no_responce') + ' (' + base_url + ')')
    })
}

// TorrServer exposes two search backends:
//   /search/?query=...         — built-in rutor scraper (no setup).
//   /torznab/search/?query=... — Torznab indexer(s) configured inside TorrServer
//                                (EnableTorznabSearch + TorznabUrls). Same JSON
//                                shape (models.TorrentDetails) as /search/.
// `torrserver_search_type`: 'rutor' | 'torznab' | 'both' (default 'both').
function normalizeTorrServerSize(size){
    if(!size) return ''

    return String(size)
        .replace(/\s*GCiB\b/gi, ' GB')
        .replace(/\s*MCiB\b/gi, ' MB')
        .replace(/\s*KCiB\b/gi, ' KB')
}

function torrserver(params = {}, base_url, oncomplite, onerror){
    network.timeout(1000 * Storage.field('parse_timeout'));

    let mode = Storage.field('torrserver_search_type') || 'both'

    function mapResult(e, source_rank){
        const hash = Utils.hash(e.Title);
		const timeValue = Utils.strToTime(e.CreateDate);

        // Some torznab indexers expose only a .torrent download URL via `Link`
        // and no magnet. If the link itself is a magnet URI, fall back to it.
        let magnet = e.Magnet || (/^magnet:/i.test(e.Link || '') ? e.Link : '')

        return {
            Title: e.Title,
            Tracker: e.Tracker,
            size: normalizeTorrServerSize(e.Size),
            Size: Utils.sizeToBytes(normalizeTorrServerSize(e.Size)),
            PublishDate: Utils.strToTime(e.CreateDate),
			PublisTime: timeValue,
            Seeders: parseInt(e.Seed),
            Peers: parseInt(e.Peer),
            MagnetUri: magnet,
            Link: e.Link,
            viewed: viewed(hash),
            CategoryDesc: e.Categories,
            checked_at: Date.now(),
            source_rank,
            hash
        }
    }

    function callSearch(path, done, fail){
        let u = Utils.buildUrl(base_url, path, [{name: 'query', value: params.search}])

        network.native(u,(json)=>{
            if(Array.isArray(json)) done(json)
            else fail(Lang.translate('torrent_parser_request_error') + ' (' + path + ')')
        },()=>{
            fail(Lang.translate('torrent_parser_no_responce') + ' (' + base_url + path + ')')
        })
    }

    let calls = []
    if(mode == 'rutor' || mode == 'both')   calls.push({path: '/search/',         rank: 0})
    if(mode == 'torznab' || mode == 'both') calls.push({path: '/torznab/search/', rank: 1})

    function runCall(spec, ondone, onfail){
        callSearch(spec.path, (json)=>{
            ondone(json.map((e)=>mapResult(e, spec.rank)))
        }, onfail)
    }

    if(calls.length == 1){
        runCall(calls[0], (items)=>oncomplite({Results: items}), onerror)
        return
    }

    let results = []
    let pending = calls.length
    let success = false
    let first_error

    calls.forEach((spec, index)=>{
        runCall(spec, (items)=>{
            results[index] = items
            success = true

            if(--pending == 0){
                let merged = mergeResults([].concat(...results.filter(Boolean)))
                oncomplite({Results: merged})
            }
        },(err)=>{
            results[index] = null
            first_error = first_error || err

            if(--pending == 0){
                if(success){
                    let merged = mergeResults([].concat(...results.filter(Boolean)))
                    oncomplite({Results: merged})
                }
                else onerror(first_error || '')
            }
        })
    })
}

function clear(){
    network.clear()
}

export default {
    init,
    get,
    prefetch,
    jackett,
    clear
}
