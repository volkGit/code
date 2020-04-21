(function() {
    'use strict';

    angular
        .module('hawk.services')
        .factory('Base', Base);

    Base.$inject = ['$uibModal', 'UserCtx', '$timeout', '$location'];

    function Base ($uibModal, UserCtx, $timeout, $location) {
        var data = {};

        return {
            correctWidthHeight: correctWidthHeight,
            convertArrayToString: convertArrayToString,
            convertParamsToString: convertParamsToString,
            getPageRow: getPageRow,
            cardModal: cardModal,
            setValue: setValue,
            getValue: getValue,
            colorsTable: colorsTable,
            objectProtocol: objectProtocol,
            equals: equals,
            disabledAction: disabledAction,
            getMonth: getMonth,
            formatTime: formatTime,
            runOperationModal: runOperationModal,
            runOperationModalReport: runOperationModalReport,
            checkUpdateObject: checkUpdateObject,
            getCtx: getCtx,
            getQueryConfig: getQueryConfig,
            getLanguage: getLanguage,
            getDateDB: getDateDB,
            showHelp: showHelp
        }

        function setValue(key, value) {
            data[key] = value;
        }

        function getValue(key) {
            if (data[key] === undefined) {
                return null;
            }
            return data[key];
        }
        /*
            корректировка высоты и ширины изображения
            MaxWidth - макс. ширина изображения
            MinWidth - мин. ширина изображения
            width - ширина изображения
            height - высота изображения
        */
        function correctWidthHeight(maxWidth, maxHeight, width, height) {
            var tempWidth, tempHeight, Width, Height;

            if (width <= maxWidth && height <= maxHeight) {
                return {
                   height: height,
                   width: width
                }
            }

            if (width >= maxWidth) {
                tempHeight = Math.round(height * maxWidth / width);
                tempWidth = maxWidth;
            }

            if (tempHeight > maxHeight) {
                Width = Math.round(width * maxHeight / height);
                Height = maxHeight;
            } else if (Width > maxWidth) {
                Width = tempWidth;
                Height = tempHeight;
            } else if (Height > maxHeight) {
                Width = Math.round(width * maxHeight / height);
                Height = maxHeight;
            }

            if (Width === undefined) {
                Width = tempWidth;
                Height = tempHeight;
            }

            return {
                height: Height,
                width: Width
            }
        }

        // param передавать,если передается массив объектов
        function convertArrayToString(array, param) {
            var string, add;

            array.forEach(function (item) {
                if (param !== undefined) {
                    add = item[param];
                } else {
                    add = item;
                }

                if (!string) {
                    string = String(add);
                } else {
                    string += "," + add;
                }
            });
            return string;
        }

        function convertParamsToString(items, array) {
            for (var key in items) {
                if (array.indexOf(key) !== -1) {
                    items[key] = "'" + items[key] + "'";
                }
            }
            return items;
        }
        //функция возвращается страницу и номер записи в таблице
        function getPageRow(row, limitPage) {
            var page = Math.ceil(row/limitPage);
            var index = row%limitPage;
            if (index == 0) {
                page++;
            }
            return {
                page: page,
                row: index
            }
        }

        //Модальное окно карточки объекта
        function cardModal (id) {
            if (!id) {
                return;
            }

            $uibModal.open({
                templateUrl: '/app/controllers/card-modal.html',
                controller: 'CardModalController as mc',
                size: "xlg",
                resolve: {
                    id: function () {
                        return id;
                    }
                }
            });
        }

        // подкрасить не свои записи в серый цвет
        function colorsTable(items) {
            items.forEach(function (item, i) {
                if (UserCtx.getProfile().user_group.indexOf(Number(item.workplace)) == -1 || items[i].arm_id > 0) {
                    items[i].color = "dark";
                }
            });
            return items;
        }

        //переход в протокол событий
        function objectProtocol (object_id) {
            var ctx = getCtx('logs');
            ctx.filters = [
                {
                    sign: "+",
                    field: "ob.id",
                    operation: "eq",
                    value: String(object_id)
                }
            ];
            UserCtx.setCtx('logs', ctx);
            $timeout(function () {
                $location.path('/logs');
            });
        }

        // функция для проверки эквивалентности объектов,для определенных значений params = []
        function equals(obj, obj2, params) {
            var value = true;
            if (obj.length !== obj2.length || obj2 === undefined) {
                return false;
            }

            for (var key in obj) {
                params.forEach(function(item) {
                    if (obj[key][item] !== obj2[key][item]) {
                        value = false;
                    }
                })
            }

            return value;
        }

        // функция блокирования действий. (редактирование, добавление итд)
        function disabledAction() {
            var profile = UserCtx.getProfile();

            if (profile.role_id != 1) {
                return true;
            }
            return false;
        }

        //возвращает месяц по нашему календарю
        function getMonth(month) {
            var m = month + 1;
            if (m < 10) {
                return '0' + m;
            }
            return m;
        }

        function formatTime(time) {
            if (time < 10) {
                return '0' + time;
            }
            return time;
        }

        function runOperationModal (object, operation, title, the) {
            $uibModal.open({
                templateUrl: '/app/app-dpu/controllers/object-take-on-modal.html',
                controller: 'ObjectTakeOnModalController as mc',
                size: 'sm',
                resolve: {
                    ctx: function () {
                        return {
                            operation: operation,
                            object: object,
                            title: title,
                            the: the
                        };
                    }
                }
            });
        }

        function runOperationModalReport (object, operation, title ,alertType) {
            $uibModal.open({
                templateUrl: '/app/app-dpu/controllers/report-modal.html',
                controller: 'ReportModalController as mc',
                resolve: {
                    ctx: function () {
                        return {
                        title: title,
                        alert: object,
                        operation: operation,
                        alertType: alertType
                      };
                    }
                }
            });
        }

        //сравнение объектов для логирования obj измененнный объект, obj2 - начальный
        function checkUpdateObject(obj, obj2, values = {}) {
            var object = {}, value, item;

            for (var key in obj) {
                if (!angular.equals(obj[key],obj2[key])) {
                    if (Object.prototype.hasOwnProperty.call(values, key)) {
                        value = Object.prototype.hasOwnProperty.call(values[key], 'val') ? values[key].val : 'id';
                        item =  Object.prototype.hasOwnProperty.call(values[key], 'name') ? values[key].name : 'name';
                        object['*' + key +'_text'] = getValueName(getValueParam(values[key].values, obj[key], value), item);
                    }
                    object[key] = obj[key];
                }
            }
            return object;
        }

        // значение из массива объектов
        function getValueParam(values, value, param) {
            for (var i = 0; i < values.length; i++) {
                if (values[i][param] == value || values[i] == value) {
                    return values[i];
                }
            }
        }

        function getValueName(value, name) {
            // если значения объект
            if (!angular.isUndefined(value[name])) {
                return value[name];
            }
            return value; // если значения обычный массив
        }

        function getQueryConfig() {
            return {
                unlimited: 1,
                sort_field: 'alias',
                sort_type: 'asc',
                filters: [
                    { sign: "+", field: "visible", operation: "eq", value: 1 },
                    { sign: "+", field: "alias", operation: "eq", value: 'Language' }
                ]
            };
        }

        function getLanguage(value) {
            let lib = {
                '1': 'ru',
                '2': 'eng'
            }
            return lib[value];
        }

        function getDateDB(date) {
            let year = date.getFullYear();
            let month = date.getMonth() + 1;
            let day = date.getDate();

            if (month < 10) {
                month = '0' + month;
            }

            return year + '-' + month + '-' + day;
        }

        function showHelp(arm) {
            let lang = getLanguage(UserCtx.getProfile().config.Language);

            if (lang == 'eng') {
                window.open('/help/help_en.htm', '_blank', 'width=600,height=600');
            } else {
                window.open('/help/' + arm + '/help.html', '_blank', 'width=600,height=600');
            }
        }

        function getCtx(value) {
            let translate = UserCtx.getTranslate();
            let list = {
                'new-alerts': {
                    rowIndex: 0,
                    pageIndex: 0,
                    sortField: "'id'",
                    sortType: "'desc'",
                    shortcuts: [
                        { key: 'F2', text: translate.FORWARD },
                        { key: 'F5', text: translate.SHOW_ALL },
                        { key: 'F8', text: translate.HAND },
                        { key: 'F9', text: translate.CARD },
                        { key: 'F11', text: translate.CALL_CAPTURE }
                    ]
                },
                'new-faults': {
                    rowIndex: 0,
                    pageIndex: 0,
                    sortField: "'id'",
                    sortType: "'desc'",
                    shortcuts: [
                        { key: 'F2', text: translate.FORWARD },
                        { key: 'F5', text: translate.SHOW_ALL },
                        { key: 'F8', text: translate.HAND },
                        { key: 'F9', text: translate.CARD },
                        { key: 'F11', text: translate.CALL_CAPTURE }
                    ]
                },
                'active-alerts': {
                    rowIndex: 0,
                    pageIndex: 0,
                    sortField: "'date'",
                    sortType: "'desc'",
                    shortcuts: [
                        // { key: 'F2', text: 'Переслать' },
                        { key: 'F5', text: translate.SHOW_ALL },
                        { key: 'F6', text: translate.ARRIVAL_CG },
                        { key: 'F7', text: translate.REPORT_CG },
                        { key: 'F8', text: translate.HAND },
                        { key: 'F9', text: translate.CARD }
                        //  { key: 'F11', text: 'Вызов доп.ГЗ' }
                    ]
                },
                logs: {
                    rowIndex: 0,
                    pageIndex: 0,
                    sortField: "'id'",
                    sortType: "'desc'",
                    shortcuts: [
                        { key: 'F5', text: translate.SHOW_ALL },
                        { key: 'F9', text: translate.CARD },
                        { key: 'F10', text: translate.REPORTS }
                    ]
                },
                'logs-arh': {
                    rowIndex: 0,
                    pageIndex: 0,
                    sortField: "'id'",
                    sortType: "'desc'",
                    shortcuts: [
                        { key: 'F5', text: translate.SHOW_ALL },
                        { key: 'F9', text: translate.CARD },
                        { key: 'F10', text: translate.REPORTS }
                    ]
                },
                swats: {
                    rowIndex: 0,
                    pageIndex: 0,
                    sortField: "name",
                    sortType: "asc",
                    filters: [],
                    shortcuts: [
                        { key: 'F10', text: translate.REPORTS }
                    ]
                },
                objects: {
                    rowIndex: 0,
                    pageIndex: 0,
                    sortField: "id",
                    sortType: "asc",
                    filters: [],
                    shortcuts: [
                        { key: 'F3', text: translate.TAKE },
                        { key: 'F4', text: translate.REMOVE_O } ,
                        { key: 'F5', text: translate.SHOW_ALL },
                        { key: 'F10', text: translate.REPORTS }
                        // { key: 'F2', text: 'ТСО' }
                    ]
                },
                'objects-dashboard' : {
                    pageIndex: 0,
                    sortField: "id",
                    sortType: "asc",
                    filters: [],
                    shortcuts: [
                        { key: 'Ctrl+1', text: translate.ON_GUARD },
                        { key: 'Ctrl+2', text: translate.DISARMED },
                        { key: 'Ctrl+3', text: translate.ALERTS_LABEL },
                        { key: 'Ctrl+4', text: translate.ON_CHECK },
                        { key: 'Ctrl+5', text: translate.LOSS_CONNECTION },
                        { key: 'Ctrl+6', text: translate.ALERTS_COLLUMN5 },
                        { key: 'Ctrl+7', text: translate.ATTACK },
                        { key: 'Ctrl+8', text: translate.FILTER },
                        { key: 'Ctrl+0', text: translate.CLEAR_FILTER },
                    ]
                }
            }

            if (angular.isUndefined(UserCtx.getCtx(value))) {
                return list[value];
            }
            return UserCtx.getCtx(value);
        }

    }
})();
