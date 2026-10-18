import Manifest from '../core/manifest'
import Utils from '../utils/utils'
import Platform from '../core/platform'
import Storage from '../core/storage/storage'
import Account from '../core/account/account'
import VPN from '../core/vpn'

function init(){
    // Отключена отправка телеметрии на сторонние серверы CUB
}

function counter(){
}

function histogram(){
}

export default {
    init,
    counter,
    histogram
}