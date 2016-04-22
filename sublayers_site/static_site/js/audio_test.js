$(document).ready(function () {
    console.log('Load Complete !');


    context = audioManager.get_ctx();


    $('#loadDiv').text('Загружено!');

    audioManager.load_audio('radio', {url: "http://listen.radiotower.su:8000/vigilante_2084_128"});


});

var context;
var source, gainNode;

function radioPlayerPlay() {
    audioManager.play_audio('radio')
}

function radioPlayerPause() {
    audioManager.stop_audio('radio')
}


