(function() {

    'use strict';

	angular
		.module('hawk.directives')
		.directive('dragDrop', dragDrop);

	dragDrop.$inject = [];

	var width,height;

	/* Директива перемещения элемента
	*  Обязательные параметры:
	*  planX - х координата элемента
	*  planY - y координата элемента
	*  Необязательные параметры: (если нужно ограничить область перемещения)
	*  minX - минимальное значение х
	*  maxX - максимальное значени х
	*  minY - минимальное значение y
	*  maxY - максимальное значение y
	*  Если надо,чтобы элементы не пересекались, поиск пересечений
	*  planWidth - ширина элемента
	*  planHeight - высота элемента
	*  graphs - координаты других элементов
	*  Если используется dragDrop и Resize необходимо передавать положение элемента:
	*  positionX
	*  positionY
	*  planBorder -  рамка вокруг элемента,если есть. 
	*  blocked - блокировать работу директивы
	*  intersection - координаты пересечения
	*  function - функция для обработки изменений
	*  endDragDrop - функция, которая выполняется после завершения переноса
	*/

	function dragDrop() {

		return {
			restrict:'A',
			scope: {
			  planX: '=',
			  planY: '=',
			  planWidth: '=',
			  planHeight: '=',
			  positionX: '=?',
			  positionY: '=?',
			  intersection: '=?',
			  planBorder: '@?',
			  minX: '@?',
			  maxX: '@?',
			  minY: '@?',
			  maxY: '@?',
			  width: '@?',
			  height: '@?',
			  blocked: '@?',
			  graphs: '@?',
			  function: '&?',
			  endDragDrop: '&?'
			},
			link: link
		}

		function link(scope, element) {
			if (scope.blocked == 1) {
				return;
			}
			if (scope.index === undefined) {
			   scope.index = 0;  	
			}
			var object = element[0];

			if (scope.planBorder === undefined) {
				scope.planBorder = 0;
			}
			
			function fixedMaxMin() {
				if (scope.planX < scope.minX) {
						scope.planX = Number(scope.minX);
				}
				if (Number(scope.planX) > scope.maxX) {
					scope.planX = Number(scope.maxX);
				}
				if (scope.planY < scope.minY) {
					scope.planY = Number(scope.minY);
				}
				if (Number(scope.planY) > scope.maxY) {
					scope.planY = Number(scope.maxY);
				}
			}

			/*function fixedPosition(params) {
				if (Math.abs(params.x1 - params.x3) < Math.abs(params.x2 - params.x3)) {	
					scope.planX = params.x1 - scope.width - 2 * scope.planBorder;
				} else {
					scope.planX = params.x2 + 2 * scope.planBorder; 	
				}
			}*/

			object.onmousedown = function(e) {
			    if (scope.blocked == 1) {
			    	e.preventDefault();
				    return;
			    }

			  	var startX = e.pageX, startY = e.pageY, params, x, y;
			  	if (scope.positionX === undefined || scope.positionX === 0) {
					x = scope.planX;
					y = scope.planY;
				} else {
					x = scope.positionX;
					y = scope.positionY;
				}
  	
			  	moveAt(e);

			  	function moveAt(e) {
			  		if (e.pageX > startX) {
			  			scope.planX = Number((e.pageX - startX)) + Number(x);
			  		} else {
			  			scope.planX = Number(x) - Number((startX - e.pageX));  		
			  		}

					if (e.pageY > startY) {			
						scope.planY = Number(y) + Number(e.pageY - startY);
					} else {
						scope.planY = Number(y) - Number((startY - e.pageY));
					}

					if (scope.maxX !== undefined) {
						fixedMaxMin();
					}
					params = intersection(scope);
					if (params !== undefined) {
			  		   // fixedPosition(params);
			  		   scope.intersection = area(params, scope.planBorder);
			  		}

			  		if (scope.function !== undefined) {
			  			scope.function({
			  				startX: startX,
			  				startY: startY,
			  				x: scope.planX,
			  				y: scope.planY
			  			});
			  		}

					scope.$apply();
			    }	

			  	document.onmousemove = function(e) {
			     	moveAt(e);
			 	}

			  	object.ondragstart = function() {
			  	  	return false;
			  	}

			  	document.onmouseup = function() {
			   	  	document.onmousemove = null;
			      	object.onmouseup = null;
			      	scope.positionX = scope.planX;
			      	scope.positionY = scope.planY;
			      	if (scope.endDragDrop) {
			      		scope.endDragDrop();
			      	}
			  	}

			}
		}

	}


	angular
		.module('hawk.directives')
		.directive('resize', resize);

	resize.$inject = [];

	function resize() {

		return {
			restrict:'A',
			scope: {
			  planX: '=',
			  planY: '=',	
			  planWidth: '=',
			  planHeight: '=',
			  positionX: '=?',
			  positionY: '=?',
			  intersection: '=?',
			  planBorder: '@',
			  type: '@resize',
			  blocked: '@?',
			  graphs: '@?',
			  function: '&?'
			},
			link: link
		}

		function link(scope, element) {
			if (scope.blocked == 1) {
				return;
			}
			var object = element[0];
			width = scope.planWidth;
			height = scope.planHeight;
			
			/*function fixedBorder(params) {
				if (scope.type == 'right') {
					scope.planWidth = params.x1 - params.x3 - 4 * scope.planBorder;
				} else if (scope.type == 'bottom') {
					scope.planHeight = params.y1 - params.y3 - 4 * scope.planBorder;
				} else if (scope.type == 'left') {
					scope.planWidth = params.x4 - params.x2 - 4 * scope.planBorder;
					scope.planX = params.x2 + 2 * scope.planBorder;
				} else if (scope.type == 'top') {
					scope.planHeight = params.y4 - params.y2 - 4 * scope.planBorder;
					scope.planY = params.y2 + 2 * scope.planBorder + 1;
				}
			}*/

			object.onmousedown = function(e) { 
			    var startX = e.pageX, startY = e.pageY, params, x, y;

			    if (scope.positionX === undefined || scope.positionX === 0) {
					x = scope.planX;
					y = scope.planY;
				} else {
					x = scope.positionX;
					y = scope.positionY;
				}

			    moveAt(e);
			    
			    function moveAt(e) {
			  	 	if (scope.type == 'top') {
			  			if (e.pageY > startY) {	
			  				scope.planHeight = Number(height) - (e.pageY - startY);		
							scope.planY = Number(y) + Number(e.pageY - startY);
						
						} else {
							scope.planHeight = Number(height) + (startY - e.pageY);
							scope.planY = Number(y) - Number((startY - e.pageY));
						}
			  		} else if (scope.type == 'bottom') {
			  			scope.planHeight = Number((e.pageY - startY)) + Number(height);	

			  		} else if (scope.type == 'left') {
			  			if (e.pageX > startX) {
			  				scope.planWidth = Number(width) + (startX - e.pageX);
			  				scope.planX = Number((e.pageX - startX)) + Number(x);
			  			} else {
			  				scope.planWidth = Number(width) - (e.pageX - startX);
			  				scope.planX = Number(x) - Number((startX - e.pageX));  
			  			}
			  		} else if (scope.type == 'right') {
			  			scope.planWidth = Number((e.pageX - startX)) + Number(width);		
			  		}

			  		params = intersection(scope);
			  		if (params !== undefined) {
			  		   // fixedBorder(params);
			  		   scope.intersection = area(params, scope.planBorder);
			  		}
			  		if (scope.planWidth < 1) {
			  			scope.planWidth = 1;
			  		}
			  		if (scope.planHeight < 1) {
			  			scope.planHeight = 1;
			  		}

					scope.$apply();
			  	}

			  	document.onmousemove = function(e) {
			      	moveAt(e);
			  	}

			  	document.onmouseup = function() {
			      	document.onmousemove = null;
			      	object.onmouseup = null;
			      	width = scope.planWidth;
			      	height = scope.planHeight;
			      	scope.positionX = scope.planX;
			      	scope.positionY = scope.planY;
			      	if (scope.function) {
			  			scope.function();
			  		}
			  	}
			}
		}
	}

	//поиск пересейчений элементов
	function intersection(scope) {
		let x1, x2, x3, x4, y1, y2, y3, y4, params = [];

			x3 = scope.planX - 2 * scope.planBorder;
   			x4 = Number(scope.planX) + Number(scope.planWidth) + 2 * scope.planBorder;
   			y3 = scope.planY - 2 * scope.planBorder;
   			y4 = Number(scope.planY) + Number(scope.planHeight) + 2 * scope.planBorder;	

   			if (scope.graphs !== undefined) {
				var graphs = JSON.parse(scope.graphs);
					for (var key in graphs) {
						x1 = graphs[key].x;
						x2 = graphs[key].x + graphs[key].width;
						y1 = graphs[key].y;
						y2 = graphs[key].y + graphs[key].height;
						
						if(x1 < x4 && x2 > x3) {
							if (y1 < y4 && y2 > y3) {
								params.push({
									x1: x1,
									x2: x2,
									x3: x3,
									x4: x4,
									y1: y1,
									y2: y2,
									y3: y3,
									y4: y4
								});
							}
						}
					}
			}	
			return params;
	}

	//возвращает площадь пересечений
	function area(values, border) {
		let x, width, y, height, params, space = [];
			for (var i = 0; i < values.length; i ++) {
				params = fixedCoordinate(values[i], border);

				if (params.x3 > params.x1 && params.x3 < params.x2) {
					x = params.x3;
				} else {
					x = params.x1;
				}

				if (params.x4 > params.x1 && params.x4 < params.x2) {
					width = params.x4 - x;
				} else {
					width = params.x2 - x;
				}

				if (params.y3 > params.y1 && params.y3 < params.y2) {
					y = params.y3;
				} else {
					y = params.y1;
				}

				if (params.y4 > params.y1 && params.y4 < params.y2) {
					height = params.y4 - y;
				} else {
					height = params.y2 - y;
				}
				space.push({
					x: x,
					y: y,
					width: width,
					height: height
				});
			}
			return space;
	}

	//убирает рамки фигуры
	function fixedCoordinate(params, border) {
		params.x1 = params.x1 - border;
		params.x3 = params.x3 + Number(border);
		params.x4 = params.x4 - border;
		params.x2 = params.x2 + Number(border);
		params.y1 = params.y1 - border;
		params.y3 = params.y3 + Number(border);
		params.y4 = params.y4 - border;
		params.y2 = params.y2 + Number(border);

		return params;
	}
	
})();