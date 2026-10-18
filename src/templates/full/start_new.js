let html = `<div class="full-start-new">

    <div class="full-start-new__body">
        <div class="full-start-new__left">
            <div class="full-start-new__poster">
                <img class="full-start-new__img full--poster" />
                <div class="full-start-new__poster-rates">
                    <div class="full-start-new__poster-rate full-start-new__poster-rate--imdb">
                        <span class="full-start-new__poster-tag full-start-new__poster-tag--imdb">IMDb</span>
                        <span class="full-start-new__poster-val poster-rate--imdb">{imdb_rating}</span>
                    </div>
                    <div class="full-start-new__poster-rate full-start-new__poster-rate--kp">
                        <span class="full-start-new__poster-tag full-start-new__poster-tag--kp">КП</span>
                        <span class="full-start-new__poster-val poster-rate--kp">{kp_rating}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="full-start-new__right">
            <div class="full-start-new__head"></div>
            <div class="full-start-new__title">{title}</div>
            <div class="full-start-new__tagline full--tagline">{tagline}</div>
            <div class="full-start-new__rate-line">
                <div class="full-start__rate rate--imdb"><div>{imdb_rating}</div><div>IMDb</div></div>
                <div class="full-start__rate rate--kp"><div>{kp_rating}</div><div>КП</div></div>
                <div class="full-start__rate rate--tmdb"><div>{rating}</div><div class="source--name">TMDB</div></div>

                <div class="full-start__pg hide"></div>
                <div class="full-start__status hide"></div>
            </div>
            <div class="full-start-new__details"></div>
            <div class="full-start-new__reactions">
                <div>#{reactions_none}</div>
            </div>

            <div class="full-start-new__buttons">
                <div class="full-start__button selector view--smart-resume hide">
                    <div class="smart-resume__row">
                        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 4.75C6 3.96 6.87 3.48 7.54 3.9L19.04 11.15C19.66 11.54 19.66 12.46 19.04 12.85L7.54 20.1C6.87 20.52 6 20.04 6 19.25V4.75Z"/>
                        </svg>
                        <div class="smart-resume__labels">
                            <span class="smart-resume__title">Продолжить</span>
                            <span class="smart-resume__meta">Торрент</span>
                        </div>
                    </div>
                    <div class="smart-resume__bar"><div class="smart-resume__bar-fill" style="width: 0%"></div></div>
                </div>

                <div class="full-start__button selector view--online">
                    <svg width="135" height="147" viewBox="0 0 135 147" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M121.5 96.8823C139.5 86.49 139.5 60.5092 121.5 50.1169L41.25 3.78454C23.25 -6.60776 0.750004 6.38265 0.750001 27.1673L0.75 51.9742C4.70314 35.7475 23.6209 26.8138 39.0547 35.7701L94.8534 68.1505C110.252 77.0864 111.909 97.8693 99.8725 109.369L121.5 96.8823Z" fill="currentColor"/>
                        <path d="M63 84.9836C80.3333 94.991 80.3333 120.01 63 130.017L39.75 143.44C22.4167 153.448 0.749999 140.938 0.75 120.924L0.750001 94.0769C0.750002 74.0621 22.4167 61.5528 39.75 71.5602L63 84.9836Z" fill="currentColor"/>
                    </svg>

                    <span>#{title_online}</span>
                </div>

                <div class="full-start__button selector view--torrent">
                    <svg><use xlink:href="#sprite-torrent"></use></svg>

                    <span>#{full_torrents}</span>
                </div>

                <div class="full-start__button selector view--trailer">
                    <svg><use xlink:href="#sprite-trailer"></use></svg>

                    <span>#{full_trailers}</span>
                </div>

                <div class="full-start__button selector button--play hide">
                    <svg><use xlink:href="#sprite-play"></use></svg>

                    <span>#{title_watch}</span>
                </div>

                <div class="full-start__button selector button--book">
                    <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/>
                    </svg>

                    <span>#{settings_input_links}</span>
                </div>

                <div class="full-start__button selector button--reaction">
                    <svg><use xlink:href="#sprite-reaction"></use></svg>           

                    <span>#{title_reactions}</span>
                </div>

                <div class="full-start__button selector button--subscribe hide">
                    <svg viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"></path>
                        <path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.6"></path>
                    </svg>

                    <span>#{title_subscribe}</span>
                </div>

                <div class="full-start__button selector button--options">
                    <svg><use xlink:href="#sprite-dots"></use></svg>
                </div>
            </div>
        </div>
    </div>

    <div class="hide buttons--container"></div>
</div>`

export default html