(function() {
    'use strict';

    angular
        .module('hawk.services')
        .factory('FormUpdate', FormUpdate);

    FormUpdate.$inject = ['$location', '$sce', '$uibModal', 'UserCtx'];

    function FormUpdate ($location, $sce, $uibModal, UserCtx) {
        var next = true;
        var values = null;
        var translate = UserCtx.getTranslate();

        return {
            setNext: setNext,
            getNext: getNext,
            link: link,
            getValues: getValues,
            setValues: setValues
        }

        function setValues(data) {
            values = data;
        }

        function getValues() {
            return values;
        }

        function setNext(value) {
            next = value;
        }

        function getNext() {
            return next;    
        }

        function link(link) {
            if (getNext()) {
                $location.path(link);
            } else {
                $uibModal.open({
                    templateUrl: '/app/controllers/yes-or-no-modal.html',
                    controller: 'YesOrNoModalController as mc',
                    resolve: {
                        ctx: function () {
                            return {
                                title: translate.THE_CONFIRM,
                                text: $sce.trustAsHtml(translate.CHANGES_SAVED_WTS),
                                cb: goNext,
                                request: false,
                                arg: { link: link }
                            }
                        }
                    }
                });
            }
        }

        function goNext(arg) {
            setNext(true);
            $location.path(arg.link);  
        }


    }
})();
