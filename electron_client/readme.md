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

6. �������� � ���� ����� steamworks sdk:
6.1. ��������� ������ steam-sdk/tools/ContentBuilder/scripts/app_build_622470.vdf - ����� �������� ���������, � ������� ����� ������������ �����
6.2. ��������� ������ steam-sdk/tools/ContentBuilder/scripts/depot_build_62247X.vdf - �������� ����� ��������� � ������ ����������� ���� � ����� � ������ 
6.3. ��������� steamcmd � steam-sdk/tools/ContentBuilder/builder<win=""|osx="_osx"|linux="_linux">
6.4. ����� steamcmd ��������� ������� login � �� ���� ������ ���� ���������� "run_app_build /steam-sdk/tools/ContentBuilder/scripts/app_build_622470.vdf"
6.4.1 win = C:\Projects\steam-sdk\tools\ContentBuilder\scripts\app_build_622470.vdf
6.4.2 mac/linux = /Users/<username>/Desktop/ele/steam-sdk/tools/ContentBuilder/scripts/app_build_622470.vdf


# ����������� Windows
1. ��� �������� ������� ���������� ms visual studio



# ����������� Linux:
1. nodejs ������ ������ ���� ������ 6.0.0 ��� ����� ��������� ���������� ���������� ������ nodejs 

2. ������ ��� �������, ����� ��������� ��������� �������:
2.1. sudo npm install -g nw-gyp  (info: https://github.com/greenheartgames/greenworks/blob/master/docs/build-instructions-nwjs.md)
2.2. npm install nan
2.3. sudo apt-get install g++-multilib

3. ����� ����� ���������� ����� greenworks ����� �� ��������� � ���������� �����. ������� ����������� ����� greenworks � ����.

4. �������� ������ ��� ������� ����� �� ��� windows ������ steamworks sdk 



# ����������� OSX
1. ���������� �� ����� ������������ (��� ����������, ���� ������� git ��� ���-�� �����)

2. ��� ����������� greenworks � main.js �������� require('./greenworks-osx');

3. steam_appid.txt �������� � RoadDogs.app/Contents/MacOS/ (����� ��������������� � ������������� ������)

4. ��������� � ���� ����� ������ ����� steam_sdk �� macOS. ������ ����� ���, ���������� ����� ����, �����������.

