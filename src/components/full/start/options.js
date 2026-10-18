import Controller from '../../../core/controller'
import Select from '../../../interaction/select'
import Activity from '../../../interaction/activity/activity'
import Lang from '../../../core/lang'

export default {
    onCreate: function(){
        let launchAutoTorrent = (mode) => {
            Controller.toggle('content')

            Activity.push({
                url: '',
                title: Lang.translate('full_torrents'),
                component: 'torrents',
                search: this.card.title || this.card.name,
                search_one: this.card.title || this.card.name,
                search_two: this.card.original_title || this.card.original_name,
                movie: this.card,
                auto_play_mode: mode,
                page: 1
            })
        }

        this.html.find('.view--torrent').on('hover:long', ()=>{
            Select.show({
                title: '⚡ Быстрый запуск Торрента',
                items: [
                    {
                        title: '⚡ В 1 клик: Максимальное качество (4K UHD / HDR)',
                        subtitle: 'Автовыбор лучшей 4K раздачи с дубляжом и макс. сидами',
                        onSelect: () => launchAutoTorrent('4k')
                    },
                    {
                        title: '🎬 В 1 клик: Оптимальный (1080p Full HD + Дубляж)',
                        subtitle: 'Мгновенный старт без буферизации',
                        onSelect: () => launchAutoTorrent('1080p')
                    }
                ],
                onBack: () => Controller.toggle('content')
            })
        })

        this.html.find('.button--options').on('hover:enter',()=>{
            let options = []

            Lampa.Listener.send('full', {
                link: this,
                type:'options',
                props: this.props,
                options
            })

            options.push({
                title: '⚡ Быстрый просмотр (CubPro VIP)',
                separator: true
            })

            options.push({
                title: '⚡ Смотреть в 1 клик (4K UHD / HDR Автовыбор)',
                subtitle: 'Автоматический выбор лучшей раздачи с дубляжом и макс. сидами',
                onSelect: ()=> launchAutoTorrent('4k')
            })

            options.push({
                title: '🎬 Смотреть в 1 клик (1080p Full HD)',
                subtitle: 'Быстрый старт самой популярной Full HD раздачи',
                onSelect: ()=> launchAutoTorrent('1080p')
            })

            if(!window.lampa_settings.disable_features.ai){
                options.push({
                    title: Lang.translate('title_ai_assistant'),
                    separator: true,
                })

                options.push({
                    title: '✨ ' + Lang.translate('title_recomendations') + ' (ИИ-подбор)',
                    subtitle: 'Глубокий подбор похожих фильмов по атмосфере и темам',
                    onSelect: ()=>{
                        Controller.toggle('content')

                        Activity.push({
                            url: '',
                            title: Lang.translate('title_recomendations'),
                            component: 'ai_recommendations',
                            card: this.card
                        })
                    }
                })

                options.push({
                    title: '🔍 ' + Lang.translate('title_facts') + ' и разбор (ИИ)',
                    subtitle: 'История создания, скрытые детали и закулисье проекта',
                    onSelect: ()=>{
                        Controller.toggle('content')

                        Activity.push({
                            url: '',
                            title: Lang.translate('title_facts'),
                            component: 'ai_facts',
                            card: this.card
                        })
                    }
                })
            }

            Select.show({
                title: Lang.translate('more'),
                items: options,
                onSelect: ()=>{
                    Controller.toggle('content')
                },
                onBack: ()=>{
                    Controller.toggle('content')
                }
            })
        })
    }
}