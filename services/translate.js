(function() {
    'use strict';

    angular
        .module('hawk.services')
        .factory('Translate', Translate);

    Translate.$inject = ['UserCtx', 'WebsocketProxy'];

    function Translate (UserCtx, WebsocketProxy) {
        var data = {
            update: 0
        };

        return {
            setValue: setValue,
            getValue: getValue,
            getData: getData,
            getTranslate: getTranslate
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

        function getTranslate(lang) {
            let update = getValue('update');
            if (!angular.isUndefined(data[lang])) {
                UserCtx.setTranslate(data[lang]);
                setValue('update', lang);
                return;
            }

            let query = {
                language: lang
            };

            WebsocketProxy.getTranslate(query).then(function(data) {
                if (data.status == "success") {
                    let data_obj = {};
                    data.data.forEach(function(entry) {
                        console.log(entry.alias);
                        data_obj[entry.alias] = entry[lang];
                    });
                    UserCtx.setTranslate(data_obj);

                    console.log("Translate", UserCtx.getTranslate());
                    setValue(lang, data_obj);
                    setValue('update', lang);
                } else {
                    console.error("Не прочитан словарь! data=",data);
                }
            });
        }
    }
})();
