$(document).ready(function () {
    console.log('Load Complete !');

    audioManager.load('cl1', {url: '/audio/button_click/2023__edwin-p-manchester__tapeplayer04.wav'});
    audioManager.load('cl2', {url: '/audio/button_click/275152__bird-man__click.wav'});
    audioManager.load('cl3', {url: '/audio/button_click/290442__littlerobotsoundfactory__mouth-09.wav'});

    audioManager.load('n1', {url: '/audio/device_noise/1483__nicstage__tascamglitch2.wav'});
    audioManager.load('rn1', {url: '/audio/radio_noise_switch/60819__erh__radio-t2-lw-static-3.wav'});


});


function source2_start() {
    //
    //var mediaStream = document.getElementById("firstTestAudioStream").srcObject;
    ////source2 = context.createMediaStreamSource('http://listen.radiotower.su:8000/industrial_junk_128');
    //http://livestream.rfn.ru:8080/vestifm
    //source2 = context.createMediaStreamSource(mediaStream);
    //source2.start(0);

    var request = new XMLHttpRequest();

    if ("withCredentials" in request) {
        console.log('++++');
    } else {
        console.log('----');
    }

    request.open('GET', 'http://livestream.rfn.ru:8080/vestifm', true);
    request.responseType = 'arraybuffer';
    //request.withCredentials = false;
    request.addEventListener('load', bufferSound, false);
    request.send();

    function bufferSound(event) {
        console.log(event);
        var request = event.target;
        var source = context.createBufferSource();
        source.buffer = context.createBuffer(request.response, false);
        source.connect(context.destination);
        source.start(0);
    }
}

function source2_stop() {
    source2.stop(0);
}

