var RPCCallList = ( function () {
    function RPCCallList() {
        this.calls = [];
        this._generator = 0;
    }

    RPCCallList.prototype.getID = function() {
        this._generator++;
        return this._generator;
    };

    RPCCallList.prototype.add = function(aCall) {
        this.calls[aCall.rpc_call_id] = aCall;
    };

    RPCCallList.prototype.execute = function (aCallID) {
        if(this.calls[aCallID]) {
            var rpc = this.calls[aCallID];
            // info: rpc.call === 'название метода в агент апи на сервере'
            delete this.calls[aCallID];
        }
    };

    return RPCCallList;
})();

