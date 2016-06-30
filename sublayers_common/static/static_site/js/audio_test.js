$(document).ready(function () {
    console.log('Load Complete !');


    audioManager.load('listing_tag', {url: '/static/audio/final_v1_mp3/listing.mp3'}, null, TagAudioObject, 1.0);
    audioManager.load('listing_api', {url: '/static/audio/final_v1_mp3/listing.mp3'}, null, null, 1.0);
    console.log('ready function ended !');

});


function playSoundNowTag() {
    console.log('play sound now');
    audioManager.play('listing_tag');
}

function playSoundNowAPI() {
    console.log('play sound now');
    audioManager.play('listing_api');

}

