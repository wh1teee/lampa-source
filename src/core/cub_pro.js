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
    createProfile
}
