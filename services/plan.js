(function() {
    'use strict';

    angular
        .module('hawk.services')
        .factory('Plan', Plan);

    Plan.$inject = ['Websocket', 'Base', 'UserCtx', '$q', '$sce'];

    function Plan (Websocket, Base, UserCtx, $q, $sce) {
        var data = {
            radius: 8,
            graph: {},
            imageSrc: "/img/",
            profile: UserCtx.getProfile(),
            translate: UserCtx.getTranslate()
        };

        return {
            setValue: setValue,
            getValue: getValue,
            getData: getData,
            getPartsQuery : getPartsQuery,
            generatePartString: generatePartString,
            getZonesQuery: getZonesQuery,
            getZoneIndex: getZoneIndex,
            loadZone: loadZone,
            imageWidthHeight: imageWidthHeight,
            getWallCoordinate: getWallCoordinate,
            getImages: getImages,
            loadSvg: loadSvg,
            isBlockPart: isBlockPart,
            getSelectedPart: getSelectedPart
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

        function getPartsQuery (object) {
            return  {
                page: 1,
                unlimited: 1,
                sort_field: 'part',
                sort_type: 'asc',
                filters: [
                    {
                        sign: "+",
                        field: "object_id",
                        operation: "eq",
                        value: object
                    },
                    {
                        sign: "+",
                        field: "mark",
                        operation: "gte",
                        value: 0
                    }
                ]
            }
        }

        function getZonesQuery(part) {
            let query = {
                page: 1,
                unlimited: 1,
                sort_field: 'zone',
                sort_type: 'asc'
            }
            var filters = [
                    {
                            sign: "+",
                            field: "part_id",
                            operation: "in",
                            value: part
                    },
                    {
                        sign: "+",
                        field: "oz.mark",
                        operation: "gte",
                        value: 0
                    }];
            query.filters =  filters;
            return query;
        }

        // генерация строки для получений зон по всем разделам
        function generatePartString(parts) {
            let parrtition, partsIndex = [];
            for (var i = 0; i < parts.length; i++) {
                if (parrtition) {
                    parrtition += ',' + parts[i].id;
                } else {
                    parrtition = parts[i].id;
                }
                partsIndex[parts[i].part] = i;
            }
            return {
                parrtition: parrtition,
                partsIndex: partsIndex
            };
        }

        // индекс зоны в деревер
        function getZoneIndex(zones, id) {
            for (var i = 0; i < zones.length; i++) {
                if (zones[i].id == id) {
                    return i;
                }
            }
        }

        function loadZone(zones, coordinates, blocked = 1) {
            let zone, params, zoneWall, hidden = blocked;
            let coordinatesZones = coordinates !== undefined ? coordinates : [];

            for (var j = 0; j < zones.length; j++) {
                if (zones[j].position_plan.length !== 0) {
                    zone = JSON.parse(zones[j].position_plan);
                    if (zones[j].state_id != 16 || data.profile.role_id != 1) { // Запрещено редактирование
                        blocked = 1;
                    }

                    params = {
                        id: zones[j].id,
                        x: zone.x,
                        y: zone.y,
                        r: data.radius,
                        number: zones[j].name_plane ? zones[j].name_plane : zones[j].zone,
                        title: zones[j].information,
                        index: j,
                        blocked: blocked,
                        hidden: hidden
                    }

                    if (zones[j].position_wall.length !== 0) {
                        zoneWall = JSON.parse(zones[j].position_wall);
                        params.xWall = zoneWall.x;
                        params.yWall = zoneWall.y;
                        params.wall = zoneWall.wall;
                    }
                    coordinatesZones.push(params);
                }
            }
            return coordinatesZones;
        }

        // получение высоты и ширины плана // значения и координаты свг coordinatesSvg
        function imageWidthHeight(id, name) {
            let query = {
                file_name: name,
                object_id: id
            };
            let defered = $q.defer();
            let src = "/img/" + id + "/plan/" + name;
            data.coordinatesSvg = '';

            Websocket.getPlanInfo(query, defered, src).then(function(responce) {
                if (responce.length === 0 || responce.status === 'error') {
                    loadPlanFolder(defered, src);
                    return defered.promise;
                }
                data.coordinatesSvg = responce.data.device;
                if (responce.data.width.length !== 0 && responce.data.height !== 0) {
                    data.graph = {
                        width: responce.data.width,
                        height: responce.data.height
                    }
                    defered.resolve('ok');
                } else {
                    loadPlanFolder(defered, src);
                }
            });
            return defered.promise;
        }

        function loadPlanFolder(defered, src) {
            let img = new Image();
            img.onload = function() {
                data.graph = {
                    width: this.width,
                    height: this.height
                }
                correctWidthHeight(defered);
            }
            img.src = src;
        }

        // корректировка высоты и ширины плана
        function correctWidthHeight(defered) {
            let params, maxWidth = 1200, maxHeight = 900;
            params = Base.correctWidthHeight(maxWidth, maxHeight, data.graph.width, data.graph.height);
            data.graph.width = params.width;
            data.graph.height = params.height;
            defered.resolve('ok');
        }

        // получение координаты зоны на стене
        function getWallCoordinate(coordinate, zoneId, saveZones) {
            if (saveZones !== undefined) {
                for (var i = 0; i < saveZones.length; i++) {
                    if (saveZones[i].id == zoneId) {
                        return {
                            x: saveZones[i].x,
                            y: saveZones[i].y
                        }
                    }
                }
            }

            if (coordinate.yWall !== undefined) {
                return {
                    x: coordinate.xWall,
                    y: coordinate.yWall
                }
            } else {
                return {
                    x: 0,
                    y: 0
                }
            }
        }

        //получить планы объектов, и стен
        function getImages(object_id) {
            let query = {
                id: object_id
            };
            let plans, image, rooms;
            let defered = $q.defer();
            data.plans = [];
            data.rooms = [];
            data.messageError = '';

            Websocket.eng.getImagesObject(query, defered).then(function (responce) {
                if (responce.status == "success") {
                    plans = responce['plan'];
                    for (var i = 0; i < plans.length; i++) {
                        image = {
                            src: data.imageSrc + object_id + "/plan/" + plans[i].files,
                            name: plans[i].files
                        }
                        data.plans.push(image);
                    }

                    rooms = responce['room'];
                    for (var j = 0; j < rooms.length; j++) {
                        image = {
                            src: data.imageSrc + object_id + "/room/" + rooms[j].part + "/" + rooms[j].files,
                            name: rooms[j].files,
                            part: rooms[j].part
                        }
                        data.rooms.push(image);
                    }
                } else {
                    data.messageError = data.translate.ERROR;
                }

                if (plans.length === 0) {
                    data.messageError = data.translate.NO_PLANS_FTO;
                }
                defered.resolve("ok");
            });
            return defered.promise;
        }

        // переносить элемент или нет
        function isBlockPart(index, parts, typePlan, selected) {
            if (data.profile.role_id != 1 || parts[index].state_id != 16) {
                return true;
            }

            if (typePlan == 'zones') {
                return true;
            } else if (parts[index].id !== selected.id) {
                return true;
            }
            return false;
        }

        // получение свг на плане
        function loadSvg(svg, values, svgColor = 'green', part = 0, type, isEdit = true) {
            let defered = $q.defer();
            let query = {
                name: 'svg'
            };
            let reg = /#color#/gi;

            if (svg === undefined || svg.length === 0) {
                defered.resolve("ok");
                data.planSvg = [];
                return defered.promise;
            }

            if (values !== undefined) {
                getPlanSvg(svg, values, svgColor, part, type, isEdit);
                defered.resolve("ok");
            } else {
                Websocket.getRef(query, svg).then(function(data){
                    for (var j = 0; j < data.data.length; j++) {
                        data.data[j].code = data.data[j].code.replace(reg, svgColor);
                        data.data[j].code = $sce.trustAsHtml(data.data[j].code);
                    }
                    getPlanSvg(svg, data.data, svgColor, part, type);
                    defered.resolve("ok");
                });
            }

            return defered.promise;
        }

        // корректирова svg кода
        function getPlanSvg(svg, values, color, part, type, isEdit) {
            let coordinates = JSON.parse(svg), value;
            data.planSvg = [];

            for (var i = 0; i < coordinates.length; i++) {
                value = getSvgValue(values, coordinates[i].id);
                coordinates[i].code = getCodeSvg(value.code, color, coordinates[i].color);
                coordinates[i].width = value.width;
                coordinates[i].height = value.height;
                coordinates[i].blocked = coordinates[i].selectedPart != part || type != coordinates[i].type || !isEdit || data.profile.role_id != 1  ? 1 : 0;
                data.planSvg.push(coordinates[i]);
            }
        }

        function getSvgValue(values, id) {
            for (var i = 0; i < values.length; i++) {
                if (values[i].id == id) {
                    return values[i];
                }
            }
        }

        function getCodeSvg(code, color, colorDefault) {
            let reg = /#color#/gi;
            if (colorDefault === undefined) {
                code = code.replace(reg, color);
            } else {
                code = code.replace(reg, colorDefault);
            }
            return $sce.trustAsHtml(code);
        }

        //полечение раздела по zone_id
        function getSelectedPart(parts, zone_id) {
            let zones;
            for (var i = 0; i < parts.length; i++) {
                zones = parts[i].zones;
                for (var j = 0; j < zones.length; j++) {
                    if (zone_id == zones[j].id) {
                        return {
                            part: i,
                            id: parts[i].id
                        };
                    }
                }
            }
        }

    }
})();
