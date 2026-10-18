import Utils from '../../../utils/utils'
import Template from '../../template'
import CubPro from '../../../core/cub_pro'

export default {
    onCreate: function(){
        if(this.data.profile_path || typeof this.data.gender !== 'undefined') return

        if(this.data.cub_hundred_fire){
            this.html.find('.card__view').append(Template.elem('div', {class: 'card__vote', text: Utils.bigNumberToShort(this.data.cub_hundred_fire)}))
            return
        }

        let rates = CubPro.getRatings(this.data)
        let imdb  = parseFloat(rates.imdb || 0)
        let kp    = parseFloat(rates.kp || 0)

        if(imdb > 0){
            this.html.find('.card__view').append(Template.elem('div', {
                class: 'card__vote card__vote--dual',
                children: [
                    Template.elem('div', {
                        class: 'card__vote-row card__vote-row--imdb',
                        children: [
                            Template.elem('span', {class: 'card__vote-tag card__vote-tag--imdb', text: 'IMDb'}),
                            Template.elem('span', {class: 'card__vote-val card__vote-val--imdb', text: rates.imdb})
                        ]
                    }),
                    kp > 0 ? Template.elem('div', {
                        class: 'card__vote-row card__vote-row--kp',
                        children: [
                            Template.elem('span', {class: 'card__vote-tag card__vote-tag--kp', text: 'КП'}),
                            Template.elem('span', {class: 'card__vote-val card__vote-val--kp', text: rates.kp})
                        ]
                    }) : null
                ].filter(Boolean)
            }))
        }
    }
}