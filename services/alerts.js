(function() {
    'use strict';

    angular
        .module('hawk.services')
        .factory('Alerts', Alerts);

    Alerts.$inject = ['$uibModal', 'UserCtx', 'Websocket', 'Plan'];

    function Alerts ($uibModal, UserCtx, Websocket, Plan) {
        var data = {
            alert: 0,
            wall: {
                widthEl: 40,
                heightEl: 40
            }
        };

        return {
            setValue: setValue,
            getValue: getValue,
            getData: getData,
            showAlertModal: showAlertModal,
            load: load,
            loadZones: loadZones,
            getZonesWall: getZonesWall
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


        function setDefaultAlert() {
            let data = getData();
            data.parts = {};
            data.zones = {};
            data.coordinatesParts = [];
            data.coordinatesPolygon = [];
            data.coordinatesZones = [];
            data.radius = 8;
            data.wall = {
                widthEl: 40,
                heightEl: 40
            };
            setValue('data', data);
        }

        // загрузка данных по зонам
        function loadZones(part, zones, coordinatesZones) {
            let zone, params, zoneWall;
            let coordinates = coordinatesZones !== undefined ? coordinatesZones : [];

            for (var j = 0; j < zones.length; j++) {
                if (zones[j].position_plan.length !== 0) {
                    zone = JSON.parse(zones[j].position_plan);
                    params = {
                        id: zones[j].id,
                        x: zone.x,
                        y: zone.y,
                        r: data.radius,
                        number: zones[j].name_plane ? zones[j].name_plane : zones[j].zone,
                        originalNumber: zones[j].zone,
                        title: zones[j].information,
                        part: part
                    }

                    if (data.alertZones[part].indexOf(String(zones[j].zone)) !== -1) {
                        params.alert = true;
                    }

                    if (zones[j].position_wall.length !== 0) {
                        zoneWall = JSON.parse(zones[j].position_wall);
                        params.xWall = zoneWall.x;
                        params.yWall = zoneWall.y;
                        params.wall = zoneWall.wall;
                    }

                    coordinates.push(params);
                }
            }
            data.coordinatesZones = coordinates;
            return coordinates;
        }


        // загрузка данных по зонам на стены
        function getZonesWall(zones, selectedZoneId, selectedPart) {
            let values, selectedWall;
            let index = Plan.getZoneIndex(zones, selectedZoneId);
            data.coordinatesWall = [];
            if (index === undefined || zones[index].wall === undefined) {
                return;
            }

            selectedWall = zones[index].wall;

            for (var i = 0; i < zones.length; i++) {

                if (zones[i].wall !== undefined && zones[i].wall == selectedWall && zones[i].part == selectedPart) {
                    values = {
                        x: zones[i].xWall,
                        y: zones[i].yWall
                    };
                    values.id = zones[i].id;
                    values.number = zones[i].number;
                    values.width = data.wall.widthEl;
                    values.height = data.wall.heightEl;
                    if (data.alertZones[selectedPart].indexOf(String(values.number)) !== -1) {
                        values.alert = true;
                    }
                    data.coordinatesWall.push(values);
                }
            }
            return {
                coordinatesWall : data.coordinatesWall,
                selected: selectedWall
            }
        }

        function load(alerts) {
            let part, count, partInfo, parts = [], partsAlert = [];
            data.alertZones = [];
            setDefaultAlert();
            count = alerts.length;
            for (var j = 0; j < count; j++) {
                part = alerts[j].part;
                if (data.alertZones[part] === undefined) {
                    data.alertZones[part] = [];
                }
                data.alertZones[part].push(alerts[j].zone);

                if (partsAlert.indexOf(part) === -1) {
                    partInfo = {
                        id: alerts[j].part_id,
                        name: alerts[j].part_name,
                        part: part,
                        plan_part_shape: alerts[j].plan_part_shape
                    }
                    loadPart(part, partInfo);
                    parts.push(partInfo);
                    partsAlert.push(part);
                }
            }
            return {
                coordinatesParts: data.coordinatesParts,
                coordinatesPolygon: data.coordinatesPolygon,
                parts: parts
            }
        }

        function loadPart(part, partInfo) {
            let params, part_shape;

            if (partInfo.plan_part_shape.length !== 0) {
                part_shape = JSON.parse(partInfo.plan_part_shape);
                if (part_shape.polygon === undefined) {
                    params = {
                        id: partInfo.id,
                        part: partInfo.part,
                        x: part_shape.x,
                        y: part_shape.y,
                        height: part_shape.height,
                        width: part_shape.width,
                        xText: part_shape.xText,
                        yText: part_shape.yText,
                        text: part_shape.text
                    }
                    data.coordinatesParts.push(params);
                } else {
                    params = {
                        id: partInfo.id,
                        part: partInfo.part,
                        polygon: part_shape.polygon,
                        circles: part_shape.circles,
                        xText: part_shape.xText,
                        yText: part_shape.yText,
                        text: part_shape.text
                    }
                    data.coordinatesPolygon.push(params);
                }
            }
        }

        function showAlertModal(alerts, modal) {
            var modalInstance = $uibModal.open({
                templateUrl: '/app/app-dpu/controllers/object-alert-modal.html',
                controller: 'ObjectAlertModalController as mc',
                size: 'lg',
                windowClass: 'my-modal-popup',
                resolve: {
                    alert: function () {
                        return alerts;
                    }
                }
            });

            modalInstance.result.then(function () {
                setValue(modal, false);
            });
            setValue(modal, true);
        }
    }
})();
