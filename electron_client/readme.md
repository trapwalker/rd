# Советую не заниматься ерундой и всячески отказываться от этого задания, лучше просто забить. 
# Но если всё-таки нужно сделать, то для начала просто попробуйте во всех билдах заменить js или html файлы на нужные.
# Если всё-таки придётся билдить, то желаю удачи. Она понадобится. 

# Общая установка:
1. Скопировать из репозитория файлы из папки electron_client

2. Установить nodejs + npm 

3. Установить electron, electron-packager, electron-config, jquery, electron-rebuild (npm install --save-dev <packet_name>)

4. greenworks (info: https://github.com/greenheartgames/greenworks)
4.1. Нужно сбилдить из исходников под определённую систему, взять готовые так и не вышло
4.2. Прочесть инфу по каждой из операционных систем
4.3. Прежде чем билдить нужно в greenworks/depts положить SteamworksSDK с именем steamworks_sdk
4.4. Билдить с помощью npm run rebuild_greenworks
4.5. Не забыть удалить steamworks_sdk после успешного билда для уменьшения размера

5. Билдим приложение, кладём steam_appid.txt в папки с билдами

6. Загрузка в стим через steamworks sdk:
6.1. Настроить скрипт steam-sdk/tools/ContentBuilder/scripts/app_build_622470.vdf - здесь выбираем хранилища, в которые будем проталкивать билды
6.2. Настроить скрипт steam-sdk/tools/ContentBuilder/scripts/depot_build_62247X.vdf - выбираем номер хранилища и внутри настраиваем путь к папке с билдом 
6.3. Запускаем steamcmd в steam-sdk/tools/ContentBuilder/builder<win=""|osx="_osx"|linux="_linux">
6.4. Через steamcmd выполняем команду login и но путь должен быть абсолютным "run_app_build /steam-sdk/tools/ContentBuilder/scripts/app_build_622470.vdf"
6.4.1 win = C:\Projects\steam-sdk\tools\ContentBuilder\scripts\app_build_622470.vdf
6.4.2 mac/linux = /Users/<username>/Desktop/ele/steam-sdk/tools/ContentBuilder/scripts/app_build_622470.vdf


# Особенности Windows
1. Для билдинга придётся установить ms visual studio



# Особенности Linux:
1. nodejs версия должна быть больше 6.0.0 для этого правильно установить нормальную версию nodejs 

2. Прежде чем билдить, нужно выполнить следующие команды:
2.1. sudo npm install -g nw-gyp  (info: https://github.com/greenheartgames/greenworks/blob/master/docs/build-instructions-nwjs.md)
2.2. npm install nan
2.3. sudo apt-get install g++-multilib

3. После билда приложения папки greenworks может не оказаться в сбилденной папке. Поэтому скопировать папку greenworks в билд.

4. Заливать версию для линукса можно из под windows версии steamworks sdk 



# Особенности OSX
1. Установить их пакет разработчика (сам предлагает, если вызвать git или что-то такое)

2. Для подключения greenworks в main.js написать require('./greenworks-osx');

3. steam_appid.txt положить в RoadDogs.app/Contents/MacOS/ (Рядом непосредственно с запускающимся файлом)

4. Загружать в стим нужно только через steam_sdk на macOS. Только тогда оно, скачиваясь через стим, запускается.

