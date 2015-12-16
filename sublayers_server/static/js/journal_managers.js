var JournalManager = (function () {

    function JournalManager() {
        this.in_location = false;

        this.parking = new ParkingJournalManager();
    }

    return JournalManager;
})();


var journalManager = new JournalManager();


var ParkingJournalManager = (function () {

    function ParkingJournalManager() {
        this.car_list = {};

        this.jq_parking_list = $('.journal-page-left');
    }

    ParkingJournalManager.prototype.update = function(car_list) {
        console.log('ParkingJournalManager.prototype.update', car_list);

        // Очищаем верстку в журнале
        this.jq_parking_list.empty();

        // Сортируем машинки по городам
        for (var i = 0; i < car_list.length; i++)  {

        }
    };

    ParkingJournalManager.prototype.clear = function() {
        //console.log('NucoilManager.prototype.clear');

    };

    return ParkingJournalManager;
})();


