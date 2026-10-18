import Manifest from './manifest'
import Request from '../utils/reguest'
import Storage from './storage/storage'
import Arrays from '../utils/arrays'
import Utils from '../utils/utils'
import TMDBProxy from './tmdb/proxy'

/**
 * Короче, постоянно пишут (почему нет картинок?)
 * Решил сделать автоматическую установку TMDB Proxy если регион RU
 */

let network = new Request()
let responce_code = 'ru'

function region(call){
    if(!window.lampa_settings.geo) return call && call(responce_code)
    
    let reg = Storage.get('region','{}')

    Arrays.extend({
        time: 0
    })

    if(!reg.code || reg.time + 1000*60*60*24 < Date.now()){
        let extracted = (code)=>{
            code = code.trim().toLowerCase()
            code = code.length <= 2 ? code || 'ru' : 'ru'

            Storage.set('region',{
                code: code,
                time: Date.now()
            })

            call(code)
        }

        extract(extracted, (e,x)=>{
            console.warn('VPN', 'geo.' + Manifest.cub_domain + ' domain not responding', network.errorDecode(e,x))

            Storage.set('region',{
                code: Storage.field('language'),
                time: Date.now()
            })

            call(Storage.field('language'))
        })
    }
    else call(reg.code)
}

let extract = (call, error)=>{
    $.ajax({
        url: Utils.protocol() + 'geo.' + Manifest.cub_domain,
        type: 'GET',
        dataType: 'text',
        timeout: 8000,
        success: call,
        error: error
    })
}

function task(call){
    if(!window.lampa_settings.geo) return call && call()

    let reg = Storage.get('region','{}')
    let cached_country = (reg && reg.code) ? (reg.code + '').trim().toLowerCase() : (Storage.field('language') || 'ru')

    if(Storage.field('proxy_tmdb') && !window.lampa_settings.disable_features.install_proxy){
        TMDBProxy.init()
    }

    responce_code = cached_country || 'ru'
    window.vpn_region = responce_code

    if(call) call()
}

function is(need_array = []){
    return need_array.indexOf(responce_code) >= 0
}

let vpn = {
    task,
    is
}

Object.defineProperty(vpn, 'region', {
    value: function(call) {
        region(call)
    },
    writable: false
})

Object.defineProperty(vpn, 'code', {
    value: function() {
        return responce_code
    },
    writable: false
})


export default vpn