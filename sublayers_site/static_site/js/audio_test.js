$(document).ready(function () {
    console.log('Load Complete !');

    context = audioManager.get_ctx();

    $('#loadDiv').text('Загружено!');

    audioManager.load('radio_noise_switch', {url: "/audio/radio_noise_switch/60819__erh__radio-t2-lw-static-3.wav"}, false);
    audioManager.load('radio_noise', {url: "/audio/radio_noise_switch/74934__digifishmusic__radio-static-short-wave-choppy.wav"});

    radioPlayer = new RadioPlayer({
        name: 'p1',
        channels: {
            'r_ch0_128': {
                link: "http://listen.radiotower.su:8000/vigilante_2084_128",
                name: "Vigilante 2084 128"
            },
            'r_ch0_320': {
                link: "http://listen.radiotower.su:8000/vigilante_2084_320",
                name: "Vigilante 2084 320"
            },
            'r_ch1_128': {
                link: "http://listen.radiotower.su:8000/lonesome_town_128",
                name: "Lonesome Town 128"
            },
            'r_ch1_320': {
                link: "http://listen.radiotower.su:8000/lonesome_town_320",
                name: "Lonesome Town 320"
            },
            'r_ch2_128': {
                link: "http://listen.radiotower.su:8000/mad_dog_fm_128",
                name: "Mad Dog FM 128"
            },
            'r_ch2_320': {
                link: "http://listen.radiotower.su:8000/mad_dog_fm_320",
                name: "Mad Dog FM 320"
            },
            'r_ch3_128': {
                link: "http://listen.radiotower.su:8000/rrn_radio_128",
                name: "RRN Radio 128"
            },
            'r_ch3_320': {
                link: "http://listen.radiotower.su:8000/rrn_radio_320",
                name: "RRN Radio 320"
            },
            'r_ch4_128': {
                link: "http://listen.radiotower.su:8000/industrial_junk_128",
                name: "Industrial Junk 128"
            },
            'r_ch4_320': {
                link: "http://listen.radiotower.su:8000/industrial_junk_320",
                name: "Industrial Junk 320"
            }
        },
        channel_name_prefix: 'r_',
        channel_map: {
            0: 'ch0',
            1: 'ch1',
            2: 'ch2',
            3: 'ch3',
            4: 'ch4'
        },
        quality_map: {
            0: '128',
            1: '320'
        }
    });
});


var radioPlayer;

function radioPlayerPlay() {
    audioManager.play('radio1')
}

function radioPlayerPause() {
    audioManager.stop('radio1')
}


