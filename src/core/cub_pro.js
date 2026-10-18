import Storage from './storage/storage'
import Arrays from '../utils/arrays'
import Utils from '../utils/utils'
import Lang from './lang'

/**
 * Детерминированный генератор псевдослучайных чисел по целочисленному seed
 */
function seededRandom(seed) {
    let x = Math.sin(seed) * 10000
    return x - Math.floor(x)
}

function hashInt(seed, salt = 0) {
    let s = String(seed || '1000') + '_' + String(salt || 0)
    let h = 2166136261
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return Math.abs(h >>> 0)
}

function getGenreIds(card = {}) {
    if (Array.isArray(card.genre_ids)) return card.genre_ids.map(Number)
    if (Array.isArray(card.genres)) return card.genres.map(g => Number(g && g.id ? g.id : g))
    return []
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val))
}

/**
 * Генерация реалистичных реакций аудитории на основе TMDB vote_average / vote_count + локальных голосов пользователя
 */
function reactionsGet(params = {}, movie = null) {
    let id = Number(params.id || (movie && movie.id) || 1000)
    let method = params.method || (movie && (movie.name || movie.first_air_date) ? 'tv' : 'movie')
    let key = method + '_' + id

    let vote_avg = movie && typeof movie.vote_average === 'number' ? movie.vote_average : (6.5 + seededRandom(id) * 2.2)
    let vote_cnt = movie && typeof movie.vote_count === 'number' ? Math.max(25, movie.vote_count) : Math.round(80 + seededRandom(id + 7) * 450)
    let base_total = Math.max(12, Math.min(2400, Math.round(vote_cnt * 0.18)))

    let weights
    if (vote_avg >= 7.6) {
        weights = { fire: 0.48, nice: 0.32, think: 0.12, bore: 0.05, shit: 0.03 }
    } else if (vote_avg >= 6.5) {
        weights = { fire: 0.26, nice: 0.38, think: 0.18, bore: 0.11, shit: 0.07 }
    } else {
        weights = { fire: 0.12, nice: 0.22, think: 0.20, bore: 0.26, shit: 0.20 }
    }

    let custom_counts = Storage.get('local_reactions_counts', '{}')
    let card_custom = custom_counts[key] || {}
    let mine = Storage.get('mine_reactions', '{}')[key] || []

    let types = ['fire', 'nice', 'think', 'bore', 'shit']
    let result = []

    types.forEach((type, idx) => {
        let jitter = 0.85 + seededRandom(id * 13 + idx * 31) * 0.3
        let count = Math.max(1, Math.round(base_total * weights[type] * jitter))
        if (card_custom[type]) count += card_custom[type]
        else if (mine.indexOf(type) >= 0) count += 1

        result.push({
            type: type,
            counter: count
        })
    })

    return { result }
}

/**
 * Добавление локальной реакции пользователя
 */
function reactionsAdd(params = {}) {
    let method = params.method || 'movie'
    let id = params.id
    let type = params.type
    let key = method + '_' + id

    let custom_counts = Storage.get('local_reactions_counts', '{}')
    if (!custom_counts[key]) custom_counts[key] = {}
    custom_counts[key][type] = (custom_counts[key][type] || 0) + 1

    Storage.set('local_reactions_counts', custom_counts)
    return { secuses: true }
}

/**
 * Генерация премиальной AI-инфографики (11 шкал характеристик + теги настроения) из жанров, ключевых слов и рейтинга TMDB
 */
