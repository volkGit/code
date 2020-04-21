(function() {
    'use strict';

    angular
        .module('hawk.services')
        .factory('Filters', Filters);

    Filters.$inject = ['Base'];

    function Filters (Base) {
        var filters = [];

        return {
            addFilter: addFilter,
            addFilterIn: addFilterIn,
            getFilters: getFilters,
            addDateFilter: addDateFilter,
            addDateTimeFilter: addDateTimeFilter,
            addFilterBetween: addFilterBetween,
            convertFilters: convertFilters,
            defaultNumFilter: defaultNumFilter,
            getFiltersLogs: getFiltersLogs,
            getFiltersAlerts: getFiltersAlerts,
            getFilterValue: getFilterValue,
            addIntegerFilter: addIntegerFilter
        }

        function getFilters() {
            return filters;
        }

        function addFilter(field, value, operation = '=', params, sign = '+') {
            let filter;
                if (field && (value || value == 0)) {
                    filter = {
                        sign: sign,
                        field: field,
                        operation: getOperation(operation),
                        value: value
                    };
                    if (params !== undefined) {
                        for (var key in params) {
                            filter[key] = params[key];
                        }
                    }
                }
            filters.push(filter);
            return filter;
        }

        function addDateFilter(field, value, operation = '=') {
            let val = value.toISOString().slice(0, 10);
            let params = {
                format: "::date"
            }
            return addFilter(field, val, operation, params);
        }

        function addIntegerFilter(field, value, operation = '=') {
            let params = {
                format: "::integer"
            }
            return addFilter(field, value, operation, params);
        }

        function addDateTimeFilter(field, value, operation = '=') {
            let val = Base.getDateDB(value) + ' ' + value.getHours() + ':' + value.getMinutes();
            return addFilter(field, val, operation);
        }

        /*
        array - массив значений
        field - колонка фильтра
        param - если передается массив объектов, например [{id: 1}]; param = id;
        */
        function addFilterIn(array, field, param) {
            let filetrs_string = Base.convertArrayToString(array, param);
            return addFilter(field, filetrs_string, 'in');
        }

        function addFilterBetween(field, value) {
            let array = value.split('-');
            let params = {
                value2: array[1]
            };
            if (array[1].length === 0) {
                return {};
            }
            return addFilter(field, array[0], 'btwnum', params);
        }

        function getOperation(operation) {
            let operations = {
                '=': 'eq',
                'in': 'innum',
                '>': 'gt',
                '>=': 'gte',
                '<': 'lt',
                '<=': 'lte'
            }

            if (operations[operation] !== undefined) {
                return operations[operation];
            }
            return operation;
        }

        /*
        fieldNum массив с числовыми параметрами со значение in, btw1, btw2
        */

        function convertFilters(filters, alias, fieldNum = new Map([])) {
            let query = {}, split, num;
            console.log("filters=",filters);

            for (var i = 0; i < filters.length; i++) {
                if (filters[i].value) {
                    if (fieldNum.get(filters[i].field)) {
                        num = fieldNum.get(filters[i].field);
                        if (angular.isString(filters[i].value) && filters[i].value.indexOf("-") != -1) {
                            split = filters[i].value.split('-');
                            if (split[1]) {
                                query[num.btw1] = split[0];
                                query[num.btw2] = split[1];
                            } else {
                                query[num.in] = split[0];
                            }
                        } else {
                            query[num.in] = filters[i].value;
                        }
                    }
                    if (alias.get(filters[i].field)) {
                        query[alias.get(filters[i].field)] = filters[i].value;
                    }
                }
            }
            return query;
        }

        function defaultNumFilter(value) {
            let filters = [{
              value: value,
              field: 'ob.id'
            }];
            let numField = new Map([
                ['ob.id', {
                    btw1: 'obj_btw1',
                    btw2: 'obj_btw2',
                    in: 'obj_in'
                }]
            ]);
            return convertFilters(filters, new Map([]), numField);
        }

        function getFiltersLogs(filters) {
            let alias = new Map([
                ['je.part', 'part_in'],
                ['je.zone', 'zone_in'],
                ['je.event_id', 'eventid_in'],
                ['je.time_event', 'beginin'],
                ['je.time_event_end', 'endin'],
                ['jeo.group_id', 'swat_in'],
                ['je.time_operation', 'beginwork'],
                ['je.time_operation_end', 'endwork']
            ]);
            let numField = new Map([
                ['ob.id', {
                    btw1: 'obj_btw1',
                    btw2: 'obj_btw2',
                    in: 'obj_in'
                }]
            ]);
            return convertFilters(filters, alias, numField);
        }

        function getFiltersAlerts(filters) {
            let alias = new Map([
                ['je.part', 'part_in'],
                ['je.zone', 'zone_in'],
                ['je.event_id', 'eventid_in']
            ]);
            let defaultNumber = {};
            for (var i = 0; i < filters.length; i++) {
                if (filters[i].field == 'ob.id') {
                    defaultNumber = defaultNumFilter(filters[i].value);
                }
            }

            return Object.assign(defaultNumber ,convertFilters(filters, alias));
        }

        function getFilterValue(filters, field) {
            for (var i = 0; i < filters.length; i++) {
                if (filters[i].field == field) {
                    return filters[i].value;
                }
            }
            return '';
        }

    }
})();
