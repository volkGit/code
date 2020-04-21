(function() {

    'use strict';

  angular
    .module('hawk.directives')
    .directive('dateMax', dateMax);

  dateMax.$inject = [];

  function dateMax() {
    return {
        restrict:'A',
        scope: {
            max: '@?',
            val: '=',
        },
        link: link
    }

    function link(scope, element) {
        scope.$watch('val', function(newValue, oldValue) {
                  if (newValue !== oldValue) {
                        if (angular.isUndefined(newValue)) {
                            scope.val = oldValue; 
                        } else if (!angular.isUndefined(scope.max) && new Date(newValue).getTime() > new Date(scope.max).getTime()) {
                            scope.val = oldValue; 
                        } 
                  }
            
        }, true);
    }

  }
  
})();