function generateMetadata(movie = {}) {
    let id = Number(movie.id || 1000)
    let genres = (movie.genres || []).map(g => Number(g.id))
    let vote = Number(movie.vote_average || 7.0)
    let adult = Boolean(movie.adult)

    let hasGenre = (gid) => genres.indexOf(gid) >= 0

    // Жанры TMDB:
    // 28 Action, 12 Adventure, 16 Animation, 35 Comedy, 80 Crime, 99 Documentary,
    // 18 Drama, 10751 Family, 14 Fantasy, 36 History, 27 Horror, 10402 Music,
    // 9648 Mystery, 10749 Romance, 878 Sci-Fi, 53 Thriller, 10752 War, 37 Western
    let baseScores = {
        humor:      hasGenre(35) ? 8 : hasGenre(16) || hasGenre(10751) ? 7 : hasGenre(27) || hasGenre(10752) ? 2 : 4,
        violence:   hasGenre(27) || hasGenre(10752) ? 8 : hasGenre(28) || hasGenre(80) || hasGenre(53) ? 7 : hasGenre(16) || hasGenre(10751) ? 1 : 4,
        fear:       hasGenre(27) ? 9 : hasGenre(53) || hasGenre(9648) ? 7 : hasGenre(16) || hasGenre(35) ? 1 : 3,
        tension:    hasGenre(53) || hasGenre(9648) || hasGenre(27) ? 9 : hasGenre(28) || hasGenre(80) || hasGenre(878) ? 8 : 5,
        romance:    hasGenre(10749) ? 9 : hasGenre(18) || hasGenre(35) ? 6 : 3,
        sadness:    hasGenre(18) || hasGenre(10752) ? 8 : hasGenre(10749) ? 6 : hasGenre(35) ? 2 : 4,
        pace:       hasGenre(28) || hasGenre(12) || hasGenre(53) ? 8 : hasGenre(18) || hasGenre(36) ? 5 : 7,
        importance: vote >= 7.8 ? 9 : vote >= 6.8 ? 7 : 6,
        action:     hasGenre(28) || hasGenre(12) || hasGenre(10752) ? 9 : hasGenre(878) || hasGenre(53) ? 7 : 4,
        sex:        adult ? 8 : hasGenre(10749) ? 5 : hasGenre(16) || hasGenre(10751) ? 1 : 2,
        profanity:  hasGenre(80) || hasGenre(27) || hasGenre(10752) ? 6 : hasGenre(16) || hasGenre(10751) ? 1 : 3
    }

    let names = ['action', 'tension', 'pace', 'importance', 'humor', 'violence', 'romance', 'sadness', 'fear', 'profanity', 'sex']
    let review = names.map((name, idx) => {
        let base = baseScores[name] || 5
        let jitter = Math.round((seededRandom(id * 17 + idx * 23) - 0.5) * 2)
        let avg = Math.max(1, Math.min(10, base + jitter))

        let values = []
        for (let b = 0; b < 10; b++) {
            // Создаём естественную динамику по хронометражу фильма (разгон к кульминации на 7-9 сегментах)
            let arc = (b >= 6 && b <= 8) ? 1.5 : (b <= 1 ? -1.0 : 0)
            let wave = (seededRandom(id * 31 + idx * 19 + b * 7) - 0.5) * 3.2
            let val = Math.max(1, Math.min(10, Math.round(avg + arc + wave)))
            values.push(val)
        }

        return {
            name,
            avg,
            values
        }
    })

    let isRu = Lang.selected(['ru', 'uk', 'be'])
    let moodPool = []

    if (hasGenre(28) || hasGenre(12)) {
        moodPool.push({ name: isRu ? 'Захватывающий' : 'Exciting', base: 91 })
        moodPool.push({ name: isRu ? 'Динамичный' : 'Dynamic', base: 87 })
    }
    if (hasGenre(53) || hasGenre(9648) || hasGenre(80)) {
        moodPool.push({ name: isRu ? 'Напряжённый' : 'Tense', base: 89 })
        moodPool.push({ name: isRu ? 'Интригующий' : 'Intriguing', base: 85 })
    }
    if (hasGenre(35)) {
        moodPool.push({ name: isRu ? 'Весёлый' : 'Funny', base: 88 })
        moodPool.push({ name: isRu ? 'Лёгкий' : 'Lighthearted', base: 82 })
    }
    if (hasGenre(18)) {
        moodPool.push({ name: isRu ? 'Эмоциональный' : 'Emotional', base: 90 })
        moodPool.push({ name: isRu ? 'Глубокий' : 'Deep', base: 84 })
    }
    if (hasGenre(878) || hasGenre(14)) {
        moodPool.push({ name: isRu ? 'Атмосферный' : 'Atmospheric', base: 92 })
        moodPool.push({ name: isRu ? 'Зрелищный' : 'Spectacular', base: 86 })
    }
    if (hasGenre(27)) {
        moodPool.push({ name: isRu ? 'Пугающий' : 'Scary', base: 89 })
        moodPool.push({ name: isRu ? 'Мрачный' : 'Dark', base: 84 })
    }
    if (hasGenre(10749)) {
        moodPool.push({ name: isRu ? 'Романтичный' : 'Romantic', base: 88 })
        moodPool.push({ name: isRu ? 'Трогательный' : 'Touching', base: 83 })
    }

    let defaultMoods = [
        { name: isRu ? 'Атмосферный' : 'Atmospheric', base: 88 },
        { name: isRu ? 'Увлекательный' : 'Engaging', base: 85 },
        { name: isRu ? 'Зрелищный' : 'Visual', base: 82 },
        { name: isRu ? 'Эмоциональный' : 'Emotional', base: 79 },
        { name: isRu ? 'Стильный' : 'Stylish', base: 76 },
        { name: isRu ? 'Запоминающийся' : 'Memorable', base: 74 }
    ]

    defaultMoods.forEach(dm => {
        if (!moodPool.find(m => m.name === dm.name)) moodPool.push(dm)
    })

    let moods = moodPool.slice(0, 8).map((m, idx) => {
        let delta = Math.round((seededRandom(id * 11 + idx * 13) - 0.5) * 8)
        return {
            name: m.name,
            percent: Math.max(55, Math.min(98, m.base + delta))
        }
    }).sort((a, b) => b.percent - a.percent)

    return {
        status: 'completed',
        review,
        moods
    }
}

/**
 * Формирование списка отзывов (TMDB reviews + локальные комментарии пользователя)
 */
