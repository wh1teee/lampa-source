import Noty from '../../interaction/noty'

function account(){
    Noty.show('CubPro VIP: Локальный премиум-профиль активен')
}

function limited(){
    Noty.show('CubPro VIP: Все лимиты сняты')
}

function premium(){
    Noty.show('CubPro VIP: Все функции CUB Premium уже разблокированы')
}

export default {
    account,
    limited,
    premium
}