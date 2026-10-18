import Api from '../../../core/api/api'
import Color from '../../../utils/color'
import CubPro from '../../../core/cub_pro'

export default {
    onCreate: function(){
        let im = this.html.find('.full--poster')
        let poster

        this.img_poster = im[0] || {}

        if(im[0] && im[0].setAttribute){
            im[0].setAttribute('fetchpriority', 'high')
            im[0].decoding = 'async'
        }

        CubPro.applyFullCardAmbient(this.html, this.card, im[0])

        if(window.innerWidth <= 480){
            this.img_poster = new Image()
            this.img_poster.crossOrigin = "Anonymous"
        }

        this.img_poster.onerror = (e)=>{
            let fallbackSrc = poster || (this.card && this.card.img)
            if (this.img_poster.crossOrigin && fallbackSrc && String(fallbackSrc).indexOf('http') === 0) {
                this.img_poster.removeAttribute && this.img_poster.removeAttribute('crossorigin')
                this.img_poster.crossOrigin = null
                this.img_poster.src = fallbackSrc
                return
            }
            this.img_poster.src = './img/img_broken.svg'
        }

        this.img_poster.onload = (e)=>{
            im.parent().addClass('loaded')
            CubPro.applyFullCardAmbient(this.html, this.card, this.img_poster)
        }

        if(window.innerWidth <= 480){
            if(this.card.backdrop_path) poster = Api.img(this.card.backdrop_path,'w780')
            else if(this.card.background_image) poster = this.card.background_image

            this.img_poster.onerror = (e)=>{
                this.img_poster = im[0]

                this.img_poster.onerror = (e)=>{
                    this.img_poster.src = './img/img_broken.svg'
                }
        
                this.img_poster.onload = (e)=>{
                    im.parent().addClass('loaded').addClass('with-out')
                }

                im[0].src = poster || this.card.img
            }

            this.img_poster.onload = (e)=>{
                let draw = ()=>{
                    im.parent().addClass('loaded')

                    setTimeout(()=>{
                        im[0].style.transition = 'none'
                    },500)

                    let sc = this.html.parents('.scroll')[0]
                    let raf_pending = false
                    let ts = 0
                    let dl = window.innerHeight * 0.1

                    let smoothParallax = ()=>{
                        raf_pending = false
                        im[0].style.transform = 'translate3d(0, ' + ts * 0.35 + 'px, 0)'
                        im[0].style.opacity   = ts >= dl ? Math.max(0, 1 - (ts - dl) / (window.innerHeight * 0.2)) : 1;
                    }

                    if(sc) sc.on('scroll', function(e) {
                        ts = sc.scrollTop
                        
                        if(!raf_pending){
                            raf_pending = true

                            requestAnimationFrame(smoothParallax)
                        }
                    })
                }
                
                if(window.lampa_settings.blur_poster){
                    Color.blurPoster(this.img_poster, im.width(), im.height(), (nim)=>{
                        im[0].src = nim.src

                        draw()
                    })
                }
                else{
                    im[0].src = this.img_poster.src
                    
                    draw()
                }
            }
        }

        if(poster) this.html.find('.full-start__poster').addClass('background--poster')

        this.img_poster.src = poster || this.card.img || './img/img_broken.svg'
    }
}