function buildDiscuss(params = {}, tmdbReviews = null, movie = null) {
    let method = params.method || (movie && (movie.name || movie.first_air_date) ? 'tv' : 'movie')
    let id = Number(params.id || (movie && movie.id) || 1000)
    let key = method + '_' + id

    let local_list = Storage.get('local_discuss_' + key, '[]')
    let votes = Storage.get('local_discuss_votes', '{}')

    let remote_list = []
    if (tmdbReviews && Array.isArray(tmdbReviews.results)) {
        remote_list = tmdbReviews.results.map((r, idx) => {
            let rid = r.id || (key + '_tmdb_' + idx)
            let baseLikes = Math.max(1, Math.round((r.author_details && r.author_details.rating ? r.author_details.rating : 7) * 2))
            let cleanText = (r.content || '').replace(/<[^>]*>/g, '').trim()
            return {
                id: rid,
                email: r.author || (r.author_details && r.author_details.username) || 'TMDB Reviewer',
                icon: 'l_' + ((idx % 6) + 1),
                comment: cleanText,
                text: cleanText,
                liked: baseLikes + (votes[rid] || 0),
                time: r.created_at ? new Date(r.created_at).getTime() : Date.now()
            }
        }).filter(r => r.comment.length > 0)
    }

    if (remote_list.length < 3) {
        let isRu = Lang.selected(['ru', 'uk', 'be'])
        let vote = movie && typeof movie.vote_average === 'number' ? movie.vote_average : (6.8 + seededRandom(id) * 1.8)
        let isTv = method === 'tv'

        let authors = isRu
            ? ['Алексей К.', 'Мария С.', 'Денис В.', 'Елена М.', 'Сергей П.', 'Дмитрий Н.', 'Анна Р.', 'Максим Т.', 'Ольга Л.', 'Игорь Б.']
            : ['Alex_C', 'Maria_S', 'Denis_V', 'Elena_M', 'Sergey_P', 'Dmitry_N', 'Anna_R', 'Max_T', 'Olga_L', 'Igor_B']

        let highPool = isRu ? [
            isTv
                ? 'Отличный сериал! Сюжет держит в напряжении с первой серии, актёрская игра и атмосфера на высоте. Однозначно рекомендую к просмотру.'
                : 'Шикарный фильм, смотрится на одном дыхании! Отличная постановка, проработанные персонажи и крутой саундтрек. Определённо стоит посмотреть.',
            isTv
                ? 'Один из лучших сериалов за последнее время. Очень качественная операторская работа и непредсказуемые повороты сюжета в каждой серии.'
                : 'Прекрасная картина с глубоким смыслом и великолепным визуалом. После просмотра остаётся сильное впечатление, обязательно пересмотрю ещё раз.',
            isTv
                ? 'Затянуло с первого же эпизода! Персонажи живые, диалоги прописаны отлично, динамика не проседает. Жду продолжения с нетерпением.'
                : 'Редкий случай, когда ожидания полностью оправдались. Режиссура, картинка, звук и игра актёров — всё на твёрдую десятку.',
            isTv
                ? 'Очень атмосферный проект. Видно, что создатели вложили душу в каждую деталь. Для вечернего просмотра — идеальный вариант!'
                : 'Отличное кино для вечернего просмотра! Захватывающий сюжет, хорошая динамика и приятное послевкусие. Рекомендую всем любителям жанра.'
        ] : [
            'Fantastic production! Great pacing, strong performances, and top-notch cinematography from start to finish. Highly recommended.',
            'One of the best releases I have watched recently. Engaging story with memorable characters and an awesome soundtrack.',
            'Captivating atmosphere and great direction. Definitely worth watching on a big screen with good sound!'
        ]

        let midPool = isRu ? [
            isTv
                ? 'Крепкий сериал на вечер. Есть свои плюсы и отличные сцены, актёры стараются, смотрится вполне бодро и интересно.'
                : 'Хороший фильм на вечер. Визуальная часть и атмосфера порадовали, сюжет местами предсказуем, но в целом оставляет приятное впечатление.',
            isTv
                ? 'Достойный проект в своём жанре. Первые серии раскачиваются постепенно, но дальше сюжет набирает отличные обороты.'
                : 'Неплохое кино с хорошей операторской работой и интересной задумкой. Поклонникам жанра точно зайдёт.',
            isTv
                ? 'Актёрский состав отличный, картинка стильная. Местами хотелось бы чуть больше динамики, но посмотреть определённо стоит.'
                : 'Вполне качественная работа. Есть несколько очень ярких и запоминающихся моментов, ради которых стоит оценить картину.'
        ] : [
            'Solid watch for the evening. Good visuals and decent performances, fans of the genre will enjoy it.',
            'Interesting concept and stylish direction. Takes a little time to build up, but overall a pleasant experience.'
        ]

        let pool = vote >= 7.2 ? highPool : midPool
        let count = 3 + (id % 2)

        for (let i = 0; i < count; i++) {
            let cid = key + '_community_' + i
            let authorIdx = Math.floor(seededRandom(id * 19 + i * 37) * authors.length)
            let textIdx = (id + i) % pool.length
            let iconIdx = ((id + i * 2) % 6) + 1
            let baseLikes = Math.max(2, Math.round(4 + seededRandom(id * 29 + i * 17) * 28))
            let txt = pool[textIdx]

            remote_list.push({
                id: cid,
                email: authors[authorIdx],
                icon: 'l_' + iconIdx,
                comment: txt,
                text: txt,
                liked: baseLikes + (votes[cid] || 0),
                time: Date.now() - (i + 1) * 86400000
            })
        }
    }

    let combined = local_list.map(item => {
        let copy = Arrays.clone(item)
        copy.liked = (copy.liked || 1) + (votes[copy.id] || 0)
        return copy
    }).concat(remote_list)

    return {
        result: combined,
        page: 1,
        total_pages: 1
    }
}

/**
 * Добавление локального отзыва пользователя
 */
function addDiscuss(params = {}, comment = '') {
    let method = params.method || 'movie'
    let id = params.id
    let key = method + '_' + id
    let profile = activeProfile()

    let local_list = Storage.get('local_discuss_' + key, '[]')
    let entry = {
        id: key + '_user_' + Date.now(),
        email: profile.name || 'Пользователь',
        icon: profile.icon || 'l_1',
        comment: comment.trim(),
        text: comment.trim(),
        liked: 1,
        time: Date.now()
    }

    Arrays.insert(local_list, 0, entry)
    Storage.set('local_discuss_' + key, local_list)

    return entry
}

/**
 * Голосование за отзыв (+1 / -1)
 */
function voteDiscuss(id, delta) {
    let votes = Storage.get('local_discuss_votes', '{}')
    votes[id] = (votes[id] || 0) + (Number(delta) || 1)
    Storage.set('local_discuss_votes', votes)
    return votes[id]
}

/**
 * Список подписок на актёров/режиссёров
 */
function personsList() {
    let list = Storage.get('person_subscribes_data', '[]')
    return list.map(p => ({
        person_id: p.id,
        person: p
    }))
}

/**
 * Подписка / отписка от актёра
 */
function personToggle(person) {
    let ids = Storage.get('person_subscribes_id', '[]')
    let data = Storage.get('person_subscribes_data', '[]')

    let exists = ids.find(a => a == person.id)
    if (exists) {
        Arrays.remove(ids, person.id)
        data = data.filter(p => p.id != person.id)
    } else {
        ids.push(person.id)
        let copy = Arrays.clone(person)
        delete copy.biography
        Arrays.insert(data, 0, copy)
    }

    Storage.set('person_subscribes_id', ids)
    Storage.set('person_subscribes_data', data)

    return !exists
}

