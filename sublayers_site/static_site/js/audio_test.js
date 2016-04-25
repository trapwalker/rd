$(document).ready(function () {
    console.log('Load Complete !');


    context = audioManager.get_ctx();


    $('#loadDiv').text('Загружено!');

    audioManager.load('r_ch0_128', {url: "http://listen.radiotower.su:8000/industrial_junk_128"}, false, TagAudioObject);  // Industrial Junk
    audioManager.load('r_ch1_128', {url: "http://listen.radiotower.su:8000/lonesome_town_128"}, false, TagAudioObject);  // Lonesome Town
    audioManager.load('r_ch2_128', {url: "http://listen.radiotower.su:8000/mad_dog_fm_128"}, false, TagAudioObject);  // Mad Dog FM
    audioManager.load('r_ch3_128', {url: "http://listen.radiotower.su:8000/rrn_radio_128"}, false, TagAudioObject);  // RRN Radio
    audioManager.load('r_ch4_128', {url: "http://listen.radiotower.su:8000/vigilante_2084_128"}, false, TagAudioObject);  // Vigilante 2084

    audioManager.load('r_ch0_320', {url: "http://listen.radiotower.su:8000/industrial_junk_320"}, false, TagAudioObject);  // Industrial Junk
    audioManager.load('r_ch1_320', {url: "http://listen.radiotower.su:8000/lonesome_town_320"}, false, TagAudioObject);  // Lonesome Town
    audioManager.load('r_ch2_320', {url: "http://listen.radiotower.su:8000/mad_dog_fm_320"}, false, TagAudioObject);  // Mad Dog FM
    audioManager.load('r_ch3_320', {url: "http://listen.radiotower.su:8000/rrn_radio_320"}, false, TagAudioObject);  // RRN Radio
    audioManager.load('r_ch4_320', {url: "http://listen.radiotower.su:8000/vigilante_2084_320"}, false, TagAudioObject);  // Vigilante 2084

    radioPlayer = new RadioPlayer({
        name: 'p1',
        channels_names: [
            'r_ch0_128',
            'r_ch1_128',
            'r_ch2_128',
            'r_ch3_128',
            'r_ch4_128',
            'r_ch0_320',
            'r_ch1_320',
            'r_ch2_320',
            'r_ch3_320',
            'r_ch4_320'
        ],
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


