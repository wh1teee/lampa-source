import Api from '../../../core/account/api'
import Permit from '../../../core/account/permit'
import CubPro from '../../../core/cub_pro'

export default {
    onCreate: function(){
        if(!(this.card.source == 'tmdb' || this.card.source == 'cub')) this.html.find('.source--name').text(this.card.source.toUpperCase())
        else if(this.card.number_of_seasons && window.lampa_settings.account_use && !window.lampa_settings.disable_features.subscribe){
            this.html.find('.button--subscribe').removeClass('hide')

            this.emit('subscribed')
        }
    },
    onSubscribed: function(){
        if(!Permit.access){
            let result = CubPro.isSubscribed({ id: this.card.id })
            if(result && result.translation && result.translation.voice){
                this.html.find('.button--subscribe').data('voice', result.translation.voice).addClass('active').find('path').attr('fill', 'currentColor')
            }
            return
        }

        Api.load('card/subscribed', {}, {
            id: this.card.id,
            imdb_id: this.card.imdb_id
        }).then((result)=>{
            this.html.find('.button--subscribe').data('voice', result.translation.voice).addClass('active').find('path').attr('fill', 'currentColor')
        }).catch((e)=>{})
    }
}