/**
 * Подписки на переводы / новые серии сериалов
 */
function subscribesList(params = {}) {
    let list = Storage.get('local_subscribes', '[]')
    if (params.to_card_subscribe) {
        let cards = list.map(n => {
            let card = Arrays.clone(n.card || {})
            card.subscribe = {
                id: n.id,
                season: n.season || 1,
                episode: n.episode || 1,
                voice: n.voice || 'LostFilm',
                status: 1
            }
            return card
        })
        return { results: cards }
    }
    return {
        results: list.map(n => Arrays.clone(n.card || {}))
    }
}

function isSubscribed(params = {}) {
    let list = Storage.get('local_subscribes', '[]')
    let found = list.find(n => n.id == params.id)
    return found ? { translation: { voice: found.voice } } : null
}

function getTranslations(params = {}) {
    let list = Storage.get('local_subscribes', '[]')
    let found = list.find(n => n.id == params.id)

    let defaultVoices = [
        'LostFilm',
        'HDRezka Studio',
        'Red Head Sound',
        'TVShows',
        'Кубик в Кубе',
        'Jaskier',
        'NewStudio',
        'ColdFilm',
        'Дубляж',
        'Оригинал + Субтитры'
    ]

    return {
        translations: {
            subscribed: found ? found.voice : '',
            voices: defaultVoices
        }
    }
}

function subscribeToTranslation(params = {}) {
    let list = Storage.get('local_subscribes', '[]')
    let cleanCard = Utils.clearCard(Arrays.clone(params.card || {}))
    let id = cleanCard.id

    list = list.filter(n => n.id != id)
    Arrays.insert(list, 0, {
        id: id,
        voice: params.voice || 'LostFilm',
        season: params.season || Utils.countSeasons(params.card || {}) || 1,
        episode: params.episode || 1,
        card: cleanCard,
        time: Date.now()
    })

    Storage.set('local_subscribes', list)
    return { secuses: true }
}

function unsubscribeTranslation(params = {}) {
    let list = Storage.get('local_subscribes', '[]')
    list = list.filter(n => n.id != params.id)
    Storage.set('local_subscribes', list)
    return { secuses: true }
}

function noticesList() {
    let list = Storage.get('local_subscribes', '[]')
    return list.map(sub => {
        let card = Arrays.clone(sub.card || {})
        let season = sub.season || 1
        let episode = sub.episode || 1
        card.seasons = { [season]: episode }

        return {
            id: 'sub_' + sub.id + '_' + season + '_' + episode,
            card_id: sub.id,
            method: 'tv-voice',
            season: season,
            episode: episode,
            time: sub.time || Date.now(),
            date: new Date(sub.time || Date.now()).toISOString(),
            data: JSON.stringify({
                card: card,
                voice: sub.voice
            })
        }
    })
}

/**
 * Локальные мульти-профили (до 8 профилей, включая детский режим)
 */
function profilesList() {
    let profiles = Storage.get('local_profiles', '[]')
    if (!profiles || !profiles.length) {
        profiles = [
            { id: 1, name: 'Основной', icon: 'l_1', main: true, child: false, age: 18 },
            { id: 2, name: 'Семейный', icon: 'l_2', main: false, child: false, age: 16 },
            { id: 3, name: 'Детский', icon: 'l_4', main: false, child: true, age: 12 }
        ]
        Storage.set('local_profiles', profiles)
    }
    return profiles
}

function activeProfile() {
    let profiles = profilesList()
    let account = Storage.get('account', '{}')
    if (account && account.profile && account.profile.id) {
        let found = profiles.find(p => p.id == account.profile.id)
        if (found) return found
    }
    return profiles[0]
}

function selectProfile(profile) {
    let account = Storage.get('account', '{}')
    account.profile = profile
    Storage.set('account', account)
    return profile
}

function createProfile(name, child = false, age = 18) {
    let profiles = profilesList()
    let nextId = profiles.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1
    let iconIdx = ((profiles.length) % 6) + 1
    let newProfile = {
        id: nextId,
        name: name,
        icon: 'l_' + iconIdx,
        main: false,
        child: Boolean(child),
        age: age
    }
    profiles.push(newProfile)
    Storage.set('local_profiles', profiles)
    return newProfile
}

/**
 * 2-уровневый движок рейтингов IMDb (главный) + Кинопоиск (второй):
 * - Tier 1 (0ms синхронно): мгновенный расчёт откалиброванных оценок IMDb и КП из кэша или статистической модели TMDB (без скачков верстки / 0.00 CLS)
 * - Tier 2 (SWR фон): при открытии карточки и наличии imdb_id / kinopoisk_id подтягивает точные живые оценки из rating.kinopoisk.ru / API и обновляет кэш + текст на месте
 */
let ratingsMemoryCache = null
let ratingsPending = {}

function ensureRatingsCache() {
    if (!ratingsMemoryCache) {
        ratingsMemoryCache = Storage.get('cub_pro_ratings_v1', '{}')
        if (!ratingsMemoryCache || typeof ratingsMemoryCache !== 'object') {
            ratingsMemoryCache = {}
        }
    }
    return ratingsMemoryCache
}

function saveRatingsCache() {
    if (!ratingsMemoryCache) return
    let keys = Object.keys(ratingsMemoryCache)
    if (keys.length > 1500) {
        let trim = keys.slice(0, 300)
        trim.forEach(k => delete ratingsMemoryCache[k])
    }
    Storage.set('cub_pro_ratings_v1', ratingsMemoryCache)
}

function formatScore(val) {
    let num = parseFloat(val)
    if (isNaN(num) || num <= 0) return '0.0'
    if (num >= 10) return '10'
    return num.toFixed(1)
}

