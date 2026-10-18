import Collection from './collection.js'

const CATALOG = [
    {
        hpu: 'num_releases',
        title: '⚡ Релизы NUM: 4K UHD, Новинки и Легенды (Торренты в 1 клик)',
        items: [
            {
                id: 'num_4k_uhd',
                title: '🔥 NUM: 4K UHD, Dolby Vision & BDRemux (980+ релизов)',
                backdrop_path: '/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
                items_count: '989',
                time: '2026-10-18',
                views: 412000,
                liked: 38900,
                username: 'YouROK NUM 4K',
                icon: 'l_1',
                cid: 'num_releases',
                num_feed_url: 'http://releases.yourok.ru/releases/4k_id.json',
                endpoint: 'discover/movie?vote_count.gte=2500&sort_by=revenue.desc'
            },
            {
                id: 'num_movies_new',
                title: '🎬 NUM: Горячие новинки кино (Свежие раздачи)',
                backdrop_path: '/tmU7GeKVybMWFButWEGl2M4GeiP.jpg',
                items_count: '940',
                time: '2026-10-18',
                views: 368000,
                liked: 31400,
                username: 'YouROK NUM',
                icon: 'l_2',
                cid: 'num_releases',
                num_feed_url: 'http://releases.yourok.ru/releases/movies_id.json',
                endpoint: 'trending/movie/week'
            },
            {
                id: 'num_tv_new',
                title: '📺 NUM: Новые сериалы и сезоны (NUM Releases)',
                backdrop_path: '/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg',
                items_count: '836',
                time: '2026-10-18',
                views: 294000,
                liked: 26700,
                username: 'YouROK NUM TV',
                icon: 'l_3',
                cid: 'num_releases',
                num_feed_url: 'http://releases.yourok.ru/releases/tv_id.json',
                endpoint: 'trending/tv/week'
            },
            {
                id: 'num_legends',
                title: '🏆 NUM: Легенды кино в максимальном качестве',
                backdrop_path: '/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg',
                items_count: '163',
                time: '2026-10-17',
                views: 385000,
                liked: 35200,
                username: 'NUM Legends',
                icon: 'l_4',
                cid: 'num_releases',
                num_feed_url: 'http://releases.yourok.ru/releases/legends_id.json',
                endpoint: 'movie/top_rated'
            },
            {
                id: 'num_cartoons',
                title: '🧸 NUM: Полнометражные мультфильмы (4K / FHD)',
                backdrop_path: '/2u7zbn8EudG6kLlBzUYqP8RyFU4.jpg',
                items_count: '84',
                time: '2026-10-16',
                views: 218000,
                liked: 19500,
                username: 'NUM Cartoons',
                icon: 'l_5',
                cid: 'num_releases',
                num_feed_url: 'http://releases.yourok.ru/releases/cartoons_id.json',
                endpoint: 'discover/movie?with_genres=16&sort_by=popularity.desc'
            },
            {
                id: 'num_cartoons_tv',
                title: '🧸 NUM: Мультсериалы (Свежие релизы)',
                backdrop_path: '/wcaDIAG1QdXQLRaj4vC1EFdBT2.jpg',
                items_count: '725',
                time: '2026-10-16',
                views: 204000,
                liked: 18900,
                username: 'NUM Cartoons TV',
                icon: 'l_1',
                cid: 'num_releases',
                num_feed_url: 'http://releases.yourok.ru/releases/cartoons_tv_id.json',
                endpoint: 'discover/tv?with_genres=16&sort_by=popularity.desc'
            },
            {
                id: 'num_anime',
                title: '⛩️ NUM: Лучшее Аниме (Свежие релизы)',
                backdrop_path: '/mSDsSDwaP3E7dEfUPWy4J0djt4O.jpg',
                items_count: '812',
                time: '2026-10-16',
                views: 196000,
                liked: 18400,
                username: 'NUM Anime',
                icon: 'l_6',
                cid: 'num_releases',
                num_feed_url: 'http://releases.yourok.ru/releases/anime_id.json',
                endpoint: 'discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc'
            }
        ]
    },
    {
        hpu: 'num_ai',
        title: '🤖 ИИ-Коллекции NUM (Нейроподборки с готовыми торрентами)',
        items: []
    },
    {
        hpu: 'studios',
        title: 'Стриминговые платформы и Студии (Originals)',
        items: [
            {
                id: 'netflix_originals',
                title: 'Netflix Originals — Хиты и Премьеры',
                backdrop_path: '/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
                items_count: '240+',
                time: '2026-10-15',
                views: 184500,
                liked: 14200,
                username: 'Netflix Hub',
                icon: 'l_1',
                cid: 'studios',
                endpoint: 'discover/tv?with_networks=213&sort_by=popularity.desc'
            },
            {
                id: 'hbo_max',
                title: 'HBO & Max — Премиальные сериалы',
                backdrop_path: '/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg',
                items_count: '180+',
                time: '2026-10-14',
                views: 162300,
                liked: 15800,
                username: 'HBO Prestige',
                icon: 'l_2',
                cid: 'studios',
                endpoint: 'discover/tv?with_networks=49&sort_by=vote_average.desc&vote_count.gte=250'
            },
            {
                id: 'apple_tv_plus',
                title: 'Apple TV+ — Эксклюзивы в 4K HDR',
                backdrop_path: '/n5FPNMJ0eRoiQrKGfUQQRAZeaxg.jpg',
                items_count: '120+',
                time: '2026-10-12',
                views: 119400,
                liked: 11300,
                username: 'Apple TV+',
                icon: 'l_3',
                cid: 'studios',
                endpoint: 'discover/tv?with_networks=2552&sort_by=popularity.desc'
            },
            {
                id: 'amazon_prime',
                title: 'Amazon Prime Video — Блокбастеры',
                backdrop_path: '/mY7SeH4HFFxW1hiI6cWuwCRKptN.jpg',
                items_count: '190+',
                time: '2026-10-10',
                views: 108200,
                liked: 9600,
                username: 'Prime Video',
                icon: 'l_4',
                cid: 'studios',
                endpoint: 'discover/tv?with_networks=1024&sort_by=popularity.desc'
            },
            {
                id: 'marvel_disney',
                title: 'Disney+ & Киновселенная Marvel',
                backdrop_path: '/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg',
                items_count: '150+',
                time: '2026-10-08',
                views: 215000,
                liked: 18900,
                username: 'Marvel & Disney',
                icon: 'l_5',
                cid: 'studios',
                endpoint: 'discover/movie?with_companies=420&sort_by=popularity.desc'
            },
            {
                id: 'a24_cinema',
                title: 'Студия A24 — Авторское и культовое кино',
                backdrop_path: '/ss0Os3uWJfQAENILHZUdX8Tt1OC.jpg',
                items_count: '110+',
                time: '2026-10-05',
                views: 94800,
                liked: 12400,
                username: 'A24 Selection',
                icon: 'l_6',
                cid: 'studios',
                endpoint: 'discover/movie?with_companies=41077&sort_by=vote_average.desc&vote_count.gte=150'
            }
        ]
    },
    {
        hpu: 'top',
        title: 'Золотой фонд и Рейтинги (IMDb & Кинопоиск)',
        items: [
            {
                id: 'top_250_imdb_kp',
                title: 'Золотой фонд: Топ 250 IMDb & Кинопоиск',
                backdrop_path: '/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg',
                items_count: '250',
                time: '2026-10-16',
                views: 342000,
                liked: 29400,
                username: 'CubPro VIP',
                icon: 'l_1',
                cid: 'top',
                endpoint: 'movie/top_rated'
            },
            {
                id: 'top_series_all_time',
                title: 'Величайшие сериалы всех времён (IMDb 8.5+)',
                backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
                items_count: '200',
                time: '2026-10-15',
                views: 278000,
                liked: 24100,
                username: 'CubPro VIP',
                icon: 'l_2',
                cid: 'top',
                endpoint: 'tv/top_rated'
            },
            {
                id: 'uhd_4k_imax',
                title: 'Эталон 4K UHD, IMAX & Dolby Vision',
                backdrop_path: '/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
                items_count: '160+',
                time: '2026-10-14',
                views: 198500,
                liked: 17600,
                username: '4K Masters',
                icon: 'l_3',
                cid: 'top',
                endpoint: 'discover/movie?vote_count.gte=3000&sort_by=revenue.desc'
            },
            {
                id: 'trending_world',
                title: 'Главные хиты недели (Мировой тренд)',
                backdrop_path: '/tmU7GeKVybMWFButWEGl2M4GeiP.jpg',
                items_count: '100',
                time: '2026-10-17',
                views: 156000,
                liked: 13200,
                username: 'Trending',
                icon: 'l_4',
                cid: 'top',
                endpoint: 'trending/movie/week'
            }
        ]
    },
    {
        hpu: 'themes',
        title: 'Тематические подборки и Настроения',
        items: [
            {
                id: 'mind_bending_twists',
                title: 'Игры разума и Неожиданный финал (Твисты)',
                backdrop_path: '/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
                items_count: '140+',
                time: '2026-10-13',
                views: 210400,
                liked: 19800,
                username: 'Cinema Mind',
                icon: 'l_5',
                cid: 'themes',
                endpoint: 'discover/movie?with_genres=53,9648&vote_count.gte=1500&sort_by=vote_average.desc'
            },
            {
                id: 'scifi_space_cyberpunk',
                title: 'Космическая Одиссея и Киберпанк (Sci-Fi)',
                backdrop_path: '/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg',
                items_count: '180+',
                time: '2026-10-11',
                views: 187900,
                liked: 16900,
                username: 'Sci-Fi Club',
                icon: 'l_6',
                cid: 'themes',
                endpoint: 'discover/movie?with_genres=878&vote_count.gte=1200&sort_by=vote_average.desc'
            },
            {
                id: 'dark_detective_noir',
                title: 'Мрачные Детективы, Нуар и Расследования',
                backdrop_path: '/c2OijvbFEXBW1onbzuvENr4CGQB.jpg',
                items_count: '120+',
                time: '2026-10-09',
                views: 134000,
                liked: 12100,
                username: 'Noir Detective',
                icon: 'l_1',
                cid: 'themes',
                endpoint: 'discover/tv?with_genres=80,9648&vote_count.gte=300&sort_by=vote_average.desc'
            },
            {
                id: 'epic_fantasy_worlds',
                title: 'Эпическое Фэнтези и Миры Приключений',
                backdrop_path: '/2u7zbn8EudG6kLlBzUYqP8RyFU4.jpg',
                items_count: '150+',
                time: '2026-10-07',
                views: 175600,
                liked: 15400,
                username: 'Fantasy Hub',
                icon: 'l_2',
                cid: 'themes',
                endpoint: 'discover/movie?with_genres=14,12&vote_count.gte=1500&sort_by=vote_average.desc'
            },
            {
                id: 'anime_masterpieces',
                title: 'Шедевры Аниме (Полнометражные и Сериалы)',
                backdrop_path: '/mSDsSDwaP3E7dEfUPWy4J0djt4O.jpg',
                items_count: '200+',
                time: '2026-10-06',
                views: 164200,
                liked: 16100,
                username: 'Anime Pro',
                icon: 'l_3',
                cid: 'themes',
                endpoint: 'discover/movie?with_genres=16&with_original_language=ja&vote_count.gte=400&sort_by=vote_average.desc'
            },
            {
                id: 'heist_crime_gangsters',
                title: 'Ограбления, Аферы и Криминальные саги',
                backdrop_path: '/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg',
                items_count: '130+',
                time: '2026-10-04',
                views: 149000,
                liked: 13800,
                username: 'Crime Classics',
                icon: 'l_4',
                cid: 'themes',
                endpoint: 'discover/movie?with_genres=80,18&vote_count.gte=1500&sort_by=vote_average.desc'
            }
        ]
    }
]

