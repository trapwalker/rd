var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};


function cloneObject(obj) {
    if (obj === null || typeof obj !== 'object')
        return obj;
    var temp = obj.constructor(); // give temp the original obj's constructor
    for (var key in obj)
        temp[key] = cloneObject(obj[key]);
    return temp;
}


var DEG_TO_RAD = Math.PI / 180.;
var RAD_TO_DEG = 180. / Math.PI;

function SetImageOnLoad(img, onLoadHandler) {
    if (img.complete) {
        onLoadHandler(img);
        return;
    }
    img.addEventListener('load', function () {
        onLoadHandler(img);
    }, false);
}

var Point = (function () {
    function Point(ax, ay) {
        this.x = ax;
        this.y = ay;
    }

    Point.prototype.abs = function () {
        return Math.sqrt((this.x * this.x) + (this.y * this.y));
    };

    Point.prototype.round = function() {
        var x_sign = this.x > 0 ? 1 : -1;
        var y_sign = this.y > 0 ? 1 : -1;
        return new Point(((Math.abs(this.x) >> 1) << 1) * x_sign, ((Math.abs(this.y) >> 1) << 1) * y_sign);
    };

    return Point;
})();

// Поворот вектора на угол aAngle(в радианах) по часовой стрелке
function rotateVector(aPoint, aAngle) {
    return new Point((aPoint.x * Math.cos(aAngle) - aPoint.y * Math.sin(aAngle)),
                     (aPoint.x * Math.sin(aAngle) + aPoint.y * Math.cos(aAngle)));
}

// Нормализация вектора
function normVector(aPoint, length) {
    length = length || 1.0;
    return mulScalVector(aPoint, length / aPoint.abs());
}

// Сумма векторов
function summVector(aPoint1, aPoint2) {
    return new Point((aPoint1.x + aPoint2.x), (aPoint1.y + aPoint2.y));
}

// Разница векторов
function subVector(aPoint1, aPoint2) {
    return new Point((aPoint1.x - aPoint2.x), aPoint1.y - aPoint2.y);
}

// Произведение вектора на число
function mulScalVector(aPoint, aMul) {
    return new Point((aPoint.x * aMul), (aPoint.y * aMul));
}

// Скалярное произведение векторов
function mulScalVectors(aPoint1, aPoint2) {
    return (aPoint1.x * aPoint2.x) + (aPoint1.y * aPoint2.y);
}

// Вектор перпендикулярный заданному
function getPerpendicular(aPoint) {
    return new Point(aPoint.y, -aPoint.x);
}

// Модуль вектора
function absVector(aPoint) {
    return aPoint.abs();
}

// Угол между векторами в градусах
function angleVectorGrad(aPoint1, aPoint2) {
    return radToGrad(angleVectorRad(aPoint1, aPoint2));
}

// Угол между векторами в радианах
function angleVectorRad(aPoint1, aPoint2) {
    return Math.acos(mulScalVectors(aPoint1, aPoint2) / (aPoint1.abs() * aPoint2.abs()));
}

// Возвращает угол по часовой стрелке от положительного направления оси X
function angleVectorRadCCW(aPoint) {
    var angle = angleVectorRad(aPoint, new Point(1, 0));
    if (aPoint.y < 0)
        angle = 2 * Math.PI - angle;
    return normalizeAngleRad(angle);
}

function angleVectorRadCCW2(aPoint) {
    var angle = angleVectorRad(aPoint, new Point(1, 0));
    if (aPoint.y < 0)
        angle = 2 * Math.PI - angle;
    return normalizeAngleRad2(angle);
}

// Нормализованый угол ( 0 <= angle <= (2 * pi) )
function normalizeAngleRad(angle) {
    var pi2 = Math.PI * 2;
    var znak = (angle > 0) ? -1 : 1;
    for (; (angle > pi2) || (angle < 0);)
        angle += znak * pi2;
    return angle;
}