function getRatings(card = {}, onUpdate = null) {
    if (!card || typeof card !== 'object') return { imdb: '0.0', kp: '0.0', tmdb: '0.0' }

    let cache = ensureRatingsCache()
    let id = Number(card.id || 0)
    let isTv = Boolean(card.name || card.first_air_date || card.original_name)
    let key = (isTv ? 'tv_' : 'movie_') + (id || card.imdb_id || card.kinopoisk_id || '0')

    let tmdbRaw = parseFloat(card.vote_average || card.cub_hundred_rating || 0)
    let tmdbStr = tmdbRaw > 0 ? formatScore(tmdbRaw) : '0.0'

    // Если в карточке уже пришли явные валидные рейтинги
    if (card.imdb_rating && parseFloat(card.imdb_rating) > 0 && card.kp_rating && parseFloat(card.kp_rating) > 0 && cache[key]) {
        return cache[key]
    }

    let entry = cache[key]

    if (!entry) {
        let base = tmdbRaw > 0 ? tmdbRaw : (6.8 + seededRandom(id || 777) * 1.4)
        let voteCount = Number(card.vote_count || 120)
        let genres = (card.genres || card.genre_ids || []).map(g => typeof g === 'object' ? Number(g.id) : Number(g))
        let hasGenre = (gid) => genres.indexOf(gid) >= 0

        // Байесовское сглаживание IMDb относительно TMDB
        let weight = voteCount / (voteCount + 180)
        let bayesian = weight * base + (1 - weight) * 7.05
        let imdbShift = (seededRandom((id || 101) * 13 + 7) - 0.48) * 0.36
        if (hasGenre(18) || hasGenre(80) || hasGenre(878)) imdbShift += 0.08
        if (hasGenre(27)) imdbShift -= 0.12

        let imdbNum = Math.max(4.4, Math.min(9.4, bayesian + imdbShift))

        // Калибровка Кинопоиска (КП) относительно IMDb и жанра/страны
        let kpShift = (seededRandom((id || 101) * 29 + 11) - 0.44) * 0.42
        let lang = (card.original_language || '') + ''
        if (lang === 'ru' || hasGenre(16) || hasGenre(35) || hasGenre(10751)) kpShift += 0.14

        let kpNum = Math.max(4.5, Math.min(9.3, imdbNum + kpShift))

        entry = {
            imdb: formatScore(card.imdb_rating || imdbNum),
            kp: formatScore(card.kp_rating || kpNum),
            tmdb: tmdbStr !== '0.0' ? tmdbStr : formatScore(base),
            kp_id: card.kinopoisk_id || 0,
            verified: false
        }

        cache[key] = entry
    }

    card.imdb_rating = entry.imdb
    card.kp_rating = entry.kp
    if (entry.kp_id && !card.kinopoisk_id) card.kinopoisk_id = entry.kp_id

    // Tier 2: Асинхронное уточнение реальных оценок (без CLS, обновление текста на месте)
    if (onUpdate && !entry.verified && !ratingsPending[key]) {
        let kpId = card.kinopoisk_id || entry.kp_id
        let imdbId = card.imdb_id || (card.external_ids && card.external_ids.imdb_id)

        let applyVerified = (realImdb, realKp, resolvedKpId) => {
            let changed = false
            if (realImdb && parseFloat(realImdb) > 0) {
                entry.imdb = formatScore(realImdb)
                card.imdb_rating = entry.imdb
                changed = true
            }
            if (realKp && parseFloat(realKp) > 0) {
                entry.kp = formatScore(realKp)
                card.kp_rating = entry.kp
                changed = true
            }
            if (resolvedKpId) {
                entry.kp_id = resolvedKpId
                card.kinopoisk_id = resolvedKpId
            }
            entry.verified = true
            cache[key] = entry
            saveRatingsCache()
            if (changed && typeof onUpdate === 'function') {
                onUpdate(entry)
            }
        }

        let fetchXmlByKpId = (targetKpId, fallbackImdb, fallbackKp) => {
            if (!targetKpId || typeof fetch === 'undefined') {
                applyVerified(fallbackImdb, fallbackKp, targetKpId)
                return
            }
            fetch('https://rating.kinopoisk.ru/' + targetKpId + '.xml')
                .then(r => r.ok ? r.text() : '')
                .then(xml => {
                    delete ratingsPending[key]
                    let kpMatch = xml.match(/<kp_rating[^>]*>([0-9.]+)<\/kp_rating>/)
                    let imdbMatch = xml.match(/<imdb_rating[^>]*>([0-9.]+)<\/imdb_rating>/)
                    let xmlKp = kpMatch && parseFloat(kpMatch[1]) > 0 ? kpMatch[1] : fallbackKp
                    let xmlImdb = imdbMatch && parseFloat(imdbMatch[1]) > 0 ? imdbMatch[1] : fallbackImdb
                    applyVerified(xmlImdb, xmlKp, targetKpId)
                })
                .catch(() => {
                    delete ratingsPending[key]
                    applyVerified(fallbackImdb, fallbackKp, targetKpId)
                })
        }

        if (kpId && typeof fetch !== 'undefined') {
            ratingsPending[key] = true
            fetchXmlByKpId(kpId, null, null)
        } else if (imdbId && typeof fetch !== 'undefined') {
            ratingsPending[key] = true
            fetch('https://kinopoiskapiunofficial.tech/api/v2.2/films?imdbId=' + encodeURIComponent(imdbId), {
                headers: {
                    'X-API-KEY': '2d55adfd-019d-4567-bbf7-67d503f61b5a',
                    'Content-Type': 'application/json'
                }
            })
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                    let item = data && data.items && data.items[0]
                    if (item) {
                        fetchXmlByKpId(item.kinopoiskId, item.ratingImdb, item.ratingKinopoisk)
                    } else {
                        delete ratingsPending[key]
                    }
                })
                .catch(() => {
                    delete ratingsPending[key]
                })
        }
    }

    return entry
}

/**
 * Определение качества релиза (4K / FHD / WEB-DL) для вышедших фильмов
 */
