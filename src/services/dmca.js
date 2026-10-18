import Manifest from '../core/manifest'
import Utils from '../utils/utils'
import Cache from '../utils/cache'
import Arrays from '../utils/arrays'

/**
 * Инициализация DMCA, блокировка карточек к показу по требованию правообладателей
 * @returns {void}
 */
function init(){
    window.lampa_settings.dcma = []
}

export default {
    init
}