function syncDynamicCatalog(){
    let aiSection = CATALOG.find(c => c.hpu === 'num_ai')
    if (aiSection && window.Lampa && Lampa.CubPro && Lampa.CubPro.getNumAiCollectionsCatalog) {
        aiSection.items = Lampa.CubPro.getNumAiCollectionsCatalog()
    }
}

function getSavedIds(){
    return Lampa.Storage.get('cub_pro_saved_collections', '[]')
}

function findCollectionById(id){
    syncDynamicCatalog()
    for(let i = 0; i < CATALOG.length; i++){
        let found = CATALOG[i].items.find(item => item.id === id)
        if(found) return found
    }
    return CATALOG[0].items[0]
}

function makeLine(catTitle, catKey, items){
    return {
        title: catTitle,
        collection: true,
        line_type: 'collection',
        category: catKey,
        results: items.map(item => Object.assign({}, item)),
        cardClass: (elem, param)=>{
            return new Collection(elem, param)
        }
    }
}

function main(params, oncomplite, onerror){
    syncDynamicCatalog()
    let fulldata = []
    let savedIds = getSavedIds()

    if(savedIds.length){
        let savedItems = savedIds.map(id => findCollectionById(id)).filter(Boolean)
        if(savedItems.length){
            fulldata.push(makeLine('Сохраненные коллекции', 'saved', savedItems))
        }
    }

    CATALOG.forEach(cat => {
        if (cat.items && cat.items.length) {
            fulldata.push(makeLine(cat.title, cat.hpu, cat.items))
        }
    })

    oncomplite(fulldata)
}

