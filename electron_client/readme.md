# ������� �� ���������� ������� � �������� ������������ �� ����� �������, ����� ������ ������. 
# �� ���� ��-���� ����� �������, �� ��� ������ ������ ���������� �� ���� ������ �������� js ��� html ����� �� ������.
# ���� ��-���� ������� �������, �� ����� �����. ��� �����������. 

# ����� ���������:
1. ����������� �� ����������� ����� �� ����� electron_client

2. ���������� nodejs + npm 

3. ���������� electron, electron-packager, electron-config, jquery, electron-rebuild (npm install --save-dev <packet_name>)

4. greenworks (info: https://github.com/greenheartgames/greenworks)
4.1. ����� �������� �� ���������� ��� ����������� �������, ����� ������� ��� � �� �����
4.2. �������� ���� �� ������ �� ������������ ������
4.3. ������ ��� ������� ����� � greenworks/depts �������� SteamworksSDK � ������ steamworks_sdk
4.4. ������� � ������� npm run rebuild_greenworks
4.5. �� ������ ������� steamworks_sdk ����� ��������� ����� ��� ���������� �������

5. ������ ����������, ����� steam_appid.txt � ����� � �������



# ����������� Windows
1. ��� �������� ������� ���������� ms visual studio



# ����������� Linux:
1. nodejs ������ ������ ���� ������ 6.0.0 ��� ����� ��������� ���������� ���������� ������ nodejs 

2. ������ ��� �������, ����� ��������� ��������� �������:
2.1. sudo npm install -g nw-gyp  (info: https://github.com/greenheartgames/greenworks/blob/master/docs/build-instructions-nwjs.md)
2.2. npm install nan
2.3. sudo apt-get install g++-multilib

3. ����� ����� ���������� ����� greenworks ����� �� ��������� � ���������� �����. ������� ����������� ����� greenworks � ����.




# ����������� OSX
1. ���������� �� ����� ������������ (��� ����������, ���� ������� git ��� ���-�� �����)

2. ��� ����������� greenworks � main.js �������� require('./greenworks-osx');

3. steam_appid.txt �������� � RoadDogs.app/Contents/MacOS/ (����� ��������������� � ������������� ������)

4. 





