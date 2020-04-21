(function() {

    'use strict';

	angular
		.module('hawk.directives')
		.directive('formChange', formChange);

	formChange.$inject = ['FormUpdate'];

	function formChange(FormUpdate) {

		return {
			restrict:'A',
			scope: {
			  formChange: '=',
			  startDirective: '=?',
			  save: '='
			},
			link: link
		}

		function link(scope) {

            var watch = false;

            if (scope.startDirective === undefined) {
            	scope.startDirective = true;
            }  

            function startWatch() {
            		scope.$watch('formChange', function() {
            			if (scope.save) {
            				if (FormUpdate.getValues() !== null) {
								if (!angular.equals(FormUpdate.getValues(),scope.formChange)) {
									FormUpdate.setNext(false);
								} else {
									FormUpdate.setNext(true);
								}
			            	} else if (scope.formChange !== undefined) {
			            		FormUpdate.setValues(angular.copy(scope.formChange));
			            	}
            			}
					},true);
            }

            scope.$watch('startDirective', function() {
            	if (watch == false && scope.startDirective === true) {
            		watch = true;
            		FormUpdate.setValues(null);	
            		startWatch();	
            	}

			});       

		}

	}
	
})();