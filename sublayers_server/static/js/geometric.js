var Point = (function () {
    function Point(ax, ay) {
        this.x = ax;
        this.y = ay;
    }

    Point.prototype.abs = function () {
        return Math.sqrt((this.x * this.x) + (this.y * this.y));
    };

    return Point;
})();

// Поворот вектора на угол aAngle(в радианах) по часовой стрелке
function rotateVector(aPoint, aAngle) {
    return new Point((aPoint.x * Math.cos(aAngle) - aPoint.y * Math.sin(aAngle)),
                     (aPoint.x * Math.sin(aAngle) + aPoint.y * Math.cos(aAngle)));
}

// Нормализация вектора
function normVector(aPoint) {
    return mulScalVector(aPoint, 1 / aPoint.abs());
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

// Возвращает угол против часовой стрелки от положительного направления оси X
function angleVectorRadCCW(aPoint) {
    var angle = angleVectorRad(aPoint, new Point(1, 0));
    if (aPoint.y < 0)
        angle = 2 * Math.PI - angle;
    return normalizeAngleRad(angle);
}

// Нормализованый угол ( 0 <= angle <= (2 * pi) )
function normalizeAngleRad(angle) {
    var pi2 = Math.PI * 2;
    var znak = (angle > 0) ? -1 : 1;
    for (; (angle > pi2) || (angle < 0);)
        angle += znak * pi2;
    return angle;
}

// Кротчайший угол от первого вектора до второго (знак определяет направление)
function getDiffAngle(angle1, angle2) {
    var res = normalizeAngleRad(angle1) - normalizeAngleRad(angle2);
    if (Math.abs(res) <= Math.PI)
        return res;
    else
        return (2 * Math.PI - Math.abs(res)) * (res > 0 ? -1 : 1);
}

// Радианы в градусы
function radToGrad(rad) {
    return rad * 180 / Math.PI;
}

// Градусы в радианы
function gradToRad(grad) {
    return grad * Math.PI / 180.;
}

// Расстояние между двумя точками
function distancePoints(aPoint1, aPoint2) {
    return subVector(aPoint1, aPoint2).abs();
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