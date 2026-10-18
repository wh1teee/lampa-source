import DB from './db'
import Params from './params'
import M3u8 from './m3u8'

class Api{
    static network = new Lampa.Reguest()
    static api_url = Lampa.Utils.protocol() + Lampa.Manifest.cub_domain + '/api/iptv/'

    static get(method, catch_error){
        return new Promise((resolve)=>{
            resolve()
        })
    }

    static time(call){
        call({time: Date.now()})
    }

    static m3u(url){
        return this.m3uClient(url)
    }

    static defaultPlaylists(){
        return [
            {
                id: 'cubpro_hd_builtin',
                custom: true,
                builtin: true,
                url: 'builtin://cubpro_hd',
                name: 'CubPro VIP HD (Кино, Наука, Музыка, 4K)'
            },
            {
                id: 'iptv_org_rus',
                custom: true,
                url: 'https://iptv-org.github.io/iptv/languages/rus.m3u',
                name: 'ТВ-каналы на русском (IPTV-org HD)'
            }
        ]
    }

    static builtinPlaylistData(){
        let channels = [
            { id: 'redbull_tv', name: 'Red Bull TV HD (Экстрим и Документальное)', group: 'Познавательные и Спорт', url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8', logo: null, catchup: {}, tvg: {} },
            { id: 'nasa_tv', name: 'NASA TV UHD (Космос в прямом эфире)', group: 'Познавательные и Спорт', url: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8', logo: null, catchup: {}, tvg: {} },
            { id: 'rakuten_action', name: 'Rakuten Action Movies HD', group: 'Кино и Сериалы', url: 'https://rakuten-actionmovies-1-eu.rakuten.wurl.tv/playlist.m3u8', logo: null, catchup: {}, tvg: {} },
            { id: 'rakuten_comedy', name: 'Rakuten Comedy Movies HD', group: 'Кино и Сериалы', url: 'https://rakuten-comedymovies-1-eu.rakuten.wurl.tv/playlist.m3u8', logo: null, catchup: {}, tvg: {} },
            { id: 'fashion_tv', name: 'Fashion TV 4K / HD', group: 'Стиль и Музыка', url: 'https://fashiontv-fashiontv-1-eu.rakuten.wurl.tv/playlist.m3u8', logo: null, catchup: {}, tvg: {} },
            { id: 'euronews_ru', name: 'Euronews HD', group: 'Новости', url: 'https://rakuten-euronews-1-gb.samsung.wurl.tv/playlist.m3u8', logo: null, catchup: {}, tvg: {} }
        ]
        return {
            name: 'CubPro VIP HD (Кино, Наука, Музыка, 4K)',
            secuses: true,
            playlist: {
                menu: [
                    { name: '', count: channels.length },
                    { name: 'Кино и Сериалы', count: 2 },
                    { name: 'Познавательные и Спорт', count: 2 },
                    { name: 'Стиль и Музыка', count: 1 },
                    { name: 'Новости', count: 1 }
                ],
                channels: channels
            }
        }
    }

    static list(){
        return new Promise((resolve, reject)=>{
            DB.getDataAnyCase('playlist','list').then(saved=>{
                let playlist = saved || {list: []}
                let custom = Lampa.Storage.get('iptv_playlist_custom','[]')
                let defaults = this.defaultPlaylists()
                let merged = []
                let seen = {}

                defaults.concat(playlist.list || []).concat(custom).forEach(item => {
                    if(item && item.id && !seen[item.id]){
                        seen[item.id] = true
                        merged.push(item)
                    }
                })

                resolve({ list: merged })
            }).catch(()=>{
                resolve({ list: this.defaultPlaylists().concat(Lampa.Storage.get('iptv_playlist_custom','[]')) })
            })
        })
    }

    static m3uClient(url){
        return new Promise((resolve, reject)=>{
            this.network.timeout(20000)

            this.network[window.god_enabled ? 'native' : 'silent'](url,(str)=>{
                if (typeof str != 'string' || str.substr(0, 7).toUpperCase() !== "#EXTM3U") {
					return reject(Lampa.Lang.translate('torrent_parser_request_error') + ' [M3UClient Function (The file is not M3U)]')
				}

                let list
                let catchup

                try{
                    str = str.replace(/tvg-rec="(\d+)"/g, 'catchup="default" catchup-days="$1"')
                    
                    list = M3u8.parse(str)
                }
                catch(e){}

                if(list && list.items){
                    let channels = []
        
                    if(list.header.raw.indexOf('catchup') >= 0){
                        catchup = {
                            days: 0,
                            source: '',
                            type: ''
                        }
        
                        let m_days   = list.header.raw.match(/catchup-days="(\d+)"/)
                        let m_type   = list.header.raw.match(/catchup="([a-z]+)"/)
                        let m_source = list.header.raw.match(/catchup-source="(.*?)"/)
        
                        if(m_days)   catchup.days   = m_days[1]
                        if(m_type)   catchup.type   = m_type[1]
                        if(m_source) catchup.source = m_source[1]
                    }
        
                    for(let i = 0; i < list.items.length; i++){
                        let item   = list.items[i]
                        let name   = item.name.trim()

          
                        let channel = {
                            id: item.tvg && item.tvg.id ? item.tvg.id : null,
                            name: name.replace(/ \((\+\d+)\)/g,' $1').replace(/\s+(\s|ⓢ|ⓖ|ⓥ|ⓞ|Ⓢ|Ⓖ|Ⓥ|Ⓞ)/g, ' ').trim(),
                            logo: item.tvg && item.tvg.logo && item.tvg.logo.indexOf('http') == 0 ? item.tvg.logo : null,
                            group: item.group.title,
                            url: item.url,
                            catchup: item.catchup,
                            timeshift: item.timeshift,
                            tvg: item.tvg
                        }
        
                        if(!item.catchup.type && catchup && item.raw.indexOf('catchup-enable="1"') >= 0){
                            channel.catchup = catchup
                        }
        
                        channels.push(channel)
                    }
        
                    let result = {
                        menu: [],
                        channels: channels,
                    }
        
                    result.menu.push({
                        name: '',
                        count: channels.length,
                    })
        
                    for(let i = 0; i < channels.length; i++){
                        let channel = channels[i]
                        let group = channel.group
        
                        let find = result.menu.find(item => item.name === group)
        
                        if(find){
                            find.count++
                        }
                        else{
                            result.menu.push({
                                name: group,
                                count: 1,
                            })
                        }
                    }
        
                    resolve({
                        name: '',
                        playlist: result,
                        secuses: true
                    })
                }
                else{
                    reject(Lampa.Lang.translate('torrent_parser_empty') + ' [M3UClient Function (Parsing m3u failed)]')
                }
            },(e)=>{
                e.from_error = 'M3UClient Function (Failed to load)'

                reject(e)
            },false,{
                dataType: 'text'
            })
        })
    }

    static playlist(data){
        let id = data.id

        if(id === 'cubpro_hd_builtin' || data.builtin || (data.url && data.url.indexOf('builtin://') === 0)){
            return Promise.resolve(this.builtinPlaylistData())
        }

        return new Promise((resolve, reject)=>{
            Promise.all([
                DB.getDataAnyCase('playlist',id),
                Params.get(id)
            ]).then(result=>{
                let playlist = result[0]
                let params = result[1]

                if(playlist && params){
                    let time = {
                        'always': 0,
                        'hour': 1000 * 60 * 60,
                        'hour12': 1000 * 60 * 60 * 12,
                        'day': 1000 * 60 * 60 * 24,
                        'week': 1000 * 60 * 60 * 24 * 7,
                        'none': 0
                    }
                    
                    if(params.update_time + time[params.update] > Date.now() || params.update == 'none') return resolve(playlist)
                }

                let secuses = (result)=>{
                    DB.rewriteData('playlist', id, result).finally(()=>{
                        if(params) params.update_time = Date.now()

                        Params.set(id, params).finally(resolve.bind(resolve, result))
                    })
                }

                let error = (e)=>{
                    playlist ? resolve(playlist) : reject(e)
                }

                this.m3uClient(data.url).then(secuses).catch(error)
            }).catch((e)=>{
                e.from_error = 'Playlist Function (Something went wrong)'

                reject(e)
            })
        })
    }

    static program(data){
        return new Promise((resolve)=>{
            let days     = Lampa.Storage.field('iptv_guide_custom') ? Lampa.Storage.field('iptv_guide_save') : 3
            let tvg_id   = data.tvg && data.tvg.id ? data.tvg.id : data.channel_id
            let tvg_name = data.tvg && data.tvg.name ? data.tvg.name : ''

            let loadCUB = ()=>{
                resolve([])
            }

            let loadEPG = (id, call)=>{
                DB.getDataAnyCase('epg', id, 60 * 24 * days).then(epg=>{
                    if(epg) resolve(epg)
                    else call()
                }).catch(call)
            }

            if(tvg_id){
                loadEPG(tvg_id, ()=>{
                    DB.getDataAnyCase('epg_channels', (tvg_name || data.name).toLowerCase()).then(gu=>{
                        if(gu) loadEPG(gu.id, loadCUB)
                        else loadCUB()
                    }).catch(loadCUB)
                })
            }
            else resolve([])
        })
    }
}

export default Api