function collection(params, oncomplite, onerror){
    syncDynamicCatalog()
    let catKey = (params.url || '').replace(/^user_/, '')
    let cat = CATALOG.find(c => c.hpu === catKey) || CATALOG[0]

    oncomplite({
        title: cat.title,
        collection: true,
        total_pages: 1,
        results: cat.items.map(item => Object.assign({}, item)),
        cardClass: (elem, param)=>{
            return new Collection(elem, param)
        }
    })
}

function liked(params, callback){
    if(callback) callback({ secuses: true })
}

function tmdbGet(url, params, oncomplite, onerror){
    if (window.Lampa && Lampa.Api && Lampa.Api.sources && Lampa.Api.sources.tmdb && Lampa.Api.sources.tmdb.get) {
        Lampa.Api.sources.tmdb.get(url, params, oncomplite, onerror)
    } else if (onerror) {
        onerror()
    }
}

function hydrateNumSlice(rawItems, page, totalPages, fallbackEndpoint, oncomplite, onerror){
    if(!Array.isArray(rawItems) || !rawItems.length){
        fallbackTmdb(fallbackEndpoint, page, oncomplite, onerror)
        return
    }
    let pending = rawItems.length
    let cards = new Array(rawItems.length)

    rawItems.forEach((entry, idx) => {
        let mType = entry.media_type || 'movie'
        tmdbGet(mType + '/' + entry.id, {}, (cardData) => {
            if (cardData && cardData.id) {
                cardData.source = 'tmdb'
                if (Array.isArray(entry.torrent) && entry.torrent.length) {
                    cardData.num_torrents = entry.torrent
                }
                if (window.Lampa && Lampa.CubPro && Lampa.CubPro.getReleaseQuality) {
                    Lampa.CubPro.getReleaseQuality(cardData)
                }
                cards[idx] = cardData
            }
            if (--pending === 0) {
                let valid = cards.filter(Boolean)
                if (valid.length) {
                    oncomplite({
                        results: valid,
                        page: page,
                        total_pages: totalPages
                    })
                } else {
                    fallbackTmdb(fallbackEndpoint, page, oncomplite, onerror)
                }
            }
        }, () => {
            if (--pending === 0) {
                let valid = cards.filter(Boolean)
                if (valid.length) {
                    oncomplite({
                        results: valid,
                        page: page,
                        total_pages: totalPages
                    })
                } else {
                    fallbackTmdb(fallbackEndpoint, page, oncomplite, onerror)
                }
            }
        })
    })
}

