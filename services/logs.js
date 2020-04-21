(function() {
    'use strict';

    angular
        .module('hawk.services')
        .factory('Logs', Logs);

    Logs.$inject = ['Filters', 'UserCtx', 'Base'];

    function Logs (Filters, UserCtx, Base) {
        var data = {
            translate: UserCtx.getTranslate()
        };

        return {
            setValue: setValue,
            getValue: getValue,
            getData: getData,
            getQuery: getQuery,
            onChangeIdFilter: onChangeIdFilter
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

        function getData() {
            return data;
        }

        function getQuery(query, isAllStatusFiltered = true, arh = 0) {
            let newQuery, num_filter = [], numidfilter = "", numiddisabled = false;
            let important = ['beginin', 'endin', 'beginwork', 'endwork'];
            let profile = UserCtx.getProfile();

            if (!isAllStatusFiltered && profile.mode != "do"){
                query.workplace_in = UserCtx.getProfile().user_group.join(',');
            } else {
                delete query.workplace_in;
            }
            query.arh = arh;

            let cloneOfQuery = JSON.parse(JSON.stringify(query));

            if (cloneOfQuery.filters) {
                var i, len = cloneOfQuery.filters.length;
                for (i = 0; i < len; ++i) {
                    if (cloneOfQuery.filters[i].field === "ob.id" && cloneOfQuery.filters[i].value) {
                        num_filter.value = cloneOfQuery.filters[i].value;
                        num_filter.mark = true;
                    }
                }

                numiddisabled = false;
                if (num_filter && num_filter.mark && query.filters.length == 1 && query.filters[0].operation === "eq") {
                    numidfilter = num_filter.value;
                } else if (query.filters.length > 0) {
                    numidfilter = data.translate.FILTER;
                    numiddisabled = true;
                }
            }

            // Добавление фильтра (по времени)
            if (cloneOfQuery.sort_field != "id") {
                cloneOfQuery.sort_field2 = "id";
                cloneOfQuery.sort_type2 = "'desc'";
            }


            newQuery = Filters.getFiltersLogs(cloneOfQuery.filters);
            newQuery = Base.convertParamsToString(newQuery, important);
            delete cloneOfQuery.filters;
            cloneOfQuery = Object.assign(cloneOfQuery, newQuery);

            for (var j = 0; j < important.length; j++) {
                if (cloneOfQuery[important[j]] === undefined) {
                    cloneOfQuery[important[j]] = "'-1'";
                }
            }

            return {
                cloneOfQuery: cloneOfQuery,
                numidfilter: numidfilter,
                numiddisabled: numiddisabled
            }
        }


        function onChangeIdFilter (value, query, type = 'logs') {
            let ctx = UserCtx.getCtx(type);

            for (var i = 0; i < query.filters.length; i++) {
                if(query.filters[i] && query.filters[i].field === "ob.id") {
                    if (query.filters[i].value === value){
                        console.log("Фильтр не изменился! Выход");
                        return query;
                    }
                    query.filters.splice(i, 1);
                }
            }

            if(value && value.length > 0){
                query.filters.push(Filters.addFilter("ob.id", String(value)));
            } else {
                query.filters = [];
            }
            ctx.filters = query.filters;
            UserCtx.setCtx(type, ctx);
            return query;
        }

    }
})();
