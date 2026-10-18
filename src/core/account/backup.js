import Permit from './permit'
import Api from './api'
import Select from '../../interaction/select'
import Noty from '../../interaction/noty'
import Lang from '../lang'
import Modal from './modal'
import Cache from '../../utils/cache'

function inject(callback){
    confirm('', ()=>{
        if(!Permit.token){
            Cache.getData('other', 'cub_pro_local_backup').then(serialized=>{
                if(serialized){
                    let parsed = typeof serialized === 'string' ? JSON.parse(serialized) : serialized
                    let imp = 0, ers = 0
                    for(let i in parsed){
                        try{
                            localStorage.setItem(i, parsed[i])
                            imp++
                        }
                        catch(e){
                            ers++
                        }
                    }
                    callback && callback({ data: parsed })
                    Noty.show(Lang.translate('account_import_secuses') + ' - '+Lang.translate('account_imported')+' ('+imp+'/'+ers+')')
                }
                else{
                    callback && callback()
                    Noty.show(Lang.translate('nodata'))
                }
            }).catch(()=>{
                callback && callback()
                Noty.show(Lang.translate('nodata'))
            })
            return
        }

        Api.load('users/backup/import').then(data=>{
            callback && callback(data)

            if(data.data){
                let imp  = 0
                let ers  = 0

                for(let i in data.data){
                    try{
                        localStorage.setItem(i, data.data[i])

                        imp++
                    }
                    catch(e){
                        ers++
                    }
                }

                Noty.show(Lang.translate('account_import_secuses') + ' - '+Lang.translate('account_imported')+' ('+imp+'/'+ers+') - ' + Lang.translate('account_reload_after'))

                setTimeout(()=>{
                    window.location.reload()
                },5000)
            }
            else Noty.show(Lang.translate('nodata'))
        }).catch(()=>{
            Noty.show(Lang.translate('account_import_fail'))
        })
    }, callback)
}

function publish(callback){
    confirm('', ()=>{
        let serialized = JSON.stringify(localStorage, (key, value) => key === 'app.js' ? undefined : value)

        if(!Permit.token){
            Cache.rewriteData('other', 'cub_pro_local_backup', serialized).then(()=>{
                callback && callback()
                Noty.show(Lang.translate('account_export_secuses'))
            }).catch(()=>{
                callback && callback()
                Noty.show(Lang.translate('account_export_secuses'))
            })
            return
        }

        let file

        try{
            file = new File([serialized], "backup.json", {
                type: "text/plain",
            })
        }
        catch(e){
            console.log('Backup', 'file create error', e.message)
        }

        if(!file){
            try{
                file = new Blob([serialized], {type: 'text/plain'})
                file.lastModifiedDate = new Date()
            }
            catch(e){
                console.log('Backup', 'file create error', e.message)

                Noty.show(Lang.translate('account_export_fail'))
            }
        }

        if(file){
            var formData = new FormData($('<form></form>')[0])
                formData.append("file", file, "backup.json")

            $.ajax({
                url: Api.url() + 'users/backup/export',
                type: 'POST',
                data: formData,
                async: true,
                cache: false,
                contentType: false,
                enctype: 'multipart/form-data',
                processData: false,
                headers: {
                    token: Permit.token
                },
                success: function (j) {
                    callback && callback()

                    if(j.secuses){
                        if(j.limited) Modal.limited()
                        else Noty.show(Lang.translate('account_export_secuses'))
                    }
                    else Noty.show(Lang.translate('account_export_fail'))
                },
                error: function(e,x){
                    callback && callback()

                    console.log('Backup', 'network error', Lampa.Network.errorDecode(e,x))

                    Noty.show(Lang.translate('account_export_fail_' + (Lampa.Network.errorJSON(e).code || 500)))
                }
            })
        }
        else{
            console.log('Backup', 'file not created')

            callback && callback()
        }
    }, callback)                  
}

function confirm(title, onconfirm, oncancel){
    Select.show({
        title: Lang.translate(title || 'sure'),
        nomark: true,
        items: [
            {
                title: Lang.translate('confirm'),
                confirm: true,
                selected: true
            },
            {
                title: Lang.translate('cancel')
            }
        ],
        onSelect: (a)=>{
            if(a.confirm){
                onconfirm && onconfirm()
            }
            else{
                oncancel && oncancel()
            }
        },
        onBack: ()=>{
            oncancel && oncancel()
        }
    })
}

function select(callback){
    if(Permit.access){
        Select.show({
            title: Lang.translate('settings_cub_backup'),
            nomark: true,
            items: [
                {
                    title: Lang.translate('settings_cub_backup_export'),
                    subtitle: Lang.translate('settings_cub_backup_export_descr'),
                    export: true,
                    selected: true
                },
                {
                    title: Lang.translate('settings_cub_backup_import'),
                    subtitle: Lang.translate('settings_cub_backup_import_descr'),
                    import: true
                },
                {
                    title: Lang.translate('cancel')
                }
            ],
            onSelect: (a)=>{
                if(a.export){
                    publish(callback)
                }
                else if(a.import){
                    inject(callback)
                }
                else{
                    callback && callback()
                }
            },
            onBack: ()=>{
                callback && callback()
            }
        })
    }
    else console.warn('Backup', 'no access')
}

export default {
    select,
    publish,
    inject
}
