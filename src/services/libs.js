import Utils from '../utils/utils'
import Manifest from '../core/manifest'
import Platform from '../core/platform'

/**
 * Инициализация дополнительных библиотек
 * @returns {void}
 */
function init(){
    let include = []

    // Видео библиотеки (подгружаются лениво после первого рендера)
    include = include.concat(['hls/hls.js', 'dash/dash.js', 'qrcode/qrcode.js'].map(lib=>{
        return window.location.protocol == 'file:' || window.location.href.indexOf('chrome-extension') > -1 ? Manifest.github_lampa + 'vender/' + lib : './vender/' + lib
    }))

    setTimeout(()=>{
        Utils.putScriptOfMirrors(include,()=>{})
    }, 800)
}

export default {
    init
}