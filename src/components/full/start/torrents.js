import Activity from '../../../interaction/activity/activity'
import Lang from '../../../core/lang'
import Storage from '../../../core/storage/storage'
import CubPro from '../../../core/cub_pro'

export default {
    onCreate: function(){
        let status = Storage.field('parser_use')
        let button = this.html.find('.view--torrent')
        let resumeBtn = this.html.find('.view--smart-resume')

        if(window.lampa_settings.torrents_use) button.toggleClass('selector', status).toggleClass('hide',!status)

        let openTorrentsList = ()=>{
            let year = ((this.card.first_air_date || this.card.release_date || '0000') + '').slice(0,4)
            let combinations = {
                'df': this.card.original_title,
                'df_year': this.card.original_title + ' ' + year,
                'df_lg': this.card.original_title + ' ' + this.card.title,
                'df_lg_year': this.card.original_title + ' ' + this.card.title + ' ' + year,

                'lg': this.card.title,
                'lg_year': this.card.title + ' ' + year,
                'lg_df': this.card.title + ' ' + this.card.original_title,
                'lg_df_year': this.card.title + ' ' + this.card.original_title + ' ' + year,
            }

            Activity.push({
                url: '',
                title: Lang.translate('title_torrents'),
                component: 'torrents',
                search: combinations[Storage.field('parse_lang')],
                search_one: this.card.title,
                search_two: this.card.original_title,
                movie: this.card,
                page: 1
            })
        }

        button.on('hover:enter', openTorrentsList)

        let refreshSmartResume = ()=>{
            if(!resumeBtn.length || !window.lampa_settings.torrents_use || !status) return
            let rState = CubPro.getSmartResumeState(this.card)
            if(rState){
                resumeBtn.find('.smart-resume__title').text(rState.title_text)
                resumeBtn.find('.smart-resume__meta').text(rState.meta_text || 'Торрент')
                resumeBtn.find('.smart-resume__bar-fill').css('width', Math.min(100, Math.max(4, rState.percent || 5)) + '%')
                resumeBtn.removeClass('hide').addClass('selector')
                resumeBtn.attr('data-resume-mode', rState.mode)
            }
            else{
                resumeBtn.addClass('hide').removeClass('selector')
            }
        }

        resumeBtn.on('hover:enter', ()=>{
            let rState = CubPro.getSmartResumeState(this.card)
            CubPro.resumeTorrentSession(this.card, rState, openTorrentsList)
        })

        this._refreshSmartResume = refreshSmartResume
        refreshSmartResume()
    },
    onToggle: function(){
        if(this._refreshSmartResume) this._refreshSmartResume()
    }
}