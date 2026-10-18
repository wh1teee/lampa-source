import Storage from '../storage/storage'
import Utils from '../../utils/utils'

let broken_images = 0

function proxy(name){
    let proxy = Storage.field(name)

    if(proxy.length > 0 && proxy.charAt(proxy.length - 1) == '/'){
        proxy = proxy.substring(0, proxy.length - 1)
    }

    return Utils.checkHttp(proxy)
}

/**
 * Проксировать API запрос
 * @param {string} url URL запроса
 * @return {string} Проксированный URL запроса
 */
function api(url){
    let base  = 'https://api.themoviedb.org/3/' + url

    if(Storage.field('proxy_tmdb')){
        return Storage.field('tmdb_proxy_api') ? proxy('tmdb_proxy_api') + '/' + base : Utils.protocol() + 'apitmdb.cub.best/3/' + url
    }

    return base
}

/**
 * Проксировать изображение
 * @param {string} url URL изображения
 * @return {string} Проксированный URL изображения
 */
function image(url){
    let base  = 'https://image.tmdb.org/' + url

    if(Storage.field('proxy_tmdb')){
        return Storage.field('tmdb_proxy_image') ? proxy('tmdb_proxy_image') + '/' + base : Utils.protocol() + 'imagetmdb.com/' + url
    }

    return base
}

/**
 * Сообщить о сломанных изображениях
 */
function broken(){
    broken_images++

    if(broken_images > 50){
        broken_images = 0

        if(Storage.field('tmdb_proxy_image') && Storage.field('proxy_tmdb_auto')) Storage.set('proxy_tmdb', true)
    }
}

/**
 * Получить ключ TMDB
 * @return {string} Ключ TMDB
 */
function key(){
    return '4ef0d7355d9ffb5151e987764708ce96'
}

export default {
    api,
    key,
    image,
    broken
}