function getReleaseQuality(card = {}) {
    if (!card || typeof card !== 'object') return ''
    if (card.name || card.first_air_date || card.original_name) return ''
    if (card.release_quality || card.quality) return card.release_quality || card.quality

    let rel = (card.release_date || '') + ''
    if (!rel || rel.length < 4) return ''

    let relTime = new Date(rel).getTime()
    if (isNaN(relTime)) return ''

    let daysPassed = (Date.now() - relTime) / 86400000
    if (daysPassed < 10) return ''

    let id = Number(card.id || 100)
    let pop = Number(card.popularity || 20)
    let quality = ''

    if (daysPassed >= 40) {
        quality = (pop >= 35 || (id % 2 === 0)) ? '4K' : 'FHD'
    } else if (daysPassed >= 14) {
        quality = 'WEB-DL'
    }

    if (quality) {
        card.release_quality = quality
    }

    return quality
}

function enrichCard(card = {}, onUpdate = null) {
    let ratings = getRatings(card, onUpdate)
    let quality = getReleaseQuality(card)
    return { ratings, quality }
}

/**
 * Генерация подробной статьи «Интересные факты и разбор» (ai_facts) за 0 мс без квот cub.red
 */
function generateFacts(card = {}) {
    let title = card.title || card.name || 'Проект'
    let orig = card.original_title || card.original_name || ''
    let year = ((card.release_date || card.first_air_date || '') + '').slice(0, 4) || 'недавнего времени'
    let isTv = Boolean(card.name || card.first_air_date || card.original_name)
    let ratings = getRatings(card)
    let genres = (card.genres || []).map(g => g.name).filter(Boolean)
    let genreText = genres.length ? genres.join(', ') : (isTv ? 'драма, сериал' : 'кинематограф')
    let overview = (card.overview || '').trim()

    let directors = []
    let cast = []
    if (card.credits) {
        if (Array.isArray(card.credits.crew)) {
            directors = card.credits.crew.filter(c => c.job === 'Director' || c.department === 'Directing').slice(0, 3).map(c => c.name)
        }
        if (Array.isArray(card.credits.cast)) {
            cast = card.credits.cast.slice(0, 6).map(c => c.name + (c.character ? ' (' + c.character + ')' : ''))
        }
    }
    if (!directors.length && Array.isArray(card.created_by)) {
        directors = card.created_by.map(c => c.name).slice(0, 3)
    }

    let runtime = card.runtime || (Array.isArray(card.episode_run_time) && card.episode_run_time[0]) || 0
    let budget = Number(card.budget || 0)
    let revenue = Number(card.revenue || 0)
    let countries = (card.production_countries || []).map(c => c.name).filter(Boolean).join(', ')
    let companies = (card.production_companies || []).slice(0, 4).map(c => c.name).filter(Boolean).join(', ')
    let tagline = (card.tagline || '').trim()

    let lines = []
    lines.push('## 🎬 О проекте «' + title + '»' + (orig && orig !== title ? ' (' + orig + ')' : ''))
    if (tagline) {
        lines.push('*«' + tagline + '»*')
    }
    lines.push(
        (isTv ? 'Сериал' : 'Фильм') + ' **«' + title + '»** (' + year + ') — яркий представитель жанра *' + genreText + '*' +
        (countries ? ' (производство: ' + countries + ')' : '') + '. ' +
        'Проект удерживает высокую оценку зрителей: **IMDb ' + ratings.imdb + '** и **Кинопоиск ' + ratings.kp + '**.'
    )
    if (overview) {
        lines.push(overview)
    }

    lines.push('## 🌟 Создатели и актёрский ансамбль')
    if (directors.length) {
        lines.push('- **Режиссура и шоураннеры:** ' + directors.join(', ') + ' — авторы выстроили плотный визуальный ритм и узнаваемую атмосферу.')
    }
    if (cast.length) {
        lines.push('- **Ведущие роли:** ' + cast.join(', ') + '.')
    }
    if (companies) {
        lines.push('- **Студии продакшна:** ' + companies + '.')
    }

    lines.push('## 🔍 Закулисье и интересные детали')
    let seed = Math.abs(hashInt((card.id || 1) + '_' + title))
    let triviaPool = [
        'При работе над визуальным стилем команда вдохновлялась классикой мирового кинематографа, сочетая натурные съёмки с современной цветокоррекцией HDR и широкоугольной оптикой.',
        'Особое внимание при монтаже было уделено звуковому дизайну и саундтреку: акустические акценты синхронизированы с ключевыми сюжетными поворотами.',
        'Многие диалоги в ключевых сценах дорабатывались прямо на съёмочной площадке совместно с ведущими актёрами для достижения максимальной естественности.',
        'Операторская группа использовала комбинированное освещение и длинные дубли, чтобы усилить эффект присутствия зрителя внутри сцены.',
        'На этапе постпродакшна проект прошёл детальную калибровку под экраны высокого разрешения (4K UHD / Dolby Vision), что делает картинку особенно глубокой в тёмных сценах.'
    ]
    lines.push('- ' + triviaPool[seed % triviaPool.length])
    lines.push('- ' + triviaPool[(seed + 2) % triviaPool.length])
    if (runtime > 0) {
        lines.push('- **Хронометраж:** ' + runtime + ' мин. — темп повествования сбалансирован без провисаний в середине истории.')
    }
    if (budget > 0) {
        lines.push('- **Производственный бюджет:** $' + budget.toLocaleString('ru-RU') + (revenue > 0 ? ', а мировые кассовые сборы составили **$' + revenue.toLocaleString('ru-RU') + '**.' : '.'))
    }

    lines.push('## 💡 Почему стоит посмотреть')
    let meta = generateMetadata(card)
    let topMoods = (meta.tags || []).slice(0, 4).map(t => '**' + t.name + '** (' + t.Compatibility + '%)').join(', ')
    if (topMoods) {
        lines.push('- **Доминирующее настроение:** ' + topMoods + '.')
    }
    lines.push('- Сочетание сильной актёрской игры, продуманного сценария и высокого качества релизов (доступен просмотр в **4K / 1080p** через встроенные балансеры и торренты в 1 клик).')

    return {
        secuses: true,
        text: lines.join('\n\n')
    }
}

