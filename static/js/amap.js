// 生成高德实例map
var map = new AMap.Map("container", {
  resizeEnable: true,
  zoomEnable: true,
  center: [116.397428, 39.90923],
  zoom: 12
});

// 生成控制实例scale
var scale = new AMap.Scale();
map.addControl(scale);

// 生成达到路线范围实例arrivalRange
var arrivalRange = new AMap.ArrivalRange();
var x, y, t, vehicle = "SUBWAY,BUS";
var workAddress, workMarker;
var rentMarkerArray = [];
var polygonArray = [];
var amapTransfer;

var infoWindow = new AMap.InfoWindow({
  offset: new AMap.Pixel(0, -30)
});

// 绑定work-location事件
var auto = new AMap.Autocomplete({
  input: "work-location"
});
AMap.event.addListener(auto, "select", workLocationSelected);


// 获取服务器爬取的csv文件
loadRentLocationByFile('/static/bj58.csv'); 

function takeBus(radio) {
  vehicle = radio.value;
  loadWorkLocation()
}

function takeSubway(radio) {
  vehicle = radio.value;
  loadWorkLocation()
}

// function importRentInfo(fileInfo) {
//   var file = fileInfo.files[0].name;
//   loadRentLocationByFile(file);
// }

function workLocationSelected(e) {
  workAddress = e.poi.name;
  loadWorkLocation();
}

function loadWorkMarker(x, y, locationName) {
  workMarker = new AMap.Marker({
    map: map,
    title: locationName,
    icon: 'http://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
    position: [x, y]

  });
}


function loadWorkRange(x, y, t, color, v) {
  arrivalRange.search([x, y], t, function(status, result) {
    if (result.bounds) {
      for (var i = 0; i < result.bounds.length; i++) {
        var polygon = new AMap.Polygon({
          map: map,
          fillColor: color,
          fillOpacity: "0.4",
          strokeColor: color,
          strokeOpacity: "0.8",
          strokeWeight: 1
        });
        polygon.setPath(result.bounds[i]);
        polygonArray.push(polygon);
      }
    }
  }, {
    policy: v
  });
}

function addMarkerByAddress(address, url) {
  var geocoder = new AMap.Geocoder({
    city: "北京",
    radius: 1000
  });
  geocoder.getLocation(address, function(status, result) {
    if (status === "complete" && result.info === 'OK') {
      var geocode = result.geocodes[0];
      rentMarker = new AMap.Marker({
        map: map,
        title: address,
        icon: 'http://webapi.amap.com/theme/v1.3/markers/n/mark_b.png', 
        position: [geocode.location.getLng(), geocode.location.getLat()]
      });
      rentMarkerArray.push(rentMarker);

      rentMarker.content = "<div>房源：<a target = '_blank' href=" + url + "'>" + address + "</a><div>"
      rentMarker.on('click', function(e) {
        infoWindow.setContent(e.target.content);
        infoWindow.open(map, e.target.getPosition());
        if (amapTransfer) amapTransfer.clear();
        amapTransfer = new AMap.Transfer({
          map: map,
          policy: AMap.TransferPolicy.LEAST_TIME,
          city: "北京市",
          panel: 'transfer-panel'
        });
        amapTransfer.search([{
          keyword: workAddress
        }, {
          keyword: address
        }], function(status, result) {})
      });
    }
  })
}

function delWorkLocation() {
  if (polygonArray) map.remove(polygonArray);
  if (workMarker) map.remove(workMarker);
  polygonArray = [];
}

function delRentLocation() {
  if (rentMarkerArray) map.remove(rentMarkerArray);
  rentMarkerArray = [];
}

function loadWorkLocation() {
  delWorkLocation();
  var geocoder = new AMap.Geocoder({
    city: "北京",
    radius: 1000
  });

  geocoder.getLocation(workAddress, function(status, result) {
    if (status === "complete" && result.info === 'OK') {
      var geocode = result.geocodes[0];
      x = geocode.location.getLng();
      y = geocode.location.getLat();
      loadWorkMarker(x, y);
      loadWorkRange(x, y, 60, "#3f67a5", vehicle);
      map.setZoomAndCenter(12, [x, y]);
    }
  })
}

// jquery获得文件，对文件进行处理，对每行的数据进行地址标注addMarkerByAddress
function loadRentLocationByFile(fileName) {
  delRentLocation();
  var rent_locations = new Set();
  $.get(fileName, function(data) {
    data = data.split("\n");
    // 遍历每行数据
    data.forEach(function(item, index) {
      const title = item.split(",")[0]
      const location = item.split(",")[1]
      const money = item.split(",")[2]
      const url = item.split(",")[3]

      addMarkerByAddress(location, url);
      
      // rent_locations.add(item.split(",")[1]);
    });
    // rent_locations.forEach(function(element, index) {
    //   addMarkerByAddress(element);
    // });
  });
}
