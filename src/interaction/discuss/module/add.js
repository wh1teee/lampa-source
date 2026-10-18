import Template from '../../template'
import Storage from '../../../core/storage/storage'
import Account from '../../../core/account/account'
import Controller from '../../../core/controller'
import Lang from '../../../core/lang'
import Input from '../../settings/input'
import Activity from '../../activity/activity'
import Noty from '../../noty'
import Platform from '../../../core/platform'
import Bell from '../../bell'
import CubPro from '../../../core/cub_pro'

export default {
    onCreate: function(){
        this.html = Template.elem('div',{class: 'full-review-add selector'})

        this.html.on('hover:enter', ()=>{
            if(this.added) return Noty.show(Lang.translate('account_discuss_added_ready'))

            let add_value  = ''
            let controller = Controller.enabled().name

            Input.edit({
                title: Lang.translate('account_discuss_add_title'),
                value: add_value,
                free: true,
                nosave: true,
                textarea: true,
                align: Platform.screen('mobile') ? 'top' : 'center',
                keyboard: 'integrate',
            },(new_value)=>{
                add_value = (new_value || '').trim()

                if(add_value){
                    let active = Activity.active() || {}
                    let method = active.method || (active.card && (active.card.name || active.card.first_air_date) ? 'tv' : 'movie')
                    let id = active.id || (active.card && active.card.id)

                    CubPro.addDiscuss({ method, id }, add_value)

                    if(Account.Permit.access){
                        Account.Api.load('discuss/add', {}, {
                            id: [method, id].join('_'),
                            comment: add_value,
                            lang: Storage.field('language')
                        }).catch(()=>{})
                    }

                    this.added = true

                    Bell.push({text: Lang.translate('account_discuss_added')})
                }

                Controller.toggle(controller)
            })
        })
    }
}