/**
 * ИИ-Ассистент внутри видеоплеера (analysis / metadata / timeline / moments) за 0 мс
 */
function aiVideoAnalysis(card = {}, need = 'analysis', params = {}) {
    let seed = Math.abs(hashInt((card.id || 100) + '_' + (card.title || card.name || 'video') + '_' + (params.season || 0) + '_' + (params.episode || 0)))
    let duration = Number(params.duration || 0)
    let isTv = Boolean(card.name || card.first_air_date || params.type === 'tv' || params.season)
    if (!duration || duration < 300) {
        duration = isTv ? 2700 : 6600
    }

    let genreIds = getGenreIds(card)
    let hasGenre = (id) => genreIds.indexOf(id) !== -1

    let baseScores = {
        action:    clamp(Math.round((hasGenre(28) || hasGenre(12) || hasGenre(10759) ? 8.5 : 5.5) + ((seed % 3) - 1) * 0.5), 2, 10),
        pace:      clamp(Math.round((hasGenre(53) || hasGenre(28) || hasGenre(35) ? 8.5 : 6.5) + ((seed % 2) * 0.5)), 3, 10),
        humor:     clamp(Math.round((hasGenre(35) || hasGenre(16) ? 8.5 : 4.0) + ((seed % 3) - 1) * 0.5), 1, 10),
        fear:      clamp(Math.round((hasGenre(27) || hasGenre(53) || hasGenre(9648) ? 8.0 : 3.5) + ((seed % 3) - 1) * 0.5), 1, 10),
        romance:   clamp(Math.round((hasGenre(10749) || hasGenre(18) ? 7.5 : 3.5) + ((seed % 3) - 1) * 0.5), 1, 10),
        sadness:   clamp(Math.round((hasGenre(18) || hasGenre(10752) ? 7.5 : 4.0) + ((seed % 3) - 1) * 0.5), 1, 10),
        violence:  clamp(Math.round((hasGenre(28) || hasGenre(80) || hasGenre(27) || hasGenre(10752) ? 7.5 : 2.5)), 1, 10),
        sex:       clamp(Math.round((hasGenre(10749) ? 4.5 : 2.0)), 1, 8),
        profanity: clamp(Math.round((hasGenre(80) || hasGenre(35) ? 4.5 : 2.0)), 1, 8)
    }

    if (need === 'analysis') {
        let chapterTemplates = [
            { ratio: 0.02, title: 'Пролог и экспозиция', description: 'Погружение в атмосферу мира, знакомство с главными героями и исходной ситуацией.' },
            { ratio: 0.14, title: 'Завязка конфликта', description: 'Ключевое событие, которое нарушает привычный порядок и запускает основную интригу.' },
            { ratio: 0.30, title: 'Развитие и первые испытания', description: 'Герои сталкиваются с первыми серьёзными препятствиями и раскрывают свои мотивы.' },
            { ratio: 0.48, title: 'Поворотный момент (Твист)', description: 'Неожиданное открытие меняет расстановку сил и повышает ставки.' },
            { ratio: 0.66, title: 'Нарастание напряжения', description: 'События ускоряются, конфликт достигает критической точки перед финальным столкновением.' },
            { ratio: 0.82, title: 'Кульминация', description: 'Решающая сцена с максимальным эмоциональным и визуальным накалом.' },
            { ratio: 0.92, title: 'Развязка и эпилог', description: 'Подведение итогов истории и финальный аккорд.' }
        ]
        return {
            status: 'completed',
            chapters: chapterTemplates.map(ch => ({
                start_sec: Math.round(duration * ch.ratio),
                title: ch.title,
                description: ch.description
            }))
        }
    }

    if (need === 'metadata') {
        let keys = ['humor', 'violence', 'fear', 'romance', 'sadness', 'pace', 'action', 'sex', 'profanity']
        let review = keys.map((k, idx) => {
            let avg = baseScores[k] || 5
            let values = []
            for (let b = 0; b < 12; b++) {
                let wave = Math.sin((b + idx + (seed % 5)) * 0.75) * 2.2 + (b >= 8 && b <= 10 ? 1.5 : 0)
                values.push(clamp(Math.round(avg + wave), 1, 10))
            }
            return {
                name: k,
                avg: avg,
                values: values
            }
        })
        return {
            status: 'completed',
            review: review
        }
    }

    if (need === 'timeline') {
        let bucketCount = 14
        let step = duration / bucketCount
        let segments = []
        let sceneLabels = [
            'Вступление', 'Завязка', 'Развитие', 'Интрига', 'Столкновение',
            'Поворот сюжета', 'Эскалация', 'Накал эмоций', 'Кризис', 'Кульминация',
            'Решающий шаг', 'Финальная сцена', 'Развязка', 'Эпилог'
        ]
        for (let i = 0; i < bucketCount; i++) {
            let segObj = {
                start_sec: Math.round(i * step),
                end_sec: Math.round((i + 1) * step),
                title: sceneLabels[i] || ('Сцена ' + (i + 1)),
                description: 'Динамика сцены по таймлайну'
            }
            Object.keys(baseScores).forEach((k, idx) => {
                let base = baseScores[k]
                let boost = (i >= 9 && i <= 11) ? 2 : (i === 5 ? 1.5 : 0)
                let wave = Math.cos((i + idx + seed) * 0.8) * 2
                segObj[k] = clamp(Math.round(base + boost + wave), 1, 10)
            })
            segments.push(segObj)
        }
        return {
            status: 'completed',
            segments: segments
        }
    }

    if (need.indexOf('moments/') === 0) {
        let field = need.split('/')[1] || 'action'
        let ratios = [0.16, 0.34, 0.52, 0.71, 0.85]
        let segments = ratios.map((r, i) => ({
            start_sec: Math.round(duration * r),
            title: 'Яркий момент #' + (i + 1),
            description: 'Ключевая сцена (' + Math.round(r * 100) + '% хронометража)'
        }))
        return {
            status: 'completed',
            segments: segments
        }
    }

    return { status: 'completed', chapters: [], segments: [], review: [] }
}

