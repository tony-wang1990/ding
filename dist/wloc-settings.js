/* 老王打卡 WLOC 设置脚本
 *
 * 运行在 Shadowrocket / Surge / Loon / Stash / Egern / Quantumult X 的
 * http-request 脚本环境中。脚本只读写设备本地的 wloc_settings，不会把坐标
 * 上传到老王打卡服务器。
 */
(function () {
  "use strict";

  var STORE_KEY = "wloc_settings";
  var app = detectApp();
  var params = parseQuery((typeof $request !== "undefined" && $request.url) || "");
  var action = params.action || "save";
  var result;

  try {
    if (action === "query") result = querySettings();
    else if (action === "clear") result = clearSettings();
    else result = saveSettings(params);
  } catch (error) {
    result = { success: false, error: messageOf(error, "操作失败") };
  }

  finish({
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(result),
  });

  function saveSettings(input) {
    var lonRaw = firstPresent(input.lon, input.longitude);
    var latRaw = firstPresent(input.lat, input.latitude);
    if (isBlank(lonRaw) || isBlank(latRaw)) {
      return { success: false, error: "缺少 lon/lat 参数" };
    }

    var longitude = decimal(lonRaw);
    var latitude = decimal(latRaw);
    if (!validCoordinate(latitude, longitude)) {
      return { success: false, error: "经纬度格式错误或超出合法范围" };
    }

    var accuracy = boundedInteger(firstPresent(input.acc, input.accuracy), 25, 1, 1000);
    var previous = readSettings();
    var data = previous && typeof previous === "object" ? previous : {};
    data.longitude = longitude;
    data.latitude = latitude;
    data.accuracy = accuracy;
    data.updatedAt = new Date().toISOString();

    if (!isBlank(input.randomRadius)) {
      data.randomRadius = boundedNumber(input.randomRadius, 0, 0, 5000);
    } else if (!isFiniteNumber(data.randomRadius)) {
      data.randomRadius = 0;
    }

    if (!writeSettings(data)) {
      return { success: false, error: "设备存储写入失败" };
    }
    return {
      success: true,
      longitude: longitude,
      latitude: latitude,
      accuracy: accuracy,
      randomRadius: data.randomRadius,
    };
  }

  function querySettings() {
    var stored = readSettings();
    if (!stored || typeof stored !== "object") {
      return { success: false, error: "无已保存的坐标" };
    }
    var longitude = Number(stored.longitude);
    var latitude = Number(stored.latitude);
    if (!validCoordinate(latitude, longitude)) {
      return { success: false, error: "无已保存的坐标" };
    }
    return {
      success: true,
      longitude: longitude,
      latitude: latitude,
      accuracy: boundedInteger(stored.accuracy, 25, 1, 1000),
      randomRadius: boundedNumber(stored.randomRadius, 0, 0, 5000),
      updatedAt: stored.updatedAt || null,
    };
  }

  function clearSettings() {
    if (!removeSettings()) return { success: false, error: "设备存储清除失败" };
    return { success: true };
  }

  function detectApp() {
    if (typeof $task !== "undefined") return "Quantumult X";
    if (typeof $loon !== "undefined") return "Loon";
    if (typeof $rocket !== "undefined") return "Shadowrocket";
    if (typeof Egern !== "undefined") return "Egern";
    if (typeof $environment !== "undefined" && $environment) {
      if ($environment["stash-version"]) return "Stash";
      if ($environment["surge-version"]) return "Surge";
    }
    return "Unknown";
  }

  function readSettings() {
    var raw;
    if (app === "Quantumult X") raw = $prefs.valueForKey(STORE_KEY);
    else if (typeof $persistentStore !== "undefined") raw = $persistentStore.read(STORE_KEY);
    if (raw == null || raw === "") return null;
    if (typeof raw === "object") return raw;
    try { return JSON.parse(raw); } catch (_) { return null; }
  }

  function writeSettings(value) {
    var encoded = JSON.stringify(value);
    if (app === "Quantumult X") return $prefs.setValueForKey(encoded, STORE_KEY) !== false;
    if (typeof $persistentStore !== "undefined") return $persistentStore.write(encoded, STORE_KEY) !== false;
    return false;
  }

  function removeSettings() {
    if (app === "Quantumult X") return $prefs.removeValueForKey(STORE_KEY) !== false;
    if (typeof $persistentStore !== "undefined") {
      // 多数代理没有 remove API；写入 JSON null 与删除等价，读取时会得到 null。
      return $persistentStore.write("null", STORE_KEY) !== false;
    }
    return false;
  }

  function finish(response) {
    if (typeof $done !== "function") return;
    if (app === "Quantumult X") {
      response.status = "HTTP/1.1 200 OK";
      $done(response);
    } else {
      $done({ response: response });
    }
  }

  function parseQuery(url) {
    var query = String(url || "").split("?")[1] || "";
    var hashAt = query.indexOf("#");
    if (hashAt >= 0) query = query.slice(0, hashAt);
    var output = {};
    query.split("&").forEach(function (part) {
      if (!part) return;
      var equalAt = part.indexOf("=");
      var key = decode(equalAt < 0 ? part : part.slice(0, equalAt));
      var value = decode(equalAt < 0 ? "" : part.slice(equalAt + 1));
      if (!(key in output)) output[key] = value;
    });
    return output;
  }

  function decode(value) {
    try { return decodeURIComponent(String(value).replace(/\+/g, " ")); }
    catch (_) { return String(value); }
  }

  function firstPresent(first, second) {
    return !isBlank(first) ? first : second;
  }

  function isBlank(value) {
    return value == null || String(value).trim() === "";
  }

  function decimal(value) {
    return Number(String(value).trim().replace(",", "."));
  }

  function isFiniteNumber(value) {
    return typeof value === "number" && isFinite(value);
  }

  function validCoordinate(latitude, longitude) {
    return isFiniteNumber(latitude) && isFiniteNumber(longitude) &&
      Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  }

  function boundedNumber(value, fallback, min, max) {
    var number = Number(value);
    if (!isFiniteNumber(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function boundedInteger(value, fallback, min, max) {
    return Math.round(boundedNumber(value, fallback, min, max));
  }

  function messageOf(error, fallback) {
    return error && error.message ? String(error.message) : fallback;
  }
})();