function fallbackTmdb(endpoint, page, oncomplite, onerror){
    tmdbGet(endpoint || 'movie/top_rated', { page: page }, (data)=>{
        if(data && Array.isArray(data.results)){
            data.results.forEach(item => {
                item.source = 'tmdb'
            })
            data.total_pages = Math.min(data.total_pages || 10, 15)
            oncomplite(data)
        }
        else if(onerror) onerror()
    }, onerror)
}

function full(params, oncomplite, onerror){
    let col = findCollectionById(params.url)
    let page = params.page || 1
    let endpoint = col ? col.endpoint : 'movie/top_rated'
    let pageSize = 18

    if (col && col.num_feed_url && window.Lampa && Lampa.CubPro && Lampa.CubPro.fetchNumJson) {
        Lampa.CubPro.fetchNumJson(col.num_feed_url).then(json => {
            let list = json && Array.isArray(json.items) ? json.items : []
            if (!list.length) {
                fallbackTmdb(endpoint, page, oncomplite, onerror)
                return
            }
            let totalPages = Math.min(15, Math.ceil(list.length / pageSize))
            let slice = list.slice((page - 1) * pageSize, page * pageSize)
            hydrateNumSlice(slice, page, totalPages, endpoint, oncomplite, onerror)
        })
        return
    }

    if (col && typeof col.ai_index === 'number' && window.Lampa && Lampa.CubPro && Lampa.CubPro.fetchNumJson) {
        Lampa.CubPro.fetchNumJson(Lampa.CubPro.NUM_AI_COLLECTIONS_URL).then(json => {
            let aiCol = Array.isArray(json) ? json[col.ai_index] : null
            let list = aiCol && Array.isArray(aiCol.parts) ? aiCol.parts : []
            if (!list.length) {
                fallbackTmdb(endpoint, page, oncomplite, onerror)
                return
            }
            let totalPages = Math.max(1, Math.ceil(list.length / pageSize))
            let slice = list.slice((page - 1) * pageSize, page * pageSize)
            hydrateNumSlice(slice, page, totalPages, endpoint, oncomplite, onerror)
        })
        return
    }

    fallbackTmdb(endpoint, page, oncomplite, onerror)
}

function status(params, callback){
    let savedIds = getSavedIds()
    if(callback) callback({ saved: savedIds.indexOf(params.id) !== -1 })
}

function save(params, callback){
    let savedIds = getSavedIds()
    let idx = savedIds.indexOf(params.id)
    if(idx === -1) savedIds.push(params.id)
    else savedIds.splice(idx, 1)
    Lampa.Storage.set('cub_pro_saved_collections', savedIds)
    if(callback) callback({ secuses: true })
}

function clear(){}

export default {
    main,
    collection,
    full,
    clear,
    liked,
    status,
    save
}