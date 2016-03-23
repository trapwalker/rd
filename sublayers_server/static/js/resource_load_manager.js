/*
* � ���� ������-�������� ����� ����������� ������ ������� �� ����� ������ ����� ��������
* ����� ���� ������ ����� ����� ��������� �������� ���� �������� (��� �� ���������� ������ ��������)
* � ������ ����� ���������� �������� ���� �������� ��������� ����� load_complete
*
* */


var ResourceLoadManager = (function () {

    function ResourceLoadManager() {
        this.resource_list = [];
        // todo: ������� setTimeout �� ��������� ������ �����, ����� �������� � �������, ����� ������� �� ��������� ���.
    }

    ResourceLoadManager.prototype.add = function (obj) {
        console.log('ResourceLoadManager: ', obj, '   added');
        this.resource_list.push(obj);
    };

    ResourceLoadManager.prototype.del = function (obj) {
        console.log('ResourceLoadManager: load complete for ', obj);
        var index = 0;
        for (var i = 0; i < this.resource_list.length; i++)
            if (obj == this.resource_list[i])
                index = i;
        this.resource_list.splice(index, 1);
        if (this.resource_list.length == 0)
            this.load_complete();
    };

    ResourceLoadManager.prototype.load_complete = function () {
        ws_connector.connect();
    };

    return ResourceLoadManager;
})();


var resourceLoadManager = new ResourceLoadManager();

