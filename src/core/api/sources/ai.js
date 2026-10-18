import Lang from '../../lang'
import Api from '../../account/api'
import TMDB from './tmdb'
import CubPro from '../../cub_pro'
import Activity from '../../../interaction/activity/activity'

function facts(card_id, card_type, callback, error){
    let active = Activity.active && Activity.active()
    let activeCard = active && (active.movie || active.card)

    if(activeCard && Number(activeCard.id) === Number(card_id) && (activeCard.overview || activeCard.genres)){
        callback(CubPro.generateFacts(activeCard))
        return
    }

    let method = (card_type === 'tv' ? 'tv' : 'movie') + '/' + card_id + '?append_to_response=credits,keywords,external_ids'
    TMDB.get(method, {}, (json)=>{
        callback(CubPro.generateFacts(json || { id: card_id }))
    }, ()=>{
        callback(CubPro.generateFacts(activeCard || { id: card_id }))
    })
}

function recommendations(card_id, card_type, callback, error){
    let type = card_type === 'tv' ? 'tv' : 'movie'
    TMDB.get(type + '/' + card_id + '?append_to_response=recommendations,similar', {}, (json)=>{
        let rec = (json && json.recommendations && json.recommendations.results) || []
        let sim = (json && json.similar && json.similar.results) || []
        let seen = {}
        let merged = []

        rec.concat(sim).forEach(item => {
            if(item && item.id && !seen[item.id] && Number(item.id) !== Number(card_id)){
                seen[item.id] = true
                item.source = 'tmdb'
                CubPro.enrichCard(item)
                merged.push(item)
            }
        })

        merged.sort((a, b) => Number(b.vote_average || 0) - Number(a.vote_average || 0))

        callback({
            results: merged.slice(0, 20),
            total_pages: 1
        })
    }, ()=>{
        callback({ results: [], total_pages: 1 })
    })
}

function search(query, callback, error){
    let q = (query || '').trim()
    if(!q) return callback({ results: [] })

    let semanticUrl = CubPro.semanticDiscoverParams(q)
    let results = []
    let seen = {}

    let appendItems = (list) => {
        (list || []).forEach(item => {
            if(item && item.id && item.media_type !== 'person' && !seen[item.id] && (item.poster_path || item.backdrop_path)){
                seen[item.id] = true
                item.source = 'tmdb'
                CubPro.enrichCard(item)
                results.push(item)
            }
        })
    }

    TMDB.get('search/multi', { query: q }, (searchJson)=>{
        appendItems(searchJson && searchJson.results)

        if(semanticUrl){
            TMDB.get(semanticUrl, {}, (discJson)=>{
                appendItems(discJson && discJson.results)
                callback({ results: results.slice(0, 20) })
            }, ()=>{
                callback({ results: results.slice(0, 20) })
            })
        }
        else{
            callback({ results: results.slice(0, 20) })
        }
    }, ()=>{
        if(semanticUrl){
            TMDB.get(semanticUrl, {}, (discJson)=>{
                appendItems(discJson && discJson.results)
                callback({ results: results.slice(0, 20) })
            }, ()=>{
                callback({ results: [] })
            })
        }
        else callback({ results: [] })
    })
}

function discovery(){
    let source = {
        title: Lang.translate('title_ai_assistant'),
        search: (params, oncomplite)=>{
            source.params.nofound = Lang.translate('search_nofound')

            search(decodeURIComponent(params.query),(json)=>{
                json.title = Lang.translate('title_ai_assistant')
                json.results.forEach(element => {
                    element.source = 'tmdb'
                })

                oncomplite(json.results.length ? [json] : [])
            },()=>{
                oncomplite([])
            })
        },
        onCancel: ()=>{
            Api.clear()
        },
        params: {
            lazy: true,
            save: true,
            start_typing: Lang.translate('ai_search_start_typing')
        }
    }

    return source
}

export default {
    facts,
    recommendations,
    discovery
}

