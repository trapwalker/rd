RPCCallList = ( function () {
    function RPCCallList() {
        this.calls = new Array();
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
            this.calls[aCallID]=null;
        }
    }

    return RPCCallList;
})();