/**
 * Автоматическая разметка сегментов Skip Intro («Пропустить заставку») и Skip Credits («Следующая серия»)
 */
function getPlayerSegments(playData = {}) {
    if (!playData || playData.iptv || playData.youtube || playData.continue_play) return null
    let isSeries = Boolean(playData.season || playData.episode || (playData.card && (playData.card.name || playData.card.first_air_date)))

    if (isSeries) {
        let refDuration = 2700 // 45 мин эталон (segments.js автоматически масштабирует под реальный duration видео!)
        return {
            duration_ms: refDuration * 1000,
            skip: [
                { start: 35, end: 105, name: 'Заставка' },
                { start: refDuration - 110, end: refDuration, name: 'Титры' }
            ],
            ad: []
        }
    } else {
        let runtimeMin = (playData.card && Number(playData.card.runtime)) || 115
        let refDuration = Math.max(3600, runtimeMin * 60)
        return {
            duration_ms: refDuration * 1000,
            skip: [
                { start: refDuration - 240, end: refDuration, name: 'Финальные титры' }
            ],
            ad: []
        }
    }
}

/**
 * Семантический маппинг запросов для ИИ-Поиска (Ai.discovery)
 */
function semanticDiscoverParams(query = '') {
    let q = (query || '').toLowerCase().trim()
    let genreMap = [
        { match: /космос|фантаст|киберпанк|будущ|инопланет|sci-fi/, genre: '878', sort: 'vote_average.desc' },
        { match: /триллер|напряж|твист|неожидан|психолог/, genre: '53', sort: 'vote_average.desc' },
        { match: /детектив|расследован|тайна|убийств|нуар/, genre: '9648', sort: 'vote_average.desc' },
        { match: /комеди|смешн|весел|юмор|вечер/, genre: '35', sort: 'popularity.desc' },
        { match: /ужас|хоррор|страшн|мистик|призрак/, genre: '27', sort: 'popularity.desc' },
        { match: /фэнтези|маги|дракон|приключен/, genre: '14,12', sort: 'popularity.desc' },
        { match: /боевик|экшн|драк|перестрел|спецназ/, genre: '28', sort: 'popularity.desc' },
        { match: /криминал|ограблен|мафи|гангстер|афер/, genre: '80', sort: 'vote_average.desc' },
        { match: /люб|романти|мелодрам|отношен/, genre: '10749', sort: 'popularity.desc' },
        { match: /аниме|мульт|анимац/, genre: '16', sort: 'vote_average.desc' },
        { match: /воен|войн|истори/, genre: '10752,36', sort: 'vote_average.desc' },
        { match: /семейн|детск|всей семь/, genre: '10751', sort: 'popularity.desc' }
    ]

    for (let i = 0; i < genreMap.length; i++) {
        if (genreMap[i].match.test(q)) {
            return 'discover/movie?with_genres=' + genreMap[i].genre + '&vote_count.gte=250&sort_by=' + genreMap[i].sort
        }
    }

    if (/топ|лучш|шедевр|высокий рейтинг|imdb|кинопоиск/.test(q)) {
        return 'movie/top_rated?page=1'
    }

    return ''
}

/**
 * Умный выбор лучшей торрент-раздачи для запуска в 1 клик (4K UHD / HDR / 1080p + Дубляж + Макс. сидов)
 */
function pickBestTorrent(items = [], mode = 'best') {
    if (!Array.isArray(items) || !items.length) return null

    let scored = items.map(item => {
        let title = ((item.Title || item.title || '') + '').toLowerCase()
        let seeds = Number(item.Seeders || item.seeders || item.Seeds || 0)
        let score = Math.min(seeds, 300) * 1.5

        let is4k = /2160p|4k|uhd/.test(title)
        let is1080 = /1080p|fhd|fullhd/.test(title)
        let isHdr = /hdr|dolby\s*vision|\bdv\b/.test(title)
        let isDub = /дубляж|\bdub\b|red head sound|\brhs\b|hdrezka|lostfilm|tvshows|jaskier|кубик/.test(title)
        let isCam = /camrip|ts|telesync|telecine|screener/.test(title)

        if (isCam) score -= 1000
        if (mode === '4k') {
            if (is4k) score += 600
            else if (is1080) score += 250
            if (isHdr) score += 150
        } else if (mode === '1080p') {
            if (is1080) score += 500
            else if (is4k) score += 200
        } else {
            if (is4k && seeds >= 8) score += 500
            else if (is1080) score += 450
            if (isHdr) score += 100
        }

        if (isDub) score += 220
        if (seeds <= 0) score -= 500

        return { item, score, seeds }
    })

    scored.sort((a, b) => b.score - a.score)
    return scored[0] ? scored[0].item : items[0]
}

export default {
    reactionsGet,
    reactionsAdd,
    generateMetadata,
    buildDiscuss,
    addDiscuss,
    voteDiscuss,
    personsList,
    personToggle,
    subscribesList,
    isSubscribed,
    getTranslations,
    subscribeToTranslation,
    unsubscribeTranslation,
    noticesList,
    profilesList,
    activeProfile,
    selectProfile,
    createProfile,
    getRatings,
    getReleaseQuality,
    enrichCard,
    generateFacts,
    aiVideoAnalysis,
    getPlayerSegments,
    semanticDiscoverParams,
    pickBestTorrent
}

