(function() {

    'use strict';

	angular
		.module('hawk.directives')
		.directive('fileModel', fileModel);

	fileModel.$inject = ['$parse'];	

	function fileModel($parse) {

		return {
			restrict:'A',
			link: link
		}

		function link(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;
                  
            element.bind('change', function() {
                scope.$apply(function() {
                	modelSetter(scope, element[0].files);      
                });
            });
        }

	}
	
})();