(function() {

    'use strict';

	angular
		.module('hawk.directives')
		.directive('hotKeys', hotKeys);

	hotKeys.$inject = ['$document'];

	function hotKeys($document) {

		var KeyCodes = {
			F1 : 112
		};
		
		var blockKeys = [18, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123];
		blockKeys.splice(blockKeys.indexOf(116), 1);

		return {
			restrict:'AE',
			scope: {
			  onHelp: '&?',
			  onShortcuts: '=?',
			  blockKeys: '=?'
			},
			link: link
		}

		function link(scope, element) {
		    $document.bind('keydown', keydown);

			element.on('$destroy', function() {
				$document.unbind('keydown', keydown);
			});

			function keydown (e) {
					if (scope.blockKeys !== undefined) {
						blockKeys = scope.blockKeys;
					}
					//блокируем клавиши
					if (blockKeys.indexOf(e.keyCode) != -1) {
						console.log("BlockeD",e.keyCode);
						e.preventDefault();
						e.stopPropagation();
						return;

					}
					//блокируем все сочетания с Alt
					if (e.altKey) {
					   e.preventDefault();
					   e.stopPropagation();
					   return; 	
					}
					if (e.keyCode == KeyCodes.F1 && scope.onHelp !== undefined) {
						scope.onHelp();
						e.preventDefault();
					}

					if (scope.onShortcuts) {
					    scope.onShortcuts.forEach(function (shortcut) {
						    if (e.keyCode == shortcut.key && (shortcut.twoKey === undefined || e[shortcut.twoKey] === true)) {
						    	if (shortcut.arg !== undefined) {
						    		shortcut.cb(shortcut.arg);
						    	} else {
						    		shortcut.cb();
						    	}

							    e.preventDefault();
						    }
					    });
                    }
					scope.$apply();
			}
		}

	}
	
})();