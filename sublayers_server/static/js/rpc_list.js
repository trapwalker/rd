var RPCCallList = ( function () {
    function RPCCallList() {
        this.calls = [];
        this._generator = 0;
    }

    RPCCallList.prototype.getID = function() {
        this._generator++;
        return this._generator;
    }

    RPCCallList.prototype.add = function(aCall) {
        this.calls[aCall.rpc_call_id] = aCall;
    }

    RPCCallList.prototype.execute = function (aCallID) {
        if(this.calls[aCallID]) {
            //this.calls[aCallID]=null;
            delete this.calls[aCallID];
        }
    }

    return RPCCallList;
})();

// Переписывание ListMapObject
var ListMapObject2 = ( function(){
    function ListMapObject2(){
        this.objects = [];
    }

    ListMapObject2.prototype.add = function(aObject){
        this.objects.push(aObject)
    }

    ListMapObject2.prototype.del = function(aID){
        for(var i = 0; i < this.objects.length; i++){
            if(aID == this.objects[i].ID)
                delete this.objects[i];
        }
    }

    ListMapObject2.prototype.exist = function(aID){
        for(var i = 0; i < this.objects.length; i++){
            if(aID == this.objects[i].ID)
                return true;
        }
    }

    ListMapObject2.prototype.setCarHP = function(aID, aHP){
        for(var i = 0; i < this.objects.length; i++){
            if(aID == this.objects[i].ID)
                this.objects[i].hp = aHP;
        }
    }

    ListMapObject2.prototype.getCarHP = function(aID){
        for(var i = 0; i < this.objects.length; i++){
            if(aID == this.objects[i].ID)
                return this.objects[i].hp;
        }
    }

    ListMapObject2.prototype.setTrack = function(aID, aTrack){
        for(var i = 0; i < this.objects.length; i++){
            if(aID == this.objects[i].ID)
                this.objects[i].track = aTrack;
        }
    }


    return ListMapObject2;
})();


// Владелец машины
var Owner = (function () {
    function Owner(uid, login) {
        this.uid = uid;
        this.login = login;
        this.car = null;
    }
    return Owner;
})();

// прямое связывание Владельца с его машиной
function bindOwnerCar(Owner, Car){
    Car.owner = Owner;
    Owner.car = Car;
}

function unbindCar(Car){
    Car.owner.car = null;
}


// Список владельцев машин
var OwnerList;
OwnerList = (function () {
    function OwnerList() {
        this.owners = [];
    }

    OwnerList.prototype.add = function (owner) {
        var exstOwner = this.getOwnerByUid(owner.uid);
        if (!exstOwner) {
            this.owners.push(owner);
            return owner;
        }
        return exstOwner;
    };

    OwnerList.prototype.getOwnerByUid = function (uid) {
        for (var i = 0; i < this.owners.length; i++) {
            if (this.owners[i].uid === uid) {
                return this.owners[i];
            }
        }
        return null;
    };

    OwnerList.prototype.getOwnerByLogin = function (login) {
        for (var i = 0; i < this.owners.length; i++) {
            if (this.owners[i].login === login) {
                return this.owners[i];
            }
        }
        return null;
    };

    return OwnerList;
})();