// Нормализованый угол 2 ( 0 <= angle <= (2 * pi) )
function normalizeAngleRad2(angle) {
    if (angle < 0.0) {
        return 2 * Math.PI - normalizeAngleRad2(-angle);
    }
    return ((angle * 10000) % 62830) / 10000.

}

// Кротчайший угол от первого вектора до второго (знак определяет направление)
function getDiffAngle(angle1, angle2) {
    var res = normalizeAngleRad(angle1) - normalizeAngleRad(angle2);
    if (Math.abs(res) <= Math.PI)
        return res;
    else
        return (2 * Math.PI - Math.abs(res)) * (res > 0 ? -1 : 1);
}

// Кротчайший угол от первого вектора до второго (знак определяет направление)
function getDiffAngle2(angle1, angle2) {
    var res = normalizeAngleRad2(angle1) - normalizeAngleRad2(angle2);
    if (Math.abs(res) <= Math.PI)
        return res;
    else
        return (2 * Math.PI - Math.abs(res)) * (res > 0 ? -1 : 1);
}

// Радианы в градусы
function radToGrad(rad) {
    return rad * RAD_TO_DEG;
}

// Градусы в радианы
function gradToRad(grad) {
    return grad * DEG_TO_RAD;
}

// Расстояние между двумя точками
function distancePoints(aPoint1, aPoint2) {
    return subVector(aPoint1, aPoint2).abs();
}

// Квадрат расстояния между двумя точками
function distancePoints2(aPoint1, aPoint2) {
    var x = aPoint1.x - aPoint2.x;
    var y = aPoint1.y - aPoint2.y;
    return x * x + y * y;
}

// Получение вектора по полярным координатам
function polarPoint(modul, direction){
    return rotateVector(new Point(modul, 0), direction);
}

// Векторное произведение векторов - упрощённое
function mulVectVectors2D(a, b) {
    //a × b = {aybz - azby; azbx - axbz; axby - aybx}
    return a.x * b.y - a.y * b.x;
}

// Установка опций при создании объектов
function setOptions(src, dest, debug) {
    for (var key in src) {
        if (debug) console.log('setOptions ', debug, key)
        dest[key] = src[key];
    }
}

// Остановка "всплытия" событий
function stopEvent(event) {
    if (event.stopPropagation) // Вариант стандарта W3C:
        event.stopPropagation();
    else // Вариант Internet Explorer:
        event.cancelBubble = true
}

// Получить рандомную точку в заданной окрестности
function getRadialRandomPoint(point, radius) {
    return summVector(point, polarPoint(radius * Math.random(), 2 * Math.PI * Math.random()))
}

function getRadialRandomPointWithAngle(point, radius, angle, angle_dispers) {
    return summVector(point, polarPoint(radius * Math.random(), (angle - angle_dispers / 2.0) + (Math.random() * angle_dispers)))
}

