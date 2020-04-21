(function() {
    'use strict';

    angular
        .module('hawk.controllers')
        .controller('ObjectPlansController', ctrl);

    ctrl.$inject = ['$scope', '$routeParams', '$timeout', '$sce', '$uibModal', 'Websocket', 'WebsocketProxy', 'UserCtx', 'Base', 'Plan', 'Filters'];

    function ctrl($scope, $routeParams, $timeout, $sce, $uibModal, Websocket, WebsocketProxy, UserCtx, Base, Plan, Filters) {
        var vm = this;
        vm.default = {
            x: 0,
            y: 0,
            wallWidth: 600,
            wallHeight: 400
        };
        vm.textPart = {
            x: 0,
            y: 0
        };
        vm.line = {
            startX: 0,
            startY: 0
        }
        vm.graph = {};
        vm.parts = [];
        vm.deleteZones = [];
        vm.saveZoneId = [];
        vm.polygons = [];
        vm.showSelected = showSelected;
        vm.draw = draw;
        vm.save = save;
        vm.reloadPoints = reloadPoints;
        vm.changeEdit = changeEdit;
        vm.changeTextPart = changeTextPart;
        vm.changePositionText = changePositionText;
        vm.changeEditPart = changeEditPart;
        vm.changeShow = changeShow;
        vm.endDragDrop = endDragDrop;
        vm.deleteZonePlan = deleteZonePlan;
        vm.selectZone = selectZone;
        vm.saveCoordinateWall = saveCoordinateWall;
        vm.isNode = isNode;
        vm.isPlanZone = isPlanZone;
        vm.checkWall = checkWall;
        vm.checkSvg = checkSvg;
        vm.setSvg = setSvg;
        vm.setSelectedSvg = setSelectedSvg;
        vm.deleteSvg = deleteSvg;
        vm.deleteSvgDevice = deleteSvgDevice;
        vm.isSelectedSvg = isSelectedSvg;
        vm.deleteModalPart = deleteModalPart;
        vm.setLine = setLine;
        vm.isOtherZone = isOtherZone;
        vm.reloadAllPoints = reloadAllPoints;
        vm.showPlan = showPlan;
        vm.isShowType = isShowType;
        vm.checkPartPlan = checkPartPlan;
        vm.showTitle = showTitle;
        vm.hideTitle = hideTitle;
        vm.widthTitle = widthTitle;
        vm.isHoverZone = isHoverZone;
        vm.changeShowZone = changeShowZone;
        vm.hideText = hideText;
        vm.showText = showText;
        vm.updateOriginalParts = updateOriginalParts;
        vm.translate = UserCtx.getTranslate();
        vm.profile = UserCtx.getProfile();
        vm.typeEditPart = 1;
        vm.information = [
            {name: vm.translate.SECTION, value: ''},
            {name: vm.translate.ZONE, value: ''},
            {name: vm.translate.ZONE_INFORMATION, value: ''}
        ];
        vm.typeShow = 1;
        vm.wall = {
            height: vm.default.wallHeight,
            width: vm.default.wallWidth,
            radius: 20,
            heightEl: 40,
            widthEl: 40
        };
        vm.border = 5;
        vm.radius = 8;
        vm.limit = vm.border + vm.radius;
        vm.updateZoom = false;
        vm.blockedZoom = false;
        vm.coordinatesWall = [];
        vm.saveZonesWall = [];
        vm.saveWallCoordinate = [];
        vm.drawPart = drawPart;
        vm.clear = clear;
        vm.setBaseImage = setBaseImage;
        vm.setPlanWall = setPlanWall;
        vm.maxHeightSidebar = document.documentElement.clientHeight - 250 + 'px';
        $scope.ctx.activeWindow = 'plans';
        vm.imageSrc = "/img/" + $routeParams.id;
        vm.shortcuts = [{
            key: 13,
            cb: endPolygon
        },{
            key: 27,
            cb: deletePolydonEsc
        }];
        vm.zooms = {
            zoom: 1,
            image: ['height', 'width'],
            part: ['height', 'width', 'x', 'y', 'xText', 'yText'],
            polygon: ['y', 'x'],
            polygonText: ['xText', 'yText'],
            zones: ['x', 'y'],
            svg: ['x', 'y']
        };
        vm.svgColor = 'green';
        vm.showAllZones = false;
        vm.titleZones = vm.translate.SHOW_ALL_ZONES;

        //Загрузка
        function init() {
            vm.object_id = $routeParams.id;
            clearMessage();
            getSvg();
            getDevices();
            getObject();
            getParts($routeParams.id);
            var wsSubscriber1 = WebsocketProxy.subscribe(['event-update'], function () {
                getParts($routeParams.id);
            });

            $scope.$on('$destroy', function() {
                WebsocketProxy.unsubscribe(wsSubscriber1);
            });
        }

        // Получить разделы
        function getParts (object_id) {
            let query = Plan.getPartsQuery(object_id), parts;

            Websocket.eng.getParts(query).then(function(data) {
                if (data.status != "success") {
                    return;
                }
                vm.parts = data.data;
                parts = Plan.generatePartString(vm.parts);
                vm.partsIndex = parts.partsIndex;
                getZones(parts.parrtition);
            });
        }

        // Список зон
        function getZones (part) {
            let query = Plan.getZonesQuery(part);

            Websocket.eng.getZones(query).then(function(data) {
                if (data.status == "success") {
                let zones = data.data;
                    for (var i = 0; i < zones.length; i++) {
                        if (!angular.isArray(vm.parts[vm.partsIndex[zones[i].part]].zones)) {
                            vm.parts[vm.partsIndex[zones[i].part]].zones = [];
                        }
                        vm.parts[vm.partsIndex[zones[i].part]].zones.push(zones[i]);

                    }
                    loadData();
                }
            });
        }

        // загрузка данных для дерева
        function loadData() {
            let item, zones, zone, children, tempIndex, first, firtsZone;
            let zoneSelected = UserCtx.getCtx('planSelectedZone');
            let partSelected = UserCtx.getCtx('planSelectedPart');
            vm.treedata = [];
            loadDevices();
            let count = vm.treedata.length;
            for (var i = 0; i < vm.parts.length; i++) {
                children = [];
                zones = vm.parts[i].zones;
                tempIndex = null;

                for (var j = 0; j < zones.length; j++) {
                    zone = {
                        label: zones[j].zone + ". " + zones[j].name,
                        type: "part",
                        zone: zones[j].zone,
                        part: vm.parts[i].part,
                        selectedZone: j,
                        selectedPart: i,
                        selectedPartId: vm.parts[i].id,
                        id: zones[j].id,
                        isPlan: zones[j].position_plan == '' ? false : true,
                        isEdit: zones[j].state_id == 16 ? true : false
                    }
                    children.push(zone);
                    if (zone.id == zoneSelected) {
                        tempIndex = j;
                        vm.selected = zone;
                    }
                    if (i == 0 && j == 0) {
                        firtsZone = zone;
                    }
                }

                item = {
                    label: vm.parts[i].part + ". " + vm.parts[i].name,
                    type: "part",
                    part: vm.parts[i].part,
                    selectedPart: i,
                    selectedPartId: vm.parts[i].id,
                    id: vm.parts[i].id,
                    isPlan: vm.parts[i].plan_part_shape == '' ? false : true,
                    isEdit: vm.parts[i].state_id == 16 ? true : false,
                    children: children
                }
                if (i == 0) {
                    first = item;
                }
                vm.treedata.push(item);

                if (tempIndex != null) {
                    vm.selectedNode = vm.treedata[count].children[tempIndex];
                    vm.expandedNodes = [vm.treedata[count]];
                    showSelected(vm.selected, true);
                    UserCtx.setCtx('planSelectedZone', null);
                } else if (partSelected == vm.parts[i].id) {
                    vm.selectedNode = vm.treedata[count];
                    showSelected(item, false);
                    UserCtx.setCtx('planSelectedPart', null);
                }

            }

            // загружаем первый раздел и первую зону
            if (vm.selectedNode === undefined && vm.treedata[count] !== undefined) {
                if (vm.treedata[count].children[0] !== undefined && first.isPlan) {
                    vm.selectedNode = vm.treedata[count].children[0];
                    vm.expandedNodes = [vm.treedata[count]];
                    showSelected(firtsZone, true);
                } else {
                    vm.selectedNode = vm.treedata[count];
                    showSelected(first, false);
                }
            }
        }

        function loadDevices() {
            let item;
            for (var i = 0; i < vm.devices.length; i++) {
                item = {
                    label: vm.translate.OD + " № " + vm.devices[i].serial,
                    type: "device",
                    id: vm.devices[i].id,
                    index: i,
                    isPlan: vm.devices[i].plan ? true : false,
                    isEdit: vm.object_state == 16 ? true : false
                }
                vm.treedata.push(item);
            }
        }

        // выбран элемент дерева
        function showSelected(selected, loadNodes = true) {
            if (isNotSaving(selected, isUpdateType(selected))) {
                if (vm.nextModal === undefined) {
                    $timeout(treeSelected, 2);
                    openModal(selected);
                    return;
                }

                if (vm.saveTreedata !== undefined) {
                    vm.treedata = vm.saveTreedata;
                    vm.saveTreedata = undefined;
                }
            }
            delete vm.nextModal;
            delete vm.selectedDevice;
            updateSelectedSvg(selected);

            if (isReloadSvg(selected)) {
                reloadSvg(selected);
            }

            let loading = true;
            vm.selected = selected;
            vm.selectedZone = selected.selectedZone;
            vm.selectedPartId = selected.selectedPartId;
            vm.wall.selected = '';

            if (vm.plans === undefined) {
                getImages($routeParams.id);
            }

            //УО
            if (vm.selected.type === 'device') {
                vm.typePlan = 'devices';
                vm.selectedDeviceId = selected.id;
                vm.selectedDevice = selected.index;
                vm.selectedLoad = undefined;
                vm.selectedZoneId = undefined;
                setSvgDefault('device');
                setInformation([vm.translate.OD + ' № ' + vm.devices[vm.selectedDevice].serial]);
            } else if (vm.selected.zone === undefined) { //разделы
                vm.typePlan = 'parts';
                if (vm.selectedPart === selected.selectedPart && vm.selectedLoad === undefined) {
                    loading = false;
                }
                setInformation([vm.parts[selected.selectedPart].name]);
                vm.selectedLoad = undefined;
                vm.selectedZoneId = undefined;
                if (loadNodes) {
                    genExpandedNodes(vm.treedata[selected.selectedPart + vm.devices.length]);
                }
            } else {
                vm.typePlan = 'zones';
                if (vm.selectedLoad !== undefined && vm.selectedLoad === selected.selectedPart) {
                    loading = false;
                }
                vm.selectedPart = selected.selectedPart;
                vm.selectedLoad = vm.selectedPart;
                vm.selectedZoneId = selected.id;
                if (vm.selectedSvg.type === 'device') {
                    setSvgDefault('defaultZone');
                }
                setInformation([vm.parts[vm.selectedPart].name, vm.parts[vm.selectedPart].zones[vm.selectedZone].name, vm.parts[vm.selectedPart].zones[vm.selectedZone].information]);
            }
            $timeout(treeSelected, 2);

            if (loading) {
                vm.selectedPart = selected.selectedPart;
                vm.deleteZones = [];
                loadPlan();
                loadInfo(selected);
            } else {
                drawWall();
            }
        }

        function loadPlan() {
            vm.coordinatesParts = [];
            vm.coordinatesZones = [];
            vm.coordinatesPolygon = [];
            vm.polygons = [];
            vm.saveZones = [];
            vm.indexPolygon = undefined;
            vm.zooms.zoom = 1;

            if (vm.typePlan != 'devices') {
                updatePlan('parts', 'selectedPart', 'object_image');
            } else {
                updatePlan('devices', 'selectedDevice', 'plan');
            }
            loadParts();
        }

        function updatePlan(type, select, image) {
            if ((vm[type][vm[select]][image] !== '' && vm.object_image !== vm[type][vm[select]][image]) || vm.updateZoom) {
                if (vm.graph !== undefined)
                    vm.graph.width = undefined;
                vm.object_image = vm[type][vm[select]][image];
                vm.baseSrc = "/img/" + $routeParams.id + "/plan/" + vm.object_image;
                vm.updateZoom = false;
                imageWidthHeight($routeParams.id, vm.object_image);
            }
        }

        // получение всех разделов плане объекта
        function loadParts() {
            let params, part_shape, blocked;
            vm.coordinatesValues = {};

            for (var i = 0; i < vm.parts.length; i++) {
                if (vm.parts[i].plan_part_shape.length !== 0 && vm.parts[i].object_image == vm.object_image) {
                    part_shape = JSON.parse(vm.parts[i].plan_part_shape);
                    if (part_shape.polygon === undefined) {
                        params =  {
                            id: vm.parts[i].id,
                            x: part_shape.x,
                            y: part_shape.y,
                            xText: part_shape.xText,
                            yText: part_shape.yText,
                            text: part_shape.text,
                            height: part_shape.height,
                            width: part_shape.width,
                            number: vm.parts[i].part,
                            blocked: Plan.isBlockPart(i, vm.parts, vm.typePlan, vm.selected) || vm.selected.isEdit == false ? 1 : 0
                        }

                        vm.coordinatesParts.push(params);
                    } else {
                        params = {
                            id: vm.parts[i].id,
                            polygon: part_shape.polygon,
                            circles: part_shape.circles,
                            xText: part_shape.xText,
                            yText: part_shape.yText,
                            text: part_shape.text,
                            blocked: Plan.isBlockPart(i, vm.parts, vm.typePlan, vm.selected) || vm.selected.isEdit == false ? 1 : 0
                        }
                        vm.coordinatesPolygon.push(params);
                        vm.polygons.push(params.id);
                    }

                    if (vm.selectedPart == i) {
                        blocked = 0;
                        genMaxMin(part_shape);
                        vm.selectedPartName = params.text;
                        vm.typeEditPart = params.polygon !== undefined ? 2 : 1;
                    } else {
                        blocked = 1;
                    }

                    vm.coordinatesZones = Plan.loadZone(vm.parts[i].zones, vm.coordinatesZones, blocked);
                    vm.saveZones = angular.copy(vm.coordinatesZones);
                    if (vm.typePlan == 'zones') {
                        if (part_shape.planWall !== undefined) {
                            vm.imagesWall = part_shape.planWall;
                        }
                    }

                    if(params.blocked == 1) {
                        vm.coordinatesValues[i] = params;
                    }
                }
            }
            if (vm.polygons.length > 0) {
                if (vm.polygons.indexOf(vm.selected.id) !== -1) {
                    vm.indexPolygon = vm.polygons.indexOf(vm.selected.id);
                }
            }
            vm.saveCoordinatesParts = angular.copy(vm.coordinatesParts);
            vm.originalParts = angular.copy(vm.coordinatesParts);
            vm.saveCoordinatesPolygon =  angular.copy(vm.coordinatesPolygon);
            vm.originalPolygon = angular.copy(vm.coordinatesPolygon);
        }


        //Сохранение
        function save(part = vm.selectedPart, device = vm.selectedDevice) {
            if (vm.zooms.zoom !== 1) {
                updatePlanInfo();
                vm.updateZoom = true;
                vm.blockedZoom = true;
                vm.zooms.zoom = 1;
                savePart(part);
                saveAll();
                saveSvg();
            } else {
                if (vm.typePlan == 'zones') {
                    saveZone(part);
                } else if (vm.typePlan == 'devices') {
                    saveDevice(device);
                } else {
                    savePart(part);
                }
                saveSvg();
            }
        }

        // перезаписывает все координаты после изменения масштаба
        function saveAll(){
            let zones = [], parts = [], value, zone, part, query = {}, queryPart = {};
            for (var i = 0; i < vm.coordinatesZones.length; i++) {
                value = convertJson(vm.coordinatesZones[i]);
                zone = {
                    id: vm.coordinatesZones[i].id,
                    position_plan: value
                };
                zones.push(zone);
            }
            query.zones_array = zones;

            for (var j = 0; j < vm.coordinatesParts.length; j++) {
                value = getValuePart(vm.coordinatesParts[j].id);
                part = {
                    id: vm.coordinatesParts[j].id,
                    plan_part_shape: value
                };
                parts.push(part);
            }

            for (var z = 0; z < vm.coordinatesPolygon.length; z++) {
                value = getValuePart(vm.coordinatesPolygon[z].id);
                part = {
                    id: vm.coordinatesPolygon[z].id,
                    plan_part_shape: value
                };
                parts.push(part);
            }
            queryPart.parts_array = parts;

            Websocket.eng.updateZone(query).then(function () {
                vm.saveZones = angular.copy(vm.coordinatesZones);
            });

            Websocket.eng.updatePart(queryPart).then(function () {
                vm.saveCoordinatesParts = angular.copy(vm.coordinatesParts);
                vm.originalParts = angular.copy(vm.coordinatesParts);
                vm.saveCoordinatesPolygon = angular.copy(vm.coordinatesPolygon);
                vm.originalPolygon = angular.copy(vm.coordinatesPolygon);
                vm.origGraph = angular.copy(vm.graph); //меняем значение плана
                vm.blockedZoom = false;
                reloadParams(parts, zones); // после всех изменений делаем полную перезагрузку данных
            });
        }

        function reloadParams(parts, zones) {
            for (var i = 0; i < vm.parts.length; i++) {
                for (var j = 0; j < parts.length; j++) {
                    if (vm.parts[i].id == parts[j].id) {
                        vm.parts[i].plan_part_shape = parts[j].plan_part_shape;
                    }
                }
                reloadZonesParams(i, vm.parts[i].zones, zones);
            }
        }

        function reloadZonesParams(index, zones, updateZones) {
            for (var i = 0; i < zones.length; i++) {
                for (var j = 0; j < updateZones.length; j++) {
                    if (zones[i].id == updateZones[j].id) {
                        vm.parts[index].zones[i].position_plan = updateZones[j].position_plan;
                    }
                }
            }
        }

        // сохранение зоны
        function saveZone(part = vm.selectedPart) {
            let value, zone;
            editWallZone(part);
            vm.saveZoneId = [];
            for (var i = 0; i < vm.coordinatesZones.length; i++) {
                if (vm.coordinatesZones[i].blocked == 0) { //сохранеям только зоны выбранном раздела
                    if (!angular.equals(vm.coordinatesZones[i],vm.saveZones[i])) {
                        value = convertJson(vm.coordinatesZones[i]);
                        zone = {
                            id: vm.coordinatesZones[i].id,
                            position_plan: value
                        };

                        if (vm.saveZones[i] === undefined || value !== convertJson(vm.saveZones[i])) {
                            updateZone(zone, vm.coordinatesZones[i].index, part);
                        }
                    }
                    vm.saveZoneId.push(vm.coordinatesZones[i].id);
                }
            }
            deleteZone(false, false, part);
            vm.saveZones = angular.copy(vm.coordinatesZones);
        }

        // Редактирование координат на стене
        function editWallZone(part = vm.selectedPart) {
            let coordinates, wallValue, wallSave, zone, index;
            angular.forEach(vm.coordinatesWall, function(value){
                if (vm.coordinatesWall[value] !== undefined) {
                    coordinates = vm.coordinatesWall[value];
                    for (var i = 0; i < coordinates.length; i++) {
                        wallValue = convertJson(coordinates[i], {'wall': value});
                        wallSave = getPositionWall(vm.saveZonesWall[value][i].id);
                        if (wallSave === undefined || wallValue !== wallSave) {
                            zone = {
                                id: coordinates[i].id,
                                position_wall: wallValue
                            };
                            index = Plan.getZoneIndex(vm.coordinatesZones, coordinates[i].id);

                            // при удалении зоны индекса нет
                            if (index !== undefined && Plan.getZoneIndex(vm.parts[part].zones, coordinates[i].id) !== undefined) {
                                //перезаписываем координаты на стене
                                vm.parts[part].zones[Plan.getZoneIndex(vm.parts[part].zones, coordinates[i].id)].position_wall = wallValue;
                                vm.coordinatesZones[index].xWall = coordinates[i].x;
                                vm.coordinatesZones[index].yWall = coordinates[i].y;
                                vm.coordinatesZones[index].wall = value;
                                updateZone(zone);
                            }
                        }
                    }
                    vm.saveZonesWall[value] = angular.copy(vm.coordinatesWall[value]);
                }
            });
        }

        function getPositionWall(id) {
            for (var i = 0; i < vm.parts[vm.selectedPart].zones.length; i++) {
                if (vm.parts[vm.selectedPart].zones[i].id == id) {
                    return vm.parts[vm.selectedPart].zones[i].position_wall;
                }
            }
        }

        // удаление зоны
        function deleteZone(all = false, deletePlan = false, part = vm.selectedPart) {
            for (var i = 0; i < vm.deleteZones.length; i++) {
                if (vm.saveZoneId.indexOf(vm.deleteZones[i].id) === -1 || all) {
                    let zone = {
                        position_plan: '',
                        position_wall: '',
                        id: vm.deleteZones[i].id
                    };

                    updateZone(zone, vm.deleteZones[i].index, part);
                    if (deletePlan) {
                        deleteZonePlan(zone.id);
                    }
                }
            }
        }

        // удаление зоны с плана
        function deleteZonePlan(id = vm.selectedZoneId) {
            let newCoordinate = [];
            for (var i = 0; i < vm.coordinatesZones.length; i++) {
                if (vm.coordinatesZones[i].id != id) {
                    newCoordinate.push(vm.coordinatesZones[i]);
                } else {
                    if (vm.deleteZones.indexOf(vm.coordinatesZones[i].id) == -1) {
                        vm.deleteZones.push({
                            id: vm.coordinatesZones[i].id,
                            index: vm.coordinatesZones[i].index
                        });
                    }
                }
            }
            vm.coordinatesZones = newCoordinate;
            vm.wall.selected = '';
            updateColor('zones', false);
        }

        function updateZone(zone, index, part = vm.selectedPart) {
            Websocket.eng.updateZone(zone).then(function (data) {
                if (data.status != "success") {
                    vm.messageError = vm.translate.SAVE_FAIL;
                } else {
                    if (index !== undefined) {
                        reloadZones(zone, index, part);
                    }
                    vm.messageSave = vm.translate.SUCCESS;
                    vm.saveTreedata = angular.copy(vm.treedata);
                    vm.saveZones = angular.copy(vm.coordinatesZones);
                }
                $timeout(clearMessage,3000);
            });
        }

        //перезагружаем зоны
        function reloadZones(values, index, part = vm.selectedPart){
           for (var key in values) {
              setValueZone(key,values[key], index, part);
           }
           loadPlan();
        }

        function setValueZone(param, value = '', zone = vm.selectedZone, part = vm.selectedPart) {
            vm.parts[part].zones[zone][param] = value;
        }

        function saveSvg(coordinates = vm.coordinatesSvg) {
            let svg = [], params;
            let count = coordinates.length;

            if (angular.equals(coordinates, vm.saveCoordinatesSvg)) {
                return;
            }

            for (var i = 0; i < count; i++) {
                params = {
                    id: coordinates[i].id,
                    x: coordinates[i].x,
                    y: coordinates[i].y,
                    type: coordinates[i].type,
                    selectedId: coordinates[i].selectedId,
                    selectedPart: coordinates[i].selectedPart,
                    title: coordinates[i].title
                }
                svg.push(params);
            }

            let query = {
                file_name: vm.object_image,
                object_id: vm.object_id,
                device: count === 0 ? '' : angular.toJson(svg)
            }

            Websocket.updatePlanInfo(query).then(function(data){
                if (data.status != "success") {
                    vm.messageError = vm.translate.SAVE_FAIL;
                } else {
                    Plan.setValue('coordinatesSvg', query.device);
                    reloadSvg();
                    vm.messageSave = vm.translate.SUCCESS;
                }
                $timeout(clearMessage,3000);
            });
        }

        // сохранение раздела
        function savePart(selectedPart = vm.selectedPart) {
            if (vm.typeEditPart == 2) {
               endPolygon();
            }

            let value = getValuePart();
            let part = {
                id: vm.selected.id,
                plan_part_shape: value,
                object_image: vm.object_image,
                object_id: $routeParams.id
            }

            if (value !== undefined) {
                updatePart(part, true, selectedPart);
            } else if (vm.zooms.zoom == 1) {
                vm.messageError = vm.translate.YOU_DID_NOT_MSP;
                $timeout(clearMessage,3000);
            }
        }

        function updatePart(part, color = true, selectedPart = vm.selectedPart) {
            Websocket.eng.updatePart(part).then(function (data) {
                if (data.status != "success" && vm.zooms.zoom == 1) {
                    vm.messageError = vm.translate.SAVE_FAIL;
                } else {
                    vm.messageSave = vm.translate.SUCCESS;
                    reloadParts(part, selectedPart);
                    updateColor('parts', color, selectedPart, 0, false);
                    if (!color) {
                        deletePartPlan();
                    }
                    vm.saveCoordinatesParts = angular.copy(vm.coordinatesParts);
                    vm.originalParts = angular.copy(vm.coordinatesParts);
                    vm.saveCoordinatesPolygon = angular.copy(vm.coordinatesPolygon);
                    vm.originalPolygon = angular.copy(vm.coordinatesPolygon);
                    vm.saveTreedata = angular.copy(vm.treedata);
                }
                $timeout(clearMessage,3000);
            });
        }

        function saveDevice(selected = vm.selectedDevice) {
            let device = {
                id: vm.selectedDeviceId,
                plan: checkSvg() ? vm.object_image : ''
            }
            let color = checkSvg() ? true : false;

            Websocket.eng.updateObjectDevice(device).then(function (data) {
                if (data.status === "success") {
                    vm.messageSave = vm.translate.SUCCESS;
                    updateColor('devices', color, selected);
                } else {
                    vm.messageError = vm.translate.SAVE_FAIL;
                }
                $timeout(clearMessage,3000);
            });
        }

        //перезагружаем данные vm.parts
        function reloadParts(values, part = vm.selectedPart) {
           for (var key in values) {
              setValueParts(key, values[key], part);
           }
           if (vm.loadPlanPart) {
               loadPlan();
               vm.loadPlanPart = false;
           }
        }

        function setValueParts(param, value = '', part = vm.selectedPart) {
            vm.parts[part][param] = value;
        }

        // Отметки на плане
        // отметка раздела на плане
        function drawPart(e) {
            let value = getValuePart();
            if (vm.typePlan === 'devices' || !vm.selected.isEdit) {
                return;
            }

            if (value !== undefined || vm.selected.zone !== undefined) {
                if (vm.selected.zone !== undefined) {
                    e.preventDefault();
                }else if (vm.polygons.indexOf(vm.selected.id) == -1 && value.indexOf('width') == -1) {
                    drawPolygon(e);
                }
            } else {
                if (vm.typeEditPart == 1) {
                    let params =  {
                        id: vm.selected.id,
                        x: e.offsetX,
                        y: e.offsetY,
                        xText: e.offsetX + 25,
                        yText: e.offsetY + 25 + vm.border,
                        text: vm.parts[vm.selectedPart].name,
                        height: 50,
                        width: 50,
                        number: vm.selected.part,
                        blocked: false
                    }
                    vm.selectedCoordinatePart = vm.coordinatesParts.length;
                    vm.coordinatesParts.push(params);
                    vm.originalParts = angular.copy(vm.coordinatesParts);
                    vm.messageInfo = vm.translate.TO_EDIT_SECTION_MSH;
                } else {
                    drawPolygon(e);
                }
            }
        }

        // отметка полигона
        function drawPolygon(e) {
            let element = document.getElementById('plan');
            let coordinates = getCoords(element);
            let circle = {
                x: Math.round(e.pageX - coordinates.left),
                y: Math.round(e.pageY - coordinates.top),
                r: 5
            };
            let maxMin;

            if (e.target.nodeName == 'circle') {
                endPolygon();
                return;
            }

            vm.line.startX = circle.x;
            vm.line.startY = circle.y;

            if (vm.indexPolygon === undefined ) {
                vm.indexPolygon = vm.coordinatesPolygon.length;
                vm.coordinatesPolygon.push({
                    polygon: {
                        points: '',
                        translateX: 0,
                        translateY: 0
                    },
                    circles: [],
                    id: vm.selected.id,
                    text: vm.parts[vm.selectedPart].name
                });
                vm.messageInfo = vm.translate.TO_FINISH_MARKING;
            }
            vm.coordinatesPolygon[vm.indexPolygon].circles.push(circle);
            maxMin = maxMinPolygon();
            vm.coordinatesPolygon[vm.indexPolygon].xText = (maxMin.maxX + maxMin.minX) / 2;
            vm.coordinatesPolygon[vm.indexPolygon].yText = (maxMin.maxY + maxMin.minY) / 2;
            vm.selectedCoordinatePolygon = vm.coordinatesPolygon.length - 1;
            reloadPoints();
        }

        // отметка зон на стене и полигона
        function draw(e, part, x, y, wall, distance) {
            if (!vm.selected.isEdit) {
                e.preventDefault();
                return;
            }

            if (vm.typePlan !== 'parts' && vm.selectedSvg !== undefined && (vm.selectedSvg.type === 'part' || vm.selectedSvg.type === 'device')) {
                addSvgPlan(e, x, y, part);
                return;
            }

            if (part !== vm.parts[vm.selectedPart].id || vm.selected.zone === undefined) {
                selectPart(part);
                e.preventDefault();
                return;
            }
            drawMap(e, x, y, wall, distance);
        }

        function addSvgPlan(e, x, y, partId) {
            if (checkSvg()) {
                return;
            }
            if (x === undefined) {
                let minMax = maxMinPolygon(partId);
                x = minMax.minX - vm.radius;
                y = minMax.minY - vm.radius;
            }

            // offsetX  в разных браузерах работает по разному
            // проверяем браузер
            if (navigator.userAgent.search(/Firefox/) < 0) {
                x = 0;
                y = 0;
            }

            let svg = {
                id: vm.selectedSvg.id,
                selectedId: getSelectedId(), // id выбранной зоны или раздела или УО
                selectedPart: vm.typePlan == 'devices' ? vm.selectedDevice : vm.selectedPart, // выбранный раздел или УО
                code: vm.selectedSvg.code,
                width: vm.selectedSvg.width,
                height: vm.selectedSvg.height,
                x: e.offsetX + x,
                y: e.offsetY + y,
                type: vm.selectedSvg.type,
                title: getTitle()
            }


            vm.coordinatesSvg.push(svg);
        }

        // отметка зоны на плане
        function drawMap(e, x, y) {
            let value = getValueZone();
            if (x === undefined) {
                let minMax = maxMinPolygon();
                x = minMax.minX - vm.radius;
                y = minMax.minY - vm.radius;
            }
            // offsetX  в разных браузерах работает по разному
            // проверяем браузер
            if (navigator.userAgent.search(/Firefox/) < 0) {
                x = 0;
                y = 0;
            }

            if (value !== undefined) {
                e.preventDefault();
            } else {
                let zone = vm.parts[vm.selectedPart].zones[vm.selectedZone];
                let params =  {
                    id: vm.selected.id,
                    x: x + e.offsetX,
                    y: y + e.offsetY,
                    r: vm.radius,
                    number: zone.name_plane ? zone.name_plane : vm.selected.zone,
                    blocked: 0,
                    hidden: 0,
                    index: Plan.getZoneIndex(vm.parts[vm.selectedPart].zones, vm.selected.id)
                }

                if (vm.selectedSvg.type === 'zone') {
                    addSvgPlan(e, x, y);
                    params.x = -1000; //TODO
                }
                vm.coordinatesZones.push(params);
                updateColor('zones');
            }
        }

        // Получение зон на стене
        function drawWall() {
            let values, index = Plan.getZoneIndex(vm.coordinatesZones, vm.selected.id);
            if (vm.coordinatesZones[index] === undefined) {
                return;
            }
            vm.wall.selected = vm.coordinatesZones[index].wall;
            vm.planWall = vm.imageSrc + "/room/" + vm.parts[vm.selectedPart].part  + "/" + vm.wall.selected;
            if (vm.coordinatesWall.indexOf(vm.wall.selected) === -1) {
                vm.coordinatesWall.push(vm.wall.selected);
            }
            vm.coordinatesWall[vm.wall.selected] = [];

            if (vm.wall.selected !== undefined) {
                for (var i=0; i < vm.coordinatesZones.length; i++) {
                    if (vm.coordinatesZones[i].wall === vm.wall.selected) {
                        values = Plan.getWallCoordinate(vm.coordinatesZones[i], vm.coordinatesZones[i].id, vm.saveWallCoordinate[vm.wall.selected]);
                        values.number = vm.coordinatesZones[i].number;
                        values.width = vm.wall.widthEl;
                        values.height = vm.wall.heightEl;
                        values.id = vm.coordinatesZones[i].id;
                        values.index = vm.coordinatesZones[i].index;
                        vm.coordinatesWall[vm.wall.selected].push(values);
                    }
                }
            }
            vm.saveZonesWall[vm.wall.selected] = angular.copy(vm.coordinatesWall[vm.wall.selected]);
        }

        // свг функции
        // Выбор свг элемента
        function setSvg(index) {
            if (angular.equals(vm.selectedSvg, vm.svg[index])) {
                vm.selectedSvg = undefined;
                return;
            }
            vm.selectedSvg = vm.svg[index];
        }

        function setSelectedSvg(index) {
            let svg = vm.coordinatesSvg[index];
            vm.selectedSvgIndex = index;

            if (svg.type === 'zone') {
                selectZone({id: svg.selectedId});
            } else if (svg.type === 'device' && vm.selectedDevice !== svg.selectedPart) {
                showSelected(vm.treedata[svg.selectedPart], false);
            }
        }
        //Удаление свг элементов и зон
        function deleteSvg() {
            if (vm.selectedSvgIndex !== undefined) {
                let type = vm.coordinatesSvg[vm.selectedSvgIndex].type;
                if (vm.parts[vm.selectedPart].state_id == 16) { // если раздел заблокирован то удалять БРШС нельзя
                    vm.coordinatesSvg.splice(vm.selectedSvgIndex, 1);
                    vm.selectedSvgIndex = undefined;
                }

                if ((type === 'zone' || type === 'defaultZone') && vm.selected.isEdit) {
                    deleteZonePlan();
                }
            } else if (vm.selected.isEdit) {
                deleteZonePlan();
            }
        }

        function deleteSvgDevice() {
            for (var i = 0; i < vm.coordinatesSvg.length; i++) {
                if (vm.coordinatesSvg[i].selectedId == vm.selectedDeviceId) {
                    vm.coordinatesSvg.splice(i, 1);
                }
            }
        }

        function isSelectedSvg(id) {
            if (vm.selectedSvg !== undefined && vm.selectedSvg.id == id) {
                return true;
            }
            return false;
        }

        // Вспомогательные функции
        // Получение всех свг
        function getSvg() {
            let query = {
                name: 'svg'
            };

            if (vm.svgCache !== undefined) {
                vm.svg = angular.copy(vm.svgCache);
                loadSvg();
                return;
            }

            Websocket.getRef(query).then(function(data){
                vm.svg = workSvg(data.data);
                vm.svgCache = angular.copy(data.data);
                loadSvg();
            });
        }

        function loadSvg() {
            let reg = /#color#/gi;

            for (var i = 0; i < vm.svg.length; i++) {
                vm.svg[i].code = vm.svg[i].code.replace(reg, vm.svgColor);
                vm.svg[i].code = $sce.trustAsHtml(vm.svg[i].code);
                if (vm.svg[i].type == 'defaultZone') {
                    vm.setSvg(i);
                }
            }
        }
        // Оставляем только рабочие свг
        function workSvg(data) {
            let svg = [];

            for (var i = 0; i < data.length; i++) {
                if (data[i].visible === 1) {
                    svg.push(data[i]);
                }
            }
            return svg;
        }

        function changeEdit() {
            vm.wall.selected = '';
            if (vm.typeEdit == 2) {
                vm.info = vm.translate.TO_EDIT_ZONES_WALL;
            } else {
                vm.info = vm.translate.SPECIFY_LOC_SEL;
            }
        }

        // режим отображения стены
        function changeShow(value) {
            vm.typeShow = value;
        }

        //проверяем если ли несохраненные данные
        function isNotSaving(selected, all = false) {
            let firstIndex = selected.type === 'device' ? vm.selectedDevice : vm.selectedPart;
            let compare = selected.type === 'device' ? selected.index : selected.selectedPart;

            if (firstIndex !== compare || all == true) {
                if (checkPartSave()) {
                    return true;
                } else if (vm.saveZones !== undefined && !angular.equals(vm.saveZones, vm.coordinatesZones)) {
                    return true;
                } else if (vm.coordinatesSvg !== undefined && vm.saveCoordinatesSvg !== undefined && !Base.equals(vm.coordinatesSvg, vm.saveCoordinatesSvg,['x', 'y'])) {
                    return true;
                }
            } else if (firstIndex == compare) {
                if (selected.zone !== undefined) {
                    if (checkPartSave()) {
                        return true;
                    }
                } else if (vm.saveZones !== undefined && !angular.equals(vm.saveZones, vm.coordinatesZones)) {
                    return true;
                }
            }
        }

        function checkPartSave() {
            if (vm.saveCoordinatesParts !== undefined && !angular.equals(vm.coordinatesParts, vm.saveCoordinatesParts)) {
                return true;
            } else if (vm.saveCoordinatesPolygon !== undefined && !angular.equals(vm.saveCoordinatesPolygon, vm.coordinatesPolygon)) {
                return true;
            }
            return false;
        }

        function getModal(text, yes = 'Да', no = 'Нет') {
            let modal = $uibModal.open({
                templateUrl: '/app/controllers/yes-or-no-modal.html',
                controller: 'YesOrNoModalController as mc',
                resolve: {
                    ctx: function () {
                        return {
                            title: 'Подтверждение',
                            text: $sce.trustAsHtml(text),
                            yes: yes,
                            no: no
                        }
                    }
                }
            });
            return modal;
        }

        function deleteModalPart() {
            var modalInstance = getModal(vm.translate.ARE_YOU_DEL_SEC);

            modalInstance.result.then(function () {
                clear();
            });
        }

        // переназначение раздела на плане
        function clear() {
            let part = {
                id: vm.selected.id,
                plan_part_shape: '',
                object_image: ''
            };
            updatePart(part, false);
            clearSvg();
            loadPlan();
        }

        function clearSvg() {
            let newSvg = [];
            for (var i = 0; i < vm.coordinatesSvg.length; i++) {
                if (vm.coordinatesSvg[i].selectedPart != vm.selectedPart || vm.coordinatesSvg[i].type === 'device') {
                    newSvg.push(vm.coordinatesSvg[i]);
                }
            }
            saveSvg(newSvg);
        }

        function openModalImage(src, name) {
            var modalInstance = getModal(vm.translate.CHANGES_SAVED_WTS);

            modalInstance.result.then(function () {
                setBaseImage(src, name, false);
            });
        }

        function openModal(selected) {
            var modalInstance = getModal(vm.translate.CHANGES_SAVED_WTS, vm.translate.GO_TO_SAVE, vm.translate.GO_WITHOUT_SAVING);
            var saveModal = false;

            modalInstance.result.then(function () {
                vm.nextModal = true;
                saveModal = true;
                vm.loadPlanPart = true;
                save(vm.selectedPart, vm.selectedDevice);
                if (vm.typePlan == 'parts') {
                    showSelected(selected, true);
                } else {
                    showSelected(selected);
                }
            });

            modalInstance.closed.then(function () {
                vm.nextModal = true;
                if (!saveModal) {
                    showSelected(selected);
                }
            });
        }

        // получение изображений объекта
        function getImages(object_id) {
            Plan.getImages(object_id).then(function(){
                let data = Plan.getData();
                vm.plans = data.plans;
                vm.rooms = data.rooms;
                if (data.messageError !== undefined) {
                    vm.messageError = data.messageError;
                }
            });
        }

        function setInformation(array) {
            for (var i = 0; i < vm.information.length; i++) {
                vm.information[i].value = array[i];
            }
        }

        // генерируем открытые папки в дереве
        function genExpandedNodes(node) {
            let isNode = false;
            for (var i = 0; i < vm.expandedNodes.length; i ++) {
               if (vm.expandedNodes[i].id == node.id) {
                   vm.expandedNodes.splice(i, 1);
                   isNode = true;
                   break;
               }
            }

            if (!isNode) {
                vm.expandedNodes.push(node);
            }
        }

        // получение высоты и ширины плана
        function imageWidthHeight(id, name) {
            Plan.imageWidthHeight(id, name).then(function(){
                let data = Plan.getData();
                vm.graph.width = data.graph.width;
                vm.graph.height = data.graph.height;
                vm.origGraph = angular.copy(vm.graph);
                $timeout(function(){
                    document.getElementById('plan').ondragstart = function() {
                        return false;
                    };
                },100);

                Plan.loadSvg(data.coordinatesSvg, vm.svgCache, vm.svgColor, vm.selectedPart, 'part', vm.selected.isEdit).then(function(){
                    vm.coordinatesSvg = Plan.getValue('planSvg');
                    updateSelectedSvg(vm.selected);
                    vm.saveCoordinatesSvg = angular.copy(vm.coordinatesSvg);
                });
            });
        }

        // генерация рамки перемещения зоны в разделе
        function genMaxMin(value) {
            vm.minX = value.x + Number(vm.radius) - vm.border;
            vm.maxX = value.x + Number(value.width) - vm.radius + vm.border;
            vm.minY = value.y + Number(vm.radius) - vm.border;
            vm.maxY = value.y + Number(value.height) - vm.radius + vm.border;
        }

        function checkWall() {
            if (vm.rooms === undefined) {
                return false;
            }
            for (var i = 0; i < vm.rooms.length; i++) {
                if (vm.parts[vm.selectedPart].part == vm.rooms[i].part) {
                    return true;
                }
            }
            return false;
        }

        function clearMessage() {
            vm.messageError = '';
            vm.messageSave = '';
        }

        // проверка отмечена ли зона на плане
        function isPlanZone() {
            let index = getTreedataIndex(vm.selectedPartId);
            let zoneIndex = Plan.getZoneIndex(vm.parts[vm.selectedPart].zones, vm.selectedZoneId);
            if (vm.treedata[index].children[zoneIndex].isPlan == true) {
                return true;
            }
            return false;
        }

        // изменение позиции текста при переносе раздела
        function changePositionText(startX, startY, x, y, type) {
            let X = x - startX;
            let Y = y - startY;
            let parts, index, tempX, tempY;

            if (type == 'polygon') {
                index = getIndexText('polygon');
                parts = vm.coordinatesPolygon;
            } else {
                index = getIndexText();
                parts = vm.coordinatesParts;
            }

            if (vm.startX === undefined) {
                if (type == 'polygon') {
                    vm.startX = parts[index].xText;
                    vm.startY = parts[index].yText;
                    vm.translateX = parts[index].polygon.translateX;
                    vm.translateY = parts[index].polygon.translateY;
                    tempX = undefined;
                    tempY = undefined;
                } else {
                    vm.startX = startX - parts[index].x  + parts[index].xText;
                    vm.startY = startY - parts[index].y + parts[index].yText
                }
            }

            if (type == 'polygon') {
                tempX = Number(vm.startX) + (Number(x) - vm.translateX);
                tempY = Number(vm.startY) + (Number(y) - vm.translateY);
                parts[index].yText  = tempY;
                parts[index].xText = tempX;
            } else {
                parts[index].xText = Number(vm.startX) + Number(X);
                parts[index].yText = Number(vm.startY) + Number(Y);
            }
            vm.textPart = {
                x: parts[index].xText,
                y: parts[index].yText
            };
        }


        function endDragDrop() {
            vm.startX = undefined;
            if (vm.zooms.zoom == 1) {
                vm.originalParts = angular.copy(vm.coordinatesParts);
                vm.originalPolygon = angular.copy(vm.coordinatesPolygon);
            }
        }

        function setLine(e) {
            let element = document.getElementById('plan');
            let coordinates = getCoords(element);
            vm.line.endX = e.pageX - coordinates.left;
            vm.line.endY = e.pageY - coordinates.top;
        }

        function isOtherZone(x, y, index) {
            let value = false;
            let selectedIndex = Plan.getZoneIndex(vm.coordinatesZones, vm.selectedZoneId);
            if (vm.typePlan !== 'zones' || selectedIndex === index) {
                return false;
            }

            for (var i = 0; i < vm.coordinatesZones.length; i++) {
                if (index === i) {
                    continue;
                }
                if (Math.abs(x - vm.coordinatesZones[i].x) < vm.radius && Math.abs(y - vm.coordinatesZones[i].y) < vm.radius && i === selectedIndex) {
                    value = true;
                }
            }
            return value;
        }

        // подсказки по редактированию раздела
        function loadInfoPart(part) {
            setInformation([vm.parts[part.selectedPart].name]);
            vm.default.x = 0;
            vm.default.y = 0;
            vm.textPart.x = 0;
            vm.textPart.y = 0;
            vm.intersection = [];

            if (checkPart(part.id)) {
                vm.messageInfo = vm.translate.TO_EDIT_SECTION_MSH;
            } else {
                if (vm.object_image === undefined || vm.object_image.length === 0) {
                    vm.messageInfo = vm.translate.TO_ADD_STTP;
                } else {
                    vm.messageInfo = vm.translate.TO_ADD_STTP2;
                }
            }
            vm.selectedPartName = vm.parts[part.selectedPart].name;
        }

        // проверяем отмечен ли раздел на плане
        function checkPart(id, strict = false) {
            if (strict && vm.parts[vm.selectedPart].plan_part_shape == '') {
                return false;
            }
            if (vm.coordinatesParts !== undefined) {
                for (var i = 0; i < vm.coordinatesParts.length; i++) {
                    if (vm.coordinatesParts[i].id == id) {
                        return true;
                    }
                }
            }
            if (vm.polygons.indexOf(id) != -1) {
                return true;
            }
            return false;
        }

        // индекс раздела в дереве
        function getTreedataIndex(part) {
            for (var i = 0; i < vm.treedata.length; i++) {
                if (vm.treedata[i].id == part) {
                    return i;
                }
            }
        }

        // пометка выбранного раздела в дереве
        function selectPart(part) {
            let index = getTreedataIndex(part);
            showSelected(vm.treedata[index], false);
        }

        // пометка выбранной зоны в дереве
        function selectZone(zone) {
            let partInfo = Plan.getSelectedPart(vm.parts, zone.id);
            vm.selectedPart = partInfo.part;
            vm.selectedPartId = partInfo.id;
            let index = getTreedataIndex(vm.selectedPartId);
            let zoneIndex = Plan.getZoneIndex(vm.parts[vm.selectedPart].zones,zone.id);
            showSelected(vm.treedata[index].children[zoneIndex]);
            vm.selectedNode = vm.treedata[index].children[zoneIndex];
            drawWall();
            delete vm.hoverZone;
        }

        // получаем координаты плана, отсуп слева и сверху
        function getCoords(elem) {
          var box = elem.getBoundingClientRect();

          return {
            top: box.top + pageYOffset,
            left: box.left + pageXOffset
          };

        }

        function endPolygon() {
            if (vm.coordinatesPolygon[vm.indexPolygon].circles.length < 3) {
                return;
            }
            vm.line.startX = 0;
            vm.line.startY = 0;
            if (vm.polygons.indexOf(vm.selected.id) == -1 && vm.typeEditPart == 2) {
                vm.polygons.push(vm.selected.id);
                vm.messageInfo = vm.translate.TO_EDIT_SECTION_MSH;
            }
        }

        function clearPolygon() {
            vm.line.startX = 0;
            vm.line.startY = 0;
            if (vm.indexPolygon !== undefined) {
                vm.coordinatesPolygon.splice(vm.indexPolygon, 1);
                vm.indexPolygon = undefined;
                for (var i = 0; i < vm.polygons.length; i++) {
                    if (vm.polygons[i] == vm.selected.id) {
                        vm.polygons.splice(i, 1);
                        break;
                    }
                }
            }
        }

        function deletePolydonEsc() {
            if (vm.polygons.indexOf(vm.selected.id) === -1) {
                clearPolygon();
            }
        }

        function clearPart() {
            for (var i = 0; i < vm.coordinatesParts.length; i++) {
                if (vm.coordinatesParts[i].id == vm.selected.id) {
                    vm.coordinatesParts.splice(i, 1);
                    break;
                }
            }
        }

        // обновляем связи в полигоне
        function reloadPoints(update = true, index = vm.indexPolygon) {
            let circles = vm.coordinatesPolygon[index].circles;
            let points;
            for (var i = 0; i < circles.length; i++) {
                if (points === undefined) {
                    points = circles[i].x + ',' + circles[i].y;
                } else {
                    points += ',' + circles[i].x + ',' + circles[i].y;
                }
            }
            vm.coordinatesPolygon[index].polygon.points = points;
            if (update) { // обновлеяем точки для масштабирования
                vm.originalPolygon = angular.copy(vm.coordinatesPolygon);
            }
        }

        function reloadAllPoints() {
            for (var i = 0; i < vm.coordinatesPolygon.length; i++) {
                reloadPoints(false, i);
            }
        }

        // поиск минимальных и максимальных значений для полигона
        function maxMinPolygon(partId = vm.selectedPartId) {
            let index = getIndexText('polygon', partId);
            let circles = vm.coordinatesPolygon[index].circles;
            let minY = vm.graph.height, maxY = 0, minX = vm.graph.width, maxX = 0;
            let translateX = Number(vm.coordinatesPolygon[index].polygon.translateX);
            let translateY = Number(vm.coordinatesPolygon[index].polygon.translateY);

            for (var i = 0; i < circles.length; i++) {
                if (circles[i].x < minX) {
                    minX = circles[i].x;
                }
                if (circles[i].x > maxX) {
                    maxX = circles[i].x;
                }
                if (circles[i].y < minY) {
                    minY = circles[i].y;
                }
                if (circles[i].y > maxY) {
                    maxY = circles[i].y;
                }
            }
            return {
                maxX: maxX + translateX,
                maxY: maxY + translateY,
                minX: minX + translateX,
                minY: minY + translateY
            }
        }

        function changeEditPart(value) {
            if (vm.typeEditPart == 2) {
                clearPolygon();
            } else {
                clearPart();
            }
            vm.typeEditPart = value;
            loadInfoPart(vm.selected);
        }

        // не используется!
        function changeTextPart() {
            let index;

            if (vm.polygons.indexOf(vm.selectedPartId) !== -1) {
                index = getIndexText('polygon');
                vm.coordinatesPolygon[index].text = vm.selectedPartName;
            } else {
                index = getIndexText();
                vm.coordinatesParts[index].text = vm.selectedPartName;
            }
        }

        // выделение элементов дерева цветом
        function updateColor(type, value = true, firstItem = vm.selectedPart, zone = vm.selectedZone) {
            let treedata;
            if (type != 'devices') {
               firstItem += vm.devices.length;
            }

            if (type == 'zones' && zone !== undefined) {
                if (vm.saveTreedata === undefined) {
                    vm.saveTreedata = angular.copy(vm.treedata);
                }
                vm.treedata[firstItem]['children'][zone].isPlan = value;
            } else {
                vm.treedata[firstItem].isPlan = value;
            }
            //без это некорректно работает окраска дерева, если удалить раздел и добавить новый,перейти в другой раздел с сохранением изменений
            treedata = angular.copy(vm.treedata);
            vm.treedata = treedata;
        }

        // получение значений раздела
        function getValuePart(selectedId = vm.selected.id) {
            let value;

            if (vm.polygons.indexOf(selectedId) == -1) {
                for (var i = 0; i < vm.coordinatesParts.length; i++) {
                    if (vm.coordinatesParts[i].id == selectedId) {
                        value = {
                            x: vm.coordinatesParts[i].x,
                            y: vm.coordinatesParts[i].y,
                            width: vm.coordinatesParts[i].width,
                            height: vm.coordinatesParts[i].height,
                            xText: vm.coordinatesParts[i].xText,
                            yText: vm.coordinatesParts[i].yText,
                            text: vm.coordinatesParts[i].text
                        }
                    }
                }
            } else {
                for (var j = 0; j < vm.coordinatesPolygon.length; j++) {
                    if (vm.coordinatesPolygon[j].id == selectedId) {
                        value = {
                            polygon: vm.coordinatesPolygon[j].polygon,
                            circles: vm.coordinatesPolygon[j].circles,
                            xText: vm.coordinatesPolygon[j].xText,
                            yText: vm.coordinatesPolygon[j].yText,
                            text: vm.coordinatesPolygon[j].text
                        }
                    }
                }

            }
            return angular.toJson(value);
        }

        // удаление раздела с плана
        function deletePartPlan() {
            let zones = vm.parts[vm.selectedPart].zones;
            vm.default.x = 0;
            vm.default.y = 0;
            for (var i = 0; i < zones.length; i++) {
                if (zones[i].position_plan.length !== 0) {
                    vm.deleteZones.push({
                            id: zones[i].id,
                            index: i
                    });
                    updateColor('zones', false, vm.selectedPart, i);
                }
            }
            clearPart();
            clearPolygon();
            deleteZone(true, true);
            vm.saveCoordinatesParts = angular.copy(vm.coordinatesParts);
            vm.originalParts = angular.copy(vm.coordinatesParts);
            vm.saveCoordinatesPolygon = angular.copy(vm.coordinatesPolygon);
            vm.originalPolygon = angular.copy(vm.coordinatesPolygon);
        }

        // функция получения индекс для изменения текста
        function getIndexText(type = 'square', partId = vm.selectedPartId) {
            let parts;
            if (type == 'polygon') {
                parts = vm.coordinatesPolygon;
            } else {
                parts = vm.coordinatesParts;
            }

            for (var i = 0; i < parts.length; i++) {
                if (parts[i] !== undefined && partId == parts[i].id)
                    return i;
            }
        }

        // проверяем открыт ли раздел
        function isNode(id) {
            for (var i = 0; i < vm.expandedNodes.length; i++) {
                if (vm.expandedNodes[i].id == id && vm.parts[vm.expandedNodes[i].selectedPart].zones.length !== undefined) {
                    return true;
                }
            }
            return false;
        }

        function showPlan() {
            var modalInstance = $uibModal.open({
                templateUrl: '/app/controllers/images-modal.html',
                controller: 'ImagesModalController as mc',
                size:'lg',
                resolve: {
                    data: function () {
                        return {
                            images: vm.plans,
                            header: vm.translate.PLANS
                        }
                    }
                }
            });

            modalInstance.result.then(function () {
            });
        }

        function isShowType() {
            for (var i = 0; i < vm.coordinatesZones.length; i++) {
                if (vm.coordinatesZones[i].wall !== undefined) {
                    return true;
                }
            }
            return false;
        }

        // установка выбранного элемента на дереве
        function treeSelected() {
            let index = vm.typePlan == 'devices' ? getTreedataIndex(vm.selectedDeviceId) : getTreedataIndex(vm.selectedPartId);
            if (vm.selectedZone === undefined) {
                vm.selectedNode = vm.treedata[index];
            } else {
                let zoneIndex = Plan.getZoneIndex(vm.parts[vm.selectedPart].zones, vm.selectedZoneId);
                vm.selectedNode = vm.treedata[index].children[zoneIndex];
            }
        }

        function loadInfo(selected) {
            if (selected.zone !== undefined) {
                loadInfoZone(selected);
                drawWall();
            } else if (selected.type !== 'device') {
                loadInfoPart(selected);
            }
            vm.line.startX = 0;
            vm.line.startY = 0;
        }

        function loadInfoZone(zone) {
            if (!checkPart(zone.selectedPartId, true)) {
                vm.info = vm.translate.MARK_SECTION_PLAN
            } else {
                if (vm.typeEdit == 2) {
                vm.info = vm.translate.TO_EDIT_ZONES_WALL;
                } else {
                    vm.info = vm.translate.SPECIFY_LOC_SEL;
                }
            }
        }

        function setBaseImage(src, name, checkPart = true){
            if (isNotSaving(vm.selected, true) && checkPart) {
                if (src != vm.baseSrc) {
                    openModalImage(src, name);
                }
                return;
            }
            if (vm.object_image !== name) {
                if (vm.graph !== undefined)
                    vm.graph.width = undefined;
                imageWidthHeight($routeParams.id, name);
            }

            vm.baseSrc = src;
            vm.object_image = name;
            if (vm.typePlan == 'devices') {
                vm.devices[vm.selectedDevice].plan = name;
            } else {
                vm.parts[vm.selectedPart].object_image = name;
                loadInfoPart(vm.selected);
            }

            vm.default.x = 0;
            vm.default.y = 0;
            loadPlan();
        }

        function updatePlanInfo() {
            let query = {
                file_name: vm.object_image,
                object_id: $routeParams.id,
                width: String(vm.graph.width),
                height: String(vm.graph.height)
            };

            Websocket.updatePlanInfo(query).then(function(){
            });
        }

        // установка изображения на стену
        function setPlanWall(src, name) {
            vm.coordinatesZones[Plan.getZoneIndex(vm.coordinatesZones, vm.selected.id)].wall = name;
            deletePlanZone();
            drawWall();
        }

        // удаляем старые координаты зоны на другой стене, удаляем старую привязку к стене
        function deletePlanZone() {
            let zones = vm.saveWallCoordinate[vm.wall.selected];
            let zonesWall = vm.coordinatesWall[vm.wall.selected];

            if (zones !== undefined) {
                for (var i = 0; i < zones.length; i++) {
                    if (vm.parts[vm.selectedPart].zones[vm.selectedZone].zone == zones[i].number) {
                        vm.saveWallCoordinate[vm.wall.selected].splice(i, 1);
                    }
                }
            }

            if (zonesWall !== undefined) {
                for (var j = 0; j < zonesWall.length; j++) {
                    if (vm.parts[vm.selectedPart].zones[vm.selectedZone].zone == zonesWall[j].number) {
                            vm.coordinatesWall[vm.wall.selected].splice(j, 1);
                    }
                }
            }
        }

        function saveCoordinateWall() {
            vm.saveWallCoordinate[vm.wall.selected] = angular.copy(vm.coordinatesWall[vm.wall.selected]);
        }

        function convertJson(object, params) {
            let value = {
                x: object.x,
                y: object.y
            }
            if (params !== undefined) {
                for (var key in params) {
                    value[key] = params[key];
                }
            }
            return angular.toJson(value);
        }

        function getValueZone() {
            for (var i = 0; i < vm.coordinatesZones.length; i++) {
                if (vm.coordinatesZones[i].id == vm.selected.id) {
                    return convertJson(vm.coordinatesZones[i]);
                }
            }
        }

        function checkPartPlan() {
            if (vm.typePlan == 'zones' && !checkPart(vm.selectedPartId, true)) {
                return false;
            }
            return true;
        }

        function updateSelectedSvg(selected) {
            if (vm.coordinatesSvg === undefined) {
                return;
            }
            for (var i = 0; i < vm.coordinatesSvg.length; i++) {
                if (vm.coordinatesSvg[i].selectedId == selected.id) {
                    vm.selectedSvgIndex = i;
                    return;
                }
            }
            vm.selectedSvgIndex = undefined;
        }

        function getSelectedId() {
            if (vm.selectedSvg.type == 'part') {
                return vm.selectedPartId;
            } else if (vm.selectedSvg.type == 'device') {
                return vm.selectedDeviceId;
            }
            return vm.selected.id;
        }

        function reloadSvg(selected = vm.selected) {
            let data = Plan.getData();
            let firstIndex = selected.type === 'device' ? selected.index : selected.selectedPart;

            Plan.loadSvg(data.coordinatesSvg, vm.svgCache, vm.svgColor, firstIndex, selected.type, selected.isEdit).then(function(){
                vm.coordinatesSvg = Plan.getValue('planSvg');
                updateSelectedSvg(vm.selected);
                vm.saveCoordinatesSvg = angular.copy(vm.coordinatesSvg);
            });
        }

        //проверка отмечен ли свг на плане
        function checkSvg() {
            let selected;
            if (vm.selectedSvg.type == 'part') {
                selected = vm.selectedPart;
            } else {
                selected = vm.selectedDevice;
            }
            if (vm.selectedSvg.type == 'part' || vm.selectedSvg.type == 'device') {
                for (var i = 0; i < vm.coordinatesSvg.length; i++) {
                    if (vm.coordinatesSvg[i].selectedPart == selected && vm.selectedSvg.type == vm.coordinatesSvg[i].type) {
                        return true;
                    }
                }
            }

            return false;
        }

        function getDevices () {
            let filters = [];
            filters.push(Filters.addFilter("object_id", $routeParams.id));
            filters.push(Filters.addFilter("mark", 0));
            let query = {
                page: 1,
                unlimited: -1,
                sort_field: 'id',
                sort_type: 'asc',
                filters: filters
            };

            Websocket.eng.getObjectDevices(query).then(function(data) {
                vm.devices = data.data;
            });
        }

        function setSvgDefault(type) {
            if (vm.selectedSvg !== undefined && vm.selectedSvg.type === type) {
                return;
            }
            for (var i = 0; i < vm.svg.length; i++) {
                if (vm.svg[i].type == type) {
                    vm.setSvg(i);
                }
            }
        }

        function isReloadSvg(selected) {
            if (selected.type === 'device' && vm.selectedDevice !== selected.index) {
                return true;
            } else if (vm.selectedPartId != selected.selectedPartId) {
                return true;
            }
            return false;
        }

        function isUpdateType(selected) {
            if (selected.type === 'device' && vm.typePlan == 'parts') {
                return true;
            } else if (vm.typePlan == 'devices') {
                return true;
            }
            return false;
        }

        function getTitle() {
            if (vm.selectedSvg.type == 'part') {
                return 'БРШС ' + vm.parts[vm.selectedPart].part;
            }
            return vm.selected.label;
        }

        function showTitle(index) {
            vm.coordinatesSvg[index].isShow = true;
        }

        function hideTitle(index) {
            delete vm.coordinatesSvg[index].isShow;
        }

        //ширина хинта
        function widthTitle(w, type) {
            if (type === 'part') {
                return w * 12;
            }
            return w * 10;
        }

        function isHoverZone(id) {
            if (id === vm.hoverZone) {
                return false;
            }
            return true;
        }

        function hideText(id) {
            vm.hoverZone = id;
        }

        function showText() {
            delete vm.hoverZone;
        }

        function changeShowZone(){
            vm.showAllZones = !vm.showAllZones;
            if (vm.titleZones == vm.translate.SHOW_ALL_ZONES) {
                vm.titleZones = vm.translate.HIDE_ZONES_OTHER;
            } else {
                vm.titleZones = vm.translate.SHOW_ALL_ZONES;
            }
        }

        function updateOriginalParts() {
            if (vm.zooms.zoom == 1) {
                vm.originalParts = angular.copy(vm.coordinatesParts);
            }
        }

        function getObject() {
            Websocket.getObject({ id: $routeParams.id }).then(function(data) {
                vm.object_state = data.data.state_id;
            });
        }

        init();
    }

})();
