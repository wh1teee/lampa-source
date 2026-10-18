import Controller from '../core/controller'
import Reguest from '../utils/reguest'
import Scroll from '../interaction/scroll'
import Activity from '../interaction/activity/activity'
import Arrays from '../utils/arrays'
import Template from '../interaction/template'
import Utils from '../utils/utils'
import Filter from '../interaction/filter'
import Storage from '../core/storage/storage'
import Empty from '../interaction/empty/empty'
import Torrent from '../interaction/torrent'
import Modal from '../interaction/modal'
import Background from '../interaction/background'
import Select from '../interaction/select'
import Torserver from '../interaction/torserver'
import Noty from '../interaction/noty'
import Parser from '../core/api/sources/parser'
import Lang from '../core/lang'
import TMDB from '../core/tmdb/tmdb'
import Explorer from '../interaction/explorer'
import Layer from '../core/layer'
import WatchedHistory from '../interaction/watched_history'
import Listener from './torrents/listener'
import TitleParser from './torrents/parser'

import voices from './torrents/voices'
import filter_langs from './torrents/lang'
import CubPro from '../core/cub_pro'


/**
 * Компонент "Torrents"
 * @param {*} object 
 */
function component(object){
    Arrays.extend(object, {
        movie: {
            title: object.search,
            original_title: object.search
        },
        params: {
            noinfo: object.from_search ? true : false
        }
    })

    let network = new Reguest()
    let scroll  = new Scroll({mask:true,over: true})
    let files   = new Explorer(object)
    let history = new WatchedHistory(object.movie)
    let filter
    let results = []
    let filtred = []
    let listener

    let total_pages = 1
    let count       = 0
    let last
    let last_filter
    let initialized
    let active_quick_chip = 'all'

    function prepareTorrentItems(list){
        if(!Array.isArray(list)) return
        list.forEach(element => {
            element.general = TitleParser.general((element.Title || '').toLowerCase())
            let qInfo = CubPro.classifyTorrentQuality(element.Title || '', element.num_quality_code, element.info, element.ffprobe)
            let vInfo = CubPro.classifyTorrentVoice(element.Title || '', element.num_voice_code)
            element._qInfo = qInfo
            element._vInfo = vInfo
            if(!element.num_quality_code) element.num_quality_code = qInfo.code
            if(!element.num_quality_label && qInfo.label) element.num_quality_label = qInfo.label
        })
    }

    function matchesQuickChip(element, chipId){
        if(!chipId || chipId === 'all') return true
        let q = element._qInfo || CubPro.classifyTorrentQuality(element.Title || '', element.num_quality_code, element.info, element.ffprobe)
        let v = element._vInfo || CubPro.classifyTorrentVoice(element.Title || '', element.num_voice_code)
        let general = element.general || {}
        if(chipId === '4k') return q.code >= 300
        if(chipId === 'hdr_dv') return Boolean(q.isDv || q.isHdr || general.hdr)
        if(chipId === '1080p') return q.code >= 100 && q.code < 300
        if(chipId === 'dub'){
            if(v.code === 1) return true
            let voicesArr = element.info && Array.isArray(element.info.voices) ? element.info.voices : []
            if(voicesArr.some(vn => /дубл|dub/i.test(vn))) return true
            return /дублирован|дубляж|\bdub\b|[,|\s]дб[,|\s|$]/i.test(element.Title || '')
        }
        return true
    }

    let filter_items = {
        quality: [Lang.translate('torrent_parser_any_one'),'4k','1080p','720p'],
        hdr: [Lang.translate('torrent_parser_no_choice'),Lang.translate('torrent_parser_yes'),Lang.translate('torrent_parser_no')],
        dv: [Lang.translate('torrent_parser_no_choice'), 'Dolby Vision', 'Dolby Vision TV', Lang.translate('torrent_parser_no')],
        sub: [Lang.translate('torrent_parser_no_choice'),Lang.translate('torrent_parser_yes'),Lang.translate('torrent_parser_no')],
        voice: [],
        tracker: [Lang.translate('torrent_parser_any_two')],
        year: [Lang.translate('torrent_parser_any_two')],
        lang: [Lang.translate('torrent_parser_any_two')],
        _3d: [Lang.translate('torrent_parser_no_choice'),Lang.translate('torrent_parser_yes'),Lang.translate('torrent_parser_no')]
    }

    let filter_translate = {
        quality: Lang.translate('torrent_parser_quality'),
        hdr: 'HDR',
        dv: 'Dolby Vision',
        sub: Lang.translate('torrent_parser_subs'),
        voice: Lang.translate('torrent_parser_voice'),
        tracker: Lang.translate('torrent_parser_tracker'),
        year: Lang.translate('torrent_parser_year'),
        season: Lang.translate('torrent_parser_season'),
        lang:  Lang.translate('title_language_short'),
        _3d: '3D'
    }

    let filter_multiple = ['quality','voice','tracker','season','lang']

    let sort_translate = {
        popular: Lang.translate('title_popular'),
        quality: 'По качеству (4K → SD)',
        Seeders: Lang.translate('torrent_parser_sort_by_seeders'),
        Size: Lang.translate('torrent_parser_sort_by_size'),
        Title: Lang.translate('torrent_parser_sort_by_name'),
        Tracker:Lang.translate('torrent_parser_sort_by_tracker'),
        PublisTime: Lang.translate('torrent_parser_sort_by_date'),
        viewed: Lang.translate('torrent_parser_sort_by_viewed')
    }

    let i = 20,
        y = (new Date()).getFullYear()

    while (i--) {
        filter_items.year.push((y - (19 - i)) + '')
    }

    let finded_seasons      = []
    let finded_seasons_full = []

    filter_items.lang = filter_items.lang.concat(filter_langs.map(a=>Lang.translate(a.title)))
    
    scroll.minus(files.render().find('.explorer__files-head'))

    scroll.body().addClass('torrent-list')

    if(object.from_search) object.movie.original_title = ''

    this.create = function(){
        return this.render()
    }

    this.initialize = function(){
        this.activity.loader(true)

        if((object.movie.original_language == 'ja' || object.movie.original_language == 'zh') && object.movie.genres.find(g=>g.id == 16) && Storage.field('language') !== 'en'){
            network.silent(TMDB.api((object.movie.name ? 'tv' : 'movie') + '/' + object.movie.id + '?api_key=' + TMDB.key() + '&language=en' ),(result)=>{
                object.search_two = result.name || result.title

                this.parse()
            },this.parse.bind(this))
        }
        else{
            this.parse()
        }

        scroll.onEnd = this.next.bind(this)

        listener = new Listener(object.movie)
        
        listener.listener.follow('open',(e)=>{
            if(object.movie.original_name){
                history.set({
                    balanser_name: 'Torrent',
                    season: e.element.season,
                    episode: e.element.episode
                })
            }
            else{
                history.set({
                    balanser_name: 'Torrent'
                })
            }
        })

        return this.render()
    }

    this.parse = function(){
        filter = new Filter(object)

        object.onRevalidate = (freshData)=>{
            if(!results || !freshData || !Array.isArray(freshData.Results)) return
            prepareTorrentItems(freshData.Results)

            // Бесшовное обновление сидов/пиров в уже отрендеренном списке без сброса фокуса
            let root = scroll.render()
            freshData.Results.forEach(freshItem => {
                let selector = freshItem._btih ? '[data-btih="'+freshItem._btih+'"]' : '[data-thash="'+freshItem.hash+'"]'
                let domNode  = root.find('.torrent-item' + selector)
                if(domNode.length){
                    if(!isNaN(freshItem.Seeders)) domNode.find('.torrent-item__seeds span').text(freshItem.Seeders)
                    if(!isNaN(freshItem.Peers))   domNode.find('.torrent-item__grabs span').text(freshItem.Peers)
                }
            })

            // Также обновляем данные в памяти для последующих фильтраций/сортировок
            let oldCount = results.Results ? results.Results.length : 0
            results = freshData
            let need = Storage.get('torrents_sort','popular')
            this.sortResults(need)
            this.renderQuickChips()
            if(freshData.Results.length > oldCount && oldCount === 0){
                this.applyFilter()
            }
        }

        Parser.get(object,(data)=>{
            results = data

            prepareTorrentItems(results.Results)

            this.build()

            Layer.update(scroll.render(true))

            this.activity.loader(false)

            this.activity.toggle()
        },(text)=>{
            this.empty(Lang.translate('torrent_error_connect') + ': ' + text)
        })

        filter.onSearch = (value, extra = {})=>{
            Activity.replace({
                search: value,
                clarification: true,
				global: extra.global
            })
        }

        filter.onBack = ()=>{
            this.start()
        }

        filter.render().find('.selector').on('hover:focus',(e)=>{
            last_filter = e.target
        })

        filter.addButtonBack()

        files.appendHead(filter.render())
    }

    this.renderQuickChips = function(){
        if(!filter || !results || !Array.isArray(results.Results) || !results.Results.length) return
        let head = files.render().find('.explorer__files-head')
        if(!head.length) return

        head.find('.torrent-quick-filters').remove()

        let list = results.Results
        let chips = [
            { id: 'all',    title: 'Все',     count: list.length },
            { id: '4k',     title: '4K UHD',  count: list.filter(e => matchesQuickChip(e, '4k')).length },
            { id: 'hdr_dv', title: 'DV / HDR',count: list.filter(e => matchesQuickChip(e, 'hdr_dv')).length },
            { id: '1080p',  title: '1080p',   count: list.filter(e => matchesQuickChip(e, '1080p')).length },
            { id: 'dub',    title: 'Дубляж',  count: list.filter(e => matchesQuickChip(e, 'dub')).length }
        ].filter(c => c.id === 'all' || c.count > 0)

        if(chips.length <= 1) return

        let container = $('<div class="torrent-quick-filters"></div>')

        chips.forEach(chip => {
            let btn = $('<div class="simple-button torrent-quick-chip selector' + (active_quick_chip === chip.id ? ' active' : '') + '" data-chip="' + chip.id + '"><span>' + chip.title + '</span><b>' + chip.count + '</b></div>')

            btn.on('hover:focus', (e)=>{
                last_filter = e.target
            }).on('hover:enter', ()=>{
                active_quick_chip = (active_quick_chip === chip.id && chip.id !== 'all') ? 'all' : chip.id
                container.find('.torrent-quick-chip').removeClass('active')
                container.find('[data-chip="' + active_quick_chip + '"]').addClass('active')

                this.filtred()
                this.reset()
                this.showResults()

                Controller.collectionSet(scroll.render(), files.render(true))
                let targetChip = container.find('[data-chip="' + active_quick_chip + '"]')[0]
                if(targetChip) Navigator.focused(targetChip)
            })

            container.append(btn)
        })

        head.append(container)
        scroll.minus(head)
    }

    this.empty = function(descr, add_button){
        let em_params = {
            descr: descr,
        }

        if(add_button){
            em_params.buttons = [
                {
                    title: Lang.translate('filter_clarify'),
                    onEnter: ()=>{
                        filter.render().find('.filter--search').trigger('hover:enter')
                    }
                }
            ]
        }

        let empty = new Empty(em_params)

        files.render().find('.explorer__files-head').addClass('hide')

        files.appendFiles(empty.render(filter.empty()))

        scroll.body().removeClass('torrent-list')

        this.start = empty.start.bind(empty)

        this.activity.loader(false)

        this.activity.toggle()
    }

    this.listEmpty = function(){
        let em = Template.get('empty_filter')
        let bn = $('<div class="simple-button selector"><span>'+Lang.translate('filter_clarify')+'</span></div>')

        bn.on('hover:enter',()=>{
            filter.render().find('.filter--filter').trigger('hover:enter')
        })

        em.find('.empty-filter__subtitle').text(Lang.translate('empty_text'))
        em.find('.empty-filter__title').remove()
        em.find('.empty-filter__buttons').removeClass('hide').append(bn)

        scroll.body().removeClass('torrent-list')

        scroll.append(em)
    }

    this.buildSorted = function(){
        let need   = Storage.get('torrents_sort','popular')
        let select = [
            {
                title: Lang.translate('title_popular'),
                sort: 'popular'
            },
            {
                title: 'По качеству (4K → SD)',
                sort: 'quality'
            },
            {
                title: Lang.translate('torrent_parser_sort_by_seeders'),
                sort: 'Seeders'
            },
            {
                title: Lang.translate('torrent_parser_sort_by_size'),
                sort: 'Size'
            },
            {
                title: Lang.translate('torrent_parser_sort_by_name'),
                sort: 'Title'
            },
            {
                title: Lang.translate('torrent_parser_sort_by_tracker'),
                sort: 'Tracker'
            },
            {
                title: Lang.translate('torrent_parser_sort_by_date'),
                sort: 'PublisTime'
            },
            {
                title: Lang.translate('torrent_parser_sort_by_viewed'),
                sort: 'viewed'
            }
        ]

        select.forEach(element => {
            if(element.sort == need) element.selected = true
        });

        this.sortResults(need)

        filter.set('sort', select)

        this.selectedSort()
    }

    this.sortResults = function(need){
        if(object.movie.number_of_seasons && need == 'popular'){
            results.Results.sort((a, b) => {
                let s_a = parseInt(String(a.general.season).split('-').pop())
                let s_b = parseInt(String(b.general.season).split('-').pop())
                let e_a = a.general.episodes ? parseInt(String(a.general.episodes).split('-').pop()) : 0
                let e_b = b.general.episodes ? parseInt(String(b.general.episodes).split('-').pop()) : 0

                return (
                    s_b - s_a ||
                    e_b - e_a ||
                    b.Seeders - a.Seeders
                )
            })
        }
        else if(need == 'quality'){
            results.Results.sort((a, b) => {
                let qa = a.num_quality_code || (a._qInfo && a._qInfo.code) || 0
                let qb = b.num_quality_code || (b._qInfo && b._qInfo.code) || 0
                return (qb - qa) || ((b.Seeders || 0) - (a.Seeders || 0)) || ((b.Size || 0) - (a.Size || 0))
            })
        }
        else if(need == 'popular') filter.sort(results.Results, 'Seeders')
        else filter.sort(results.Results, need)

        this.sortWithViewed(need)
    }

    this.sortWithViewed = function(need){
        let popular      = []
        let num_verified = []
        let other        = []

        results.Results.forEach((a)=>{
            if(a.viewed) popular.push(a)
            else if((!need || need === 'popular') && a.source_rank === -1) num_verified.push(a)
            else other.push(a)
        })

        popular.sort((a,b)=>b.Seeders - a.Seeders)
        if(num_verified.length){
            num_verified.sort((a,b)=>(b.num_quality_code || 0) - (a.num_quality_code || 0) || b.Seeders - a.Seeders)
        }

        results.Results = popular.concat(num_verified).concat(other)
    }

    this.cardID = function(){
        return object.movie.id + ':' + (object.movie.number_of_seasons ? 'tv' : 'movie')
    }

    this.getFilterData = function(){
        let all = Storage.cache('torrents_filter_data',500,{})
        let cid = this.cardID()

        if(all[cid]) return Arrays.clone(all[cid])

        // Глобальный фоллбэк переносит только универсальные предпочтения (качество/язык),
        // чтобы специфичные для другого фильма сезон/трекер/год/студия не создавали пустой экран
        let shared = Storage.get('torrents_filter','{}')
        let safe   = {}
        if(shared && typeof shared === 'object'){
            if(shared.quality) safe.quality = Arrays.clone(shared.quality)
            if(shared.lang)    safe.lang    = Arrays.clone(shared.lang)
        }
        return safe
    }

    this.setFilterData = function(filter){
        let all = Storage.cache('torrents_filter_data',500,{})
        let cid = this.cardID()

        all[cid] = filter

        Storage.set('torrents_filter_data',all)

        let shared = {}
        if(filter && typeof filter === 'object'){
            if(filter.quality) shared.quality = filter.quality
            if(filter.lang)    shared.lang    = filter.lang
        }
        Storage.set('torrents_filter',shared)
    }

    this.buildFilterd = function(){
        let need     = this.getFilterData()
        let select   = []

        let add = (type, title)=>{
            let items    = filter_items[type]
            let subitems = []
            let multiple = filter_multiple.indexOf(type) >= 0
            let value    = need[type]

            if(multiple) value = Arrays.toArray(value)

            items.forEach((name, i) => {
                subitems.push({
                    title: name,
                    //selected: multiple ? i == 0 : value == i,
                    checked: multiple && value.indexOf(name) >= 0,
                    checkbox: multiple && i > 0,
                    noselect: true,
                    index: i
                })
            })

            select.push({
                title: title,
                subtitle: multiple ? (value.length ? value.join(', ') : items[0]) : (typeof value == 'undefined' ? items[0] : items[value]),
                items: subitems,
                noselect: true,
                stype: type
            })
        }

        filter_items.voice   = [Lang.translate('torrent_parser_any_two'),Lang.translate('torrent_parser_voice_dubbing'),Lang.translate('torrent_parser_voice_polyphonic'),Lang.translate('torrent_parser_voice_two'),Lang.translate('torrent_parser_voice_amateur')]
        filter_items.tracker = [Lang.translate('torrent_parser_any_two')]
        filter_items.season  = [Lang.translate('torrent_parser_any_two')]

        results.Results.forEach(element => {
            let title = element.Title.toLowerCase(),
                tracker = element.Tracker;
            
            for(let i = 0; i < voices.length; i++){
                let voice = voices[i].toLowerCase()

                if(title.indexOf(voice) >= 0){
                    if(filter_items.voice.indexOf(voices[i]) == -1) filter_items.voice.push(voices[i])
                }

                if(!element.info){
                    element.info = {
                        voices: TitleParser.voices(element.Title)
                    }
                }
                
                if(element.info && element.info.voices){
                    if(element.info.voices.map(v=>v.toLowerCase()).indexOf(voice) >= 0){
                        if(filter_items.voice.indexOf(voices[i]) == -1) filter_items.voice.push(voices[i])
                    }
                }
            }

            tracker.split(',').forEach(t=>{
                if(filter_items.tracker.indexOf(t.trim()) === -1) filter_items.tracker.push(t.trim())
            })

            element.general.seasons.forEach(season=>{
                let number = season + ''

                if(finded_seasons.indexOf(number) == -1){
                    finded_seasons.push(number)
                    finded_seasons_full.push(number)
                }
            })
        })

        finded_seasons_full.sort((a,b)=>{
            let ac = parseInt(a)
            let bc = parseInt(b)

            if(ac > bc) return 1
            else if(ac < bc) return -1
            else return 0
        })

        finded_seasons.sort((a,b)=>{
            let ac = parseInt(a)
            let bc = parseInt(b)

            if(ac > bc) return 1
            else if(ac < bc) return -1
            else return 0
        })

        if(finded_seasons.length) filter_items.season = filter_items.season.concat(finded_seasons)

        
        // Надо очистить от отсутствующих ключей
        need.voice   = Arrays.removeNoIncludes(Arrays.toArray(need.voice), filter_items.voice)
        need.tracker = Arrays.removeNoIncludes(Arrays.toArray(need.tracker), filter_items.tracker)
        need.season  = Arrays.removeNoIncludes(Arrays.toArray(need.season), filter_items.season)

        this.setFilterData(need)

        select.push({
            title: Lang.translate('torrent_parser_reset'),
            reset: true
        })

        add('quality',Lang.translate('torrent_parser_quality'))
        add('hdr','HDR')
        add('dv','Dolby Vision')
        add('sub',Lang.translate('torrent_parser_subs'))
        add('voice',Lang.translate('torrent_parser_voice'))
        add('lang',Lang.translate('title_language_short'))
        add('season', Lang.translate('torrent_parser_season'))
        add('tracker', Lang.translate('torrent_parser_tracker'))
        add('year', Lang.translate('torrent_parser_year'))
        add('_3d', '3D')


        filter.set('filter', select)

        this.selectedFilter()
    }

    this.selectedFilter = function(){
        let need   = this.getFilterData(),
            select = []

        for(let i in need){
            if(need[i]){
                if(Arrays.isArray(need[i])){
                    if(need[i].length) select.push(filter_translate[i] + ':' + need[i].join(', '))
                }
                else{
                    select.push(filter_translate[i] + ': ' + filter_items[i][need[i]])
                }
            }
        }

        filter.chosen('filter', select)
    }

    this.selectedSort = function(){
        let select = Storage.get('torrents_sort','popular')

        filter.chosen('sort', [sort_translate[select]])
    }

    this.build = function(){
        this.buildSorted()
        this.buildFilterd()
        this.renderQuickChips()

        this.filtred()

        // Защита от ловушки пустого фильтра при открытии фильма: если торренты есть, но старый фильтр отсек все — сбрасываем фильтр
        if(filtred.length === 0 && results.Results && results.Results.length > 0){
            active_quick_chip = 'all'
            this.setFilterData({})
            this.buildFilterd()
            this.filtred()
        }

        filter.onSelect = (type, a, b)=>{
            if(type == 'sort'){
                Storage.set('torrents_sort',a.sort)

                this.sortResults(a.sort)
            }
            else{
                if(a.reset){
                    active_quick_chip = 'all'
                    this.setFilterData({})

                    this.buildFilterd()
                    this.renderQuickChips()
                }
                else{
                    a.items.forEach(n=>n.checked = false)

                    let filter_data = this.getFilterData()

                    filter_data[a.stype] = filter_multiple.indexOf(a.stype) >= 0 ? [] : b.index

                    a.subtitle = b.title

                    this.setFilterData(filter_data)
                }
            }

            this.applyFilter()

            this.start()
        }

        filter.onCheck = (type, a, b)=>{
            let data = this.getFilterData(),
                need = Arrays.toArray(data[a.stype])

            if(b.checked && need.indexOf(b.title) === -1) need.push(b.title)
            else if(!b.checked) Arrays.remove(need, b.title)

            data[a.stype] = need

            this.setFilterData(data)

            a.subtitle = need.length ? need.join(', ') : a.items[0].title

            this.applyFilter()
        }

        this.showResults()
    }

    this.applyFilter = function(){
        this.filtred()

        this.selectedFilter()

        this.selectedSort()

        this.reset()

        this.showResults()

        last = scroll.render().find('.torrent-item:eq(0)')[0]

        if(last) scroll.update(last)
        else scroll.reset()
    }

    this.filtred = function(){
        let filter_data = this.getFilterData()
        let filter_any  = false

        for(let i in filter_data){
            let filr = filter_data[i]

            if(filr){
                if(Arrays.isArray(filr)){
                    if(filr.length) filter_any = true
                } 
                else filter_any = true
            }
        }

        filtred  = results.Results.filter((element)=>{
            if(active_quick_chip && active_quick_chip !== 'all'){
                if(!matchesQuickChip(element, active_quick_chip)) return false
            }

            if(filter_any){
                let passed  = false,
                    nopass  = false,
                    title   = element.Title.toLowerCase(),
                    tracker = element.Tracker;

                let qua = Arrays.toArray(filter_data.quality),
                    hdr = filter_data.hdr,
                    dv  = filter_data.dv,
                    sub = filter_data.sub,
                    voi = Arrays.toArray(filter_data.voice),
                    tra = Arrays.toArray(filter_data.tracker),
                    ses = Arrays.toArray(filter_data.season),
                    lng = Arrays.toArray(filter_data.lang),
                    yer = filter_data.year,
                    _3d = filter_data._3d

                let test = function(search, test_index){
                    let regex = new RegExp(search)
                    
                    return test_index ? title.indexOf(search) >= 0 : regex.test(title)
                }

                let check = function(search, invert){
                    if(test(search)){
                        if(invert) nopass = true
                        else passed = true
                    } 
                    else{
                        if(invert) passed = true
                        else nopass = true
                    } 
                }

                let includes = function(type, arr){
                    if(!arr.length) return

                    let any = false

                    arr.forEach(a=>{
                        if(type == 'quality'){
                            let qCode = element.num_quality_code || (element._qInfo && element._qInfo.code) || 0
                            if(a == '4k' && (qCode >= 300 || test('(4k|uhd)[ |\\]|,|$]|2160[pр]|ultrahd'))) any = true
                            if(a == '1080p' && ((qCode >= 100 && qCode < 300) || test('fullhd|1080[pр]'))) any = true
                            if(a == '720p' && ((qCode >= 80 && qCode < 100) || test('720[pр]'))) any = true
                        }
                        if(type == 'voice'){
                            let p = filter_items.voice.indexOf(a)
                            let n = element.info && element.info.voices ? element.info.voices.map(v=>v.toLowerCase()) : []

                            if(p == 1){
                                if(test('дублирован|дубляж|  apple| dub| d[,| |$]|[,|\\s]дб[,|\\s|$]')) any = true
                            }
                            else if(p == 2){
                                if(test('многоголос| p[,| |$]|[,|\\s](лм|пм)[,|\\s|$]')) any = true
                            }
                            else if(p == 3){
                                if(test('двухголос|двуголос| l2[,| |$]|[,|\\s](лд|пд)[,|\\s|$]')) any = true
                            }
                            else if(p == 4){
                                if(test('любитель|авторский| l1[,| |$]|[,|\\s](ло|ап)[,|\\s|$]')) any = true
                            }
                            else if(test(a.toLowerCase(),true)) any = true
                            else if(n.length && n.indexOf(a.toLowerCase()) >= 0) any = true
                        }
                        if(type == 'lang'){
                            let p = filter_items.lang.indexOf(a)
                            let c = filter_langs[p - 1]

                            if(c){
                                if(element.languages){                            
                                    if(element.languages.find(l=>l.toLowerCase().slice(0,2) == c.code)) any = true
                                }
                                else if(title.indexOf(c.code) >= 0) any = true
                            }
                            else any = true
                        }
                        if(type == 'tracker'){
                            if(tracker.split(',').find(t=>t.trim().toLowerCase() == a.toLowerCase())) any = true
                        }

                        if (type == 'season') {
                            let i = finded_seasons.indexOf(a)
                            let f = parseInt(finded_seasons_full[i])

                            if(element.general.seasons.indexOf(f) >= 0) any = true
                        }
                    })

                    if(any) passed = true
                    else nopass = true
                }

                includes('quality', qua)
                includes('voice', voi)
                includes('tracker', tra)
                includes('season', ses)
                includes('lang', lng)

                if(hdr) check('[\\[| ]hdr[10| |\\]|,|$]',hdr !== 1)

                if(dv == 0){
                    check(filter_items.dv[dv], dv !== 1)
                }
                else if(dv == 1){
                    check('dolby vision')
                }
                else if(dv == 2){
                    check('dolby vision tv')
                }
                else if(dv == 3){
                    check('dolby vision', dv !== 0 )
                }                

                if(sub) check(' sub|[,|\\s]ст[,|\\s|$]', sub !== 1)

                if(yer){
                    check(filter_items.year[yer])
                }

                if(_3d) check(' стереопара|interlace|anaglyph|анаглиф|bd3d|over\\-?under|side\\-?by\\-?side|[\\-\\[\\(| ]((half|h)?ou|(half|h)?sbs|lrq?|abq?|ba|rl|3d[\\- ]video)([ |\\]\\),]|$)', _3d !== 1)

                return nopass ? false : passed
            }
            else return true
        })
    }

    this.showResults = function(){
        total_pages = Math.ceil(filtred.length / 20)

        if(filtred.length){
            scroll.body().addClass('torrent-list')
            
            scroll.append(history.render(true))

            this.append(filtred.slice(0,20))

            if(object.auto_play_mode && !this.auto_played){
                this.auto_played = true
                let best = CubPro.pickBestTorrent(filtred, object.auto_play_mode)
                if(best){
                    best.poster = object.movie.img
                    let badge = [best.num_quality_label, best.num_voice_label].filter(Boolean).join(' • ')
                    setTimeout(()=>{
                        Noty.show('⚡ Автовыбор' + (badge ? ' [' + badge + ']' : '') + ': ' + Utils.shortText(best.Title || best.title || '', 50))
                        Torrent.start(best, object.movie)
                    }, 120)
                }
            }
        }
        else{
            if(results.Results.length) this.listEmpty()
            else this.empty(Lang.translate('search_nofound'), true)
        }

        files.appendFiles(scroll.render())
    }

    this.reset = function(){
        last = false

        scroll.clear()
    }

    this.next = function(){
        if(object.page < 15 && object.page < total_pages){
            object.page++

            let offset = (object.page - 1) * 20

            this.append(filtred.slice(offset,offset + 20), true)
        }
    }

    this.mark = function(element, item, add){
        let viewed = Storage.cache('torrents_view', 5000, [])

        if(add){
            if(viewed.indexOf(element.hash) == -1){
                viewed.push(element.hash)

                item.append('<div class="torrent-item__viewed">'+Template.get('icon_viewed',{},true)+'</div>')
            }
        }
        else{
            element.viewed = true

            Arrays.remove(viewed, element.hash)

            item.find('.torrent-item__viewed').remove()
        }

        element.viewed = add

        Storage.set('torrents_view', viewed)

        if(!add) Storage.remove('torrents_view',element.hash)
    }

    this.addToBase = function(element){
        Torserver.add({
            poster: object.movie.img,
            title: object.movie.title + ' / ' + object.movie.original_title,
            link: element.MagnetUri || element.Link,
            data:{
                lampa: true,
                movie: object.movie
            }
        },()=>{
            Noty.show(object.movie.title + ' - ' + Lang.translate('torrent_parser_added_to_mytorrents'))
        })
    }

    this.append = function(items, append){
        items.forEach(element => {
            count++

            let date = Utils.parseTime(element.PublishDate)
            let bitrate = object.movie.runtime ? Utils.calcBitrate(element.Size, object.movie.runtime) : 0

            Arrays.extend(element,{
                title: element.Title,
                date: date.full,
                tracker: element.Tracker,
                bitrate: bitrate,
                size: !isNaN(parseInt(element.Size)) ? Utils.bytesToSize(element.Size) : element.size,
                seeds: element.Seeders,
                grabs: element.Peers
            })

            let item = Template.get('torrent',element)
            if(element._btih) item.attr('data-btih', element._btih)
            if(element.hash)  item.attr('data-thash', element.hash)
            let need_remove_ffprobe = false

            if(!element.ffprobe){
                element.ffprobe = []

                need_remove_ffprobe = true
            }

            if(element.ffprobe){
                let ffprobe_elem = item.find('.torrent-item__ffprobe')
                let ffprobe_tags = []
                let general      = element.general || {}
                let numQ         = element._qInfo || CubPro.classifyTorrentQuality(element.Title || '', element.num_quality_code, element.info, element.ffprobe)
                let numV         = element._vInfo || CubPro.classifyTorrentVoice(element.Title || '', element.num_voice_code)
                let quality      = element.num_quality_label || numQ.label || general.resolution || (element.info && element.info.quality ? Utils.qualityToText(element.info.quality + 'p') : '')

                if(object.movie.number_of_seasons && general.season){
                    ffprobe_elem.append('<div class="m-general"><div>S'+general.season+'</div>'+(general.episodes ? '<div>' + general.episodes + '</div>' : '')+'</div>')
                }

                if(quality) ffprobe_tags.push({media: 'resolution', value: quality})

                if(numQ.isDv) ffprobe_tags.push({media: 'resolution', value: 'Dolby Vision'})
                else if(numQ.isHdr || general.hdr) ffprobe_tags.push({media: 'resolution', value: 'HDR'})

                if(numQ.isHevc) ffprobe_tags.push({media: 'video', value: 'HEVC'})
    
                let video = element.ffprobe.find(a=>a.codec_type == 'video')

                if(!quality && video) ffprobe_tags.push({media: 'resolution',value: Utils.qualityToText(Utils.resolutionToQuality(video.width, video.height, 'p'))})

                let audio = element.ffprobe.filter(a=>a.codec_type == 'audio' && a.tags)
                let subs  = element.ffprobe.filter(a=>a.codec_type == 'subtitle' && a.tags)
                let voice = Arrays.clone(element.info && element.info.voices ? element.info.voices : [])

                if (numV.tierLabel && voice.indexOf(numV.tierLabel) === -1) {
                    voice.unshift(numV.tierLabel)
                }
                numV.studios.forEach(st => {
                    if (voice.indexOf(st) === -1) voice.push(st)
                })

                if(video) ffprobe_tags.push({media: 'video',value: video.width + 'x' + video.height})

                let is_71 = element.ffprobe.find(a=>a.codec_type == 'audio' && a.channels == 8)
                let is_51 = element.ffprobe.find(a=>a.codec_type == 'audio' && a.channels == 6)

                if(is_71) ffprobe_tags.push({media: 'channels',value: '7.1'})
                if(is_51) ffprobe_tags.push({media: 'channels',value: '5.1'})

                audio.forEach(a=>{
                    let line = []
                    let lang = (a.tags.language || '').toUpperCase()
                    let name = a.tags.title || a.tags.handler_name || ''
                    let short = voices.find(v=>name.toLowerCase().indexOf(v.toLowerCase()) >= 0)

                    if(short) name = short

                    let find = voice.find(v=>name.toLowerCase().indexOf(v.toLowerCase()) >= 0)

                    if(find) Arrays.remove(voice, find)

                    if(lang) line.push(lang)
                    if(name && lang !== 'ENG'){
                        name = find || name

                        if(name.toLowerCase().indexOf('dub') >= 0 || name.toLowerCase() == 'd') name = Lang.translate('torrent_parser_voice_dubbing')
                        
                        line.push(Utils.shortText(Utils.capitalizeFirstLetter(name),20))
                    }

                    if(line.length) ffprobe_tags.push({media: 'audio',value: line.join(' - ')})
                })

                voice.forEach(v=>{
                    ffprobe_tags.push({media: 'audio',value: v})
                })

                let find_subtitles = []

                subs.forEach(a=>{
                    let lang = (a.tags.language || '').toUpperCase()

                    if(lang) find_subtitles.push(lang)
                })

                find_subtitles = find_subtitles.filter((el, pos)=>find_subtitles.indexOf(el) == pos)

                find_subtitles.slice(0,4).forEach(a=>{
                    ffprobe_tags.push({media: 'subtitle',value: a})
                })

                if(find_subtitles.length > 4) ffprobe_tags.push({media: 'subtitle',value: '+' + (find_subtitles.length - 4)})

                ffprobe_tags = ffprobe_tags.filter((el, pos)=>ffprobe_tags.map(a=>a.value + a.media).indexOf(el.value + el.media) == pos)
    
                ffprobe_tags.forEach(tag=>{
                    ffprobe_elem.append('<div class="m-'+tag.media+'">'+tag.value+'</div>')
                })
    
                if($('> div', ffprobe_elem).length) ffprobe_elem.removeClass('hide')

                if(need_remove_ffprobe) delete element.ffprobe
            }

            if (!bitrate) item.find('.bitrate').remove()

            if(element.viewed) item.append('<div class="torrent-item__viewed">'+Template.get('icon_viewed',{},true)+'</div>')

            if(!element.size || parseInt(element.size) == 0) item.find('.torrent-item__size').remove()

            item.on('hover:focus',(e)=>{
                last = e.target

                scroll.update($(e.target),true)
            }).on('hover:hover hover:touch',(e)=>{
                last = e.target

                Navigator.focused(last)
            }).on('hover:enter',(e)=>{
                last = e.target
                
                Torrent.opened(()=>{
                    this.mark(element, item, true)
                })

                element.poster = object.movie.img

                this.start()

                Torrent.start(element, object.movie)

                Lampa.Listener.send('torrent',{type:'onenter',element,item})
            }).on('hover:long',()=>{
                let enabled = Controller.enabled().name
                let menu = [
                    {
                        title: Lang.translate('torrent_parser_add_to_mytorrents'),
                        tomy: true
                    },
                    {
                        title: Lang.translate('torrent_parser_label_title'),
                        subtitle: Lang.translate('torrent_parser_label_descr'),
                        mark: true
                    },
                    {
                        title: Lang.translate('torrent_parser_label_cancel_title'),
                        subtitle: Lang.translate('torrent_parser_label_cancel_descr'),
                        unmark: true
                    }
                ]

                Lampa.Listener.send('torrent',{type:'onlong',element,item,menu})

                Select.show({
                    title: Lang.translate('title_action'),
                    items: menu,
                    onBack: ()=>{
                        Controller.toggle(enabled)
                    },
                    onSelect: (a)=>{
                        if(a.tomy){
                            this.addToBase(element)
                        }
                        else if(a.mark){
                            this.mark(element, item, true)
                        }
                        else if(a.unmark){
                            this.mark(element, item, false)
                        }
    
                        Controller.toggle(enabled)
                    }
                })
            })

            Lampa.Listener.send('torrent',{type:'render',element,item})

            scroll.append(item)

            if(append) Controller.collectionAppend(item)
        })
    }


    this.back = function(){
        Activity.backward()
    }

    this.start = function(){
        if(!initialized){
            initialized = true

            this.initialize()
        }
        
        Background.immediately(Utils.cardImgBackgroundBlur(object.movie))

        Controller.add('content',{
            toggle: ()=>{
                Controller.collectionSet(scroll.render(),files.render(true))
                Controller.collectionFocus(last || false,scroll.render(true))

                Navigator.remove(files.render().find('.explorer-card__head-img')[0])
            },
            update: ()=>{},
            up: ()=>{
                if(Navigator.canmove('up')){
                    Navigator.move('up')
                }
                else Controller.toggle('head')
            },
            down: ()=>{
                Navigator.move('down')
            },
            right: ()=>{
                if(Navigator.canmove('right')) Navigator.move('right')
                else filter.render().find('.filter--filter').trigger('hover:enter')
            },
            left: ()=>{
                if(Navigator.canmove('left')) Navigator.move('left')
                else files.toggle()
            },
            back: this.back
        })

        Controller.toggle('content')
    }

    this.pause = function(){
        listener && listener.destroy()
    }

    this.stop = function(){
        
    }

    this.render = function(){
        return files.render()
    }

    this.destroy = function(){
        network.clear()
        Parser.clear()

        files.destroy()

        scroll.destroy()

        listener && listener.destroy()

        results = null
        network = null
    }
}

export default component