// Функция перевода любого числа во временной формат: часы : минуты : секунды
toHHMMSS = function (value) {
    var sec_num = parseInt(Math.floor(value / 1000.), 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+':'+minutes+':'+seconds;
};

// Функция перевода любого числа во временной формат: часы. Если число будет меньше 1 часа: < 1ч.
toHH = function (value) {
    var sec_num = parseInt(Math.floor(value / 1000.), 10);
    var hours   = Math.floor(sec_num / 3600);
    if (hours == 0) return "< 1ч.";
    return hours + 'ч.';
};

var const_karma_list = ['Новая надежда', 'Мессия', 'Спаситель', 'Святой', 'Герой', 'Страж', 'Борец', 'Спасатель',
    'Защитник', 'Друг людей', 'Правильный', 'Честный парень', 'Партнер', 'Славный малый', 'Поселенец',
    'Человек простой', 'Странник', 'Наблюдатель', 'Выживальщик', 'Авантюрист', 'Равнодушный', 'Циник', 'Хулиган',
    'Жулик', 'Изгой', 'Мошенник', 'Грабитель', 'Захватчик', 'Убийца', 'Псих', 'Больной ублюдок', 'Маньяк', 'Антихрист'];

function getKarmaName(karma) {
    if (karma >= 1) return const_karma_list[0];
    if (karma >= 0.85) return const_karma_list[1];
    if (karma >= 0.75) return const_karma_list[2];
    if (karma >= 0.65) return const_karma_list[3];
    if (karma >= 0.6) return const_karma_list[4];
    if (karma >= 0.55) return const_karma_list[5];
    if (karma >= 0.5) return const_karma_list[6];
    if (karma >= 0.45) return const_karma_list[7];
    if (karma >= 0.4) return const_karma_list[8];
    if (karma >= 0.35) return const_karma_list[9];
    if (karma >= 0.3) return const_karma_list[10];
    if (karma >= 0.25) return const_karma_list[11];
    if (karma >= 0.2) return const_karma_list[12];
    if (karma >= 0.15) return const_karma_list[13];
    if (karma >= 0.1) return const_karma_list[14];
    if (karma >= 0.05) return const_karma_list[15];    
    if (karma >= -0.05) return const_karma_list[16];
    if (karma >= -0.1) return const_karma_list[17];
    if (karma >= -0.15) return const_karma_list[18];
    if (karma >= -0.2) return const_karma_list[19];
    if (karma >= -0.25) return const_karma_list[20];
    if (karma >= -0.3) return const_karma_list[21];
    if (karma >= -0.35) return const_karma_list[22];
    if (karma >= -0.4) return const_karma_list[23];
    if (karma >= -0.45) return const_karma_list[24];
    if (karma >= -0.5) return const_karma_list[25];
    if (karma >= -0.55) return const_karma_list[26];
    if (karma >= -0.6) return const_karma_list[27];
    if (karma >= -0.65) return const_karma_list[28];
    if (karma >= -0.75) return const_karma_list[29];
    if (karma >= -0.85) return const_karma_list[30];
    if (karma >= -1) return const_karma_list[31];
    return const_karma_list[32];
}

function getKarmaNameWithoutNorm(karma) {
    return getKarmaName(karma / 100.);
}

function getQuickUserLogin(login) {
    var parts = login.split('_');
    if (parts.length > 1) parts.pop();
    return parts.join('_');
}


function convertKeyCodeToString(keycode) {
    if (keycode == 0 || keycode == 8)  // Сброс || Backspace
        return "";

    if (keycode >= 48 && keycode <= 57)  // Если это просто цифры
        return String.fromCharCode(keycode);

    if (keycode >= 65 && keycode <= 90)  // Если это просто буквы
        return String.fromCharCode(keycode);

    if (keycode == 32)  // Пробел
        return "Space";
    if (keycode == 38)  // Стрелка вверх
        return "Arrow Up";
    if (keycode == 37)  // Стрелка влево
        return "Arrow Left";
    if (keycode == 39)  // Стрелка вправо
        return "Arrow Right";
    if (keycode == 40)  // Стрелка вниз
        return "Arrow Down";
    if (keycode == 16)  // Shift
        return "Shift";
    if (keycode == 17)  // Ctrl
        return "Ctrl";
    if (keycode == 18)  // Alt
        return "Alt";
    if (keycode == 20)  // Capslock
        return "CapsLock";
    if (keycode == 192)  // Тильда
        return "~";
    if (keycode == 191)  // /
        return "/";
    if (keycode == 220)  // \
        return "\\";
    if (keycode == 221)  // ]
        return "]";
    if (keycode == 219)  // [
        return "[";
    if (keycode == 187)  // +
        return "+";
    if (keycode == 189)  // -
        return "-";
    if (keycode == 190)  // +
        return ">";
    if (keycode == 188)  // -
        return "<";


    return null;
}


function hash_code(str) {
    var hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return String(hash > 0 ? hash : -hash);
}