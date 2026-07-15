// server.js
// "트렌드 TOP 10"의 가짜(Mock) API 서버입니다.
// Node.js 기본 http 모듈만 사용하며, express 같은 외부 라이브러리는 쓰지 않습니다.
//
// v0.7부터는 실제 네이버 API를 "테스트용" 주소 2개(/api/search-trend-test,
// /api/shopping-insight-test)로만 호출해볼 수 있습니다. 화면(index.html)이 실제로
// 사용하는 /api/trends는 아직 그대로 예시(가짜) 데이터를 돌려줍니다.
//
// 주의: 네이버 API 키(Client ID)나 Secret은 반드시 이 서버(server.js) 쪽 환경변수
// (.env 파일)에만 보관하고, index.html 같은 브라우저(클라이언트) 코드에는 절대 넣지
// 마세요. 응답이나 콘솔 로그에도 Secret 값 자체는 절대 출력하지 않습니다.

var http = require("http");
var https = require("https");
var fs = require("fs");
var path = require("path");

// 프로젝트 폴더에 .env 파일이 있으면 읽어서 process.env에 넣어줍니다.
// dotenv 같은 외부 라이브러리 없이, Node.js 기본 fs 모듈만으로 아주 간단하게 처리합니다.
// (.env 파일이 없어도 에러 없이 그냥 넘어갑니다.)
function loadEnvFile() {
  var envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  var lines = fs.readFileSync(envPath, "utf8").split("\n");

  lines.forEach(function (line) {
    line = line.trim();

    if (!line || line.indexOf("#") === 0) {
      return; // 빈 줄이나 주석(#으로 시작)은 건너뜀
    }

    var eqIndex = line.indexOf("=");
    if (eqIndex === -1) {
      return;
    }

    var key = line.slice(0, eqIndex).trim();
    var value = line.slice(eqIndex + 1).trim();

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

loadEnvFile();

// 네이버 API 키는 코드에 직접 적지 않고, 환경변수(.env 파일 등)에서만 읽어옵니다.
// 아직 실제 네이버 API를 호출하지는 않으며, 이 값들이 "설정되어 있는지"만 확인하는 데 사용합니다.
//
// 쇼핑인사이트(구매 순위용)와 검색어트렌드(검색 순위용) API 키를 따로 관리할 수 있도록
// 용도별 환경변수를 우선 사용하고, 없으면 기존 공용 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET을
// 그대로 사용합니다(fallback).
var NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || "";
var NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || "";

var NAVER_SHOPPING_CLIENT_ID = process.env.NAVER_SHOPPING_CLIENT_ID || NAVER_CLIENT_ID;
var NAVER_SHOPPING_CLIENT_SECRET = process.env.NAVER_SHOPPING_CLIENT_SECRET || NAVER_CLIENT_SECRET;
var NAVER_SEARCH_TREND_CLIENT_ID = process.env.NAVER_SEARCH_TREND_CLIENT_ID || NAVER_CLIENT_ID;
var NAVER_SEARCH_TREND_CLIENT_SECRET = process.env.NAVER_SEARCH_TREND_CLIENT_SECRET || NAVER_CLIENT_SECRET;

var categories = ["전체", "패션의류", "뷰티", "생활용품", "식품", "디지털가전", "스포츠레저"];

// /api/trends가 실제 네이버 API 호출에 실패했을 때 대신 보여줄 예시(가짜) 데이터.
// (변수 이름을 실제 화면 의미에 맞춰 mockShoppingProductData / mockSearchData로 정리)
var mockShoppingProductData = [
  { rank: 1,  name: "무선 블루투스 이어폰",     category: "디지털가전", change: "+2" },
  { rank: 2,  name: "썸머 시원 원피스",         category: "패션의류", change: "0" },
  { rank: 3,  name: "저자극 수분 선크림",       category: "뷰티", change: "-1" },
  { rank: 4,  name: "고단백 프로틴바 12입",     category: "식품", change: "+1" },
  { rank: 5,  name: "원터치 캠핑 텐트",         category: "스포츠레저", change: "new" },
  { rank: 6,  name: "쿠션 러닝화",             category: "스포츠레저", change: "-2" },
  { rank: 7,  name: "휴대용 목걸이 선풍기",     category: "생활용품", change: "+3" },
  { rank: 8,  name: "진정 수딩 마스크팩 10매",  category: "뷰티", change: "0" },
  { rank: 9,  name: "제로 칼로리 곤약젤리",     category: "식품", change: "-1" },
  { rank: 10, name: "감성 캠핑 랜턴",           category: "생활용품", change: "new" }
];

var mockSearchData = [
  { rank: 1,  name: "여름 원피스 추천",   category: "패션의류", change: "+1" },
  { rank: 2,  name: "무선 이어폰 추천",   category: "디지털가전", change: "0" },
  { rank: 3,  name: "다이어트 간식 추천", category: "식품", change: "+4" },
  { rank: 4,  name: "캠핑 용품 리스트",   category: "스포츠레저", change: "new" },
  { rank: 5,  name: "선크림 순위",       category: "뷰티", change: "-2" },
  { rank: 6,  name: "런닝화 추천",       category: "스포츠레저", change: "+1" },
  { rank: 7,  name: "여름 휴가 룩 코디",  category: "패션의류", change: "-1" },
  { rank: 8,  name: "캠핑 의자 추천",     category: "생활용품", change: "0" },
  { rank: 9,  name: "미백 세럼 순위",     category: "뷰티", change: "new" },
  { rank: 10, name: "홈트레이닝 용품",    category: "생활용품", change: "-3" }
];

// /api/trends에서 사용자가 키워드를 따로 입력하지 않았을 때 쓰는 기본 키워드 묶음입니다.
// (v0.7 테스트 주소들과 같은 키워드를 그대로 기본값으로 사용합니다.)
var DEFAULT_TREND_KEYWORDS = ["선크림", "양산", "여름원피스"];
var TREND_TEST_KEYWORD_CATEGORY = {
  "선크림": "뷰티",
  "양산": "생활용품",
  "여름원피스": "패션의류"
};

var MAX_KEYWORD_COUNT = 3;
var MAX_KEYWORD_LENGTH = 20;

// /api/market-status가 기본으로 사용하는 관심 키워드 10개와, 각 키워드의 참고용
// 카테고리입니다. 화면에 미리 정해둔 키워드일 뿐, 사용자가 입력한 값이 아닙니다.
var MARKET_STATUS_KEYWORDS = [
  "선크림", "양산", "여름원피스", "쿨토시", "제습기",
  "미니선풍기", "래쉬가드", "샌들", "냉감이불", "물놀이용품"
];

var MARKET_STATUS_KEYWORD_CATEGORY = {
  "선크림": "뷰티",
  "양산": "생활용품",
  "여름원피스": "패션의류",
  "쿨토시": "패션의류",
  "제습기": "디지털가전",
  "미니선풍기": "디지털가전",
  "래쉬가드": "스포츠레저",
  "샌들": "패션의류",
  "냉감이불": "생활용품",
  "물놀이용품": "스포츠레저"
};

// 네이버 데이터랩 API(검색어트렌드/쇼핑인사이트)는 한 번의 요청에서 최대 5개
// 키워드(그룹)까지만 비교할 수 있습니다. 관심 키워드 10개를 5개씩 두 묶음으로 나눠
// 각각 따로 요청한 뒤 결과를 합칩니다.
var DATALAB_BATCH_SIZE = 5;

// v3.4: /api/market-status가 사용자 입력 키워드(쿼리 문자열의 반복된 keyword
// 파라미터)를 받을 때 적용하는 제한값입니다.
var MAX_MARKET_STATUS_KEYWORD_COUNT = 10;
var MAX_MARKET_STATUS_KEYWORD_LENGTH = 30;

// 키워드 하나에서 제어문자(개행류 포함)를 제거하고 앞뒤 공백을 지웁니다.
// 제어문자를 파일 경로나 명령어로 쓰는 곳은 없지만, 화면/로그에 이상한 문자가
// 섞여 나오는 것을 막기 위해 항상 이 함수를 거칩니다.
function sanitizeMarketStatusKeyword(rawKeyword) {
  return String(rawKeyword)
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim();
}

// index.html의 "시장현황 키워드" 편집 UI가 보낸 keyword 파라미터(같은 이름을
// 여러 번 반복, 예: ?keyword=선크림&keyword=쿠션)를 검증하고 정리합니다.
// rawKeywords가 빈 배열이면(요청에 keyword 파라미터가 전혀 없으면) 이 함수를
// 호출하지 않고 기본 키워드(MARKET_STATUS_KEYWORDS)를 그대로 씁니다 — 기본
// 키워드 목록의 단일 기준은 이 서버 파일에만 둡니다.
function validateMarketStatusKeywords(rawKeywords) {
  var seen = {};
  var cleaned = [];

  rawKeywords.forEach(function (rawKeyword) {
    var keyword = sanitizeMarketStatusKeyword(rawKeyword);
    if (!keyword || seen[keyword]) {
      return; // 빈 값과 중복은 건너뛴다(입력 순서는 그대로 유지됨)
    }
    seen[keyword] = true;
    cleaned.push(keyword);
  });

  if (cleaned.length === 0) {
    return {
      keywords: null,
      error: {
        status: 400,
        message: "시장현황 키워드를 1개 이상 입력해 주세요.",
        detail: "공백이나 제어문자만 있는 값은 유효한 키워드로 처리되지 않습니다."
      }
    };
  }

  if (cleaned.length > MAX_MARKET_STATUS_KEYWORD_COUNT) {
    return {
      keywords: null,
      error: {
        status: 400,
        message: "시장현황 키워드는 최대 " + MAX_MARKET_STATUS_KEYWORD_COUNT + "개까지 입력할 수 있습니다.",
        detail: "입력한 키워드 개수(중복 제외): " + cleaned.length + "개 (" + cleaned.join(", ") + ")"
      }
    };
  }

  var tooLongKeywords = cleaned.filter(function (keyword) {
    return keyword.length > MAX_MARKET_STATUS_KEYWORD_LENGTH;
  });

  if (tooLongKeywords.length > 0) {
    return {
      keywords: null,
      error: {
        status: 400,
        message: "키워드는 " + MAX_MARKET_STATUS_KEYWORD_LENGTH + "자 이내로 입력해 주세요.",
        detail: "너무 긴 키워드: " + tooLongKeywords.join(", ")
      }
    };
  }

  return { keywords: cleaned, error: null };
}

// index.html의 "트렌드 조회" 버튼이 보낸 keywords 쿼리값(예: "선크림,양산,여름원피스")을
// 검사하고 정리합니다. 값이 비어 있으면 기본 키워드를 그대로 쓰고, 형식이 잘못됐으면
// (빈 키워드, 너무 긴 키워드, 3개 초과 등) 초보자가 이해할 수 있는 에러 정보를 돌려줍니다.
function parseKeywordsParam(rawParam) {
  if (!rawParam || !rawParam.trim()) {
    return { keywords: DEFAULT_TREND_KEYWORDS, error: null };
  }

  var keywords = rawParam.split(",").map(function (keyword) {
    return keyword.trim();
  });

  if (keywords.some(function (keyword) { return keyword.length === 0; })) {
    return {
      keywords: null,
      error: {
        status: 400,
        message: "키워드 형식이 올바르지 않습니다.",
        detail: "쉼표(,)로 구분한 키워드 사이에 빈 값이 없어야 합니다. 예: 선크림,양산,여름원피스"
      }
    };
  }

  if (keywords.length > MAX_KEYWORD_COUNT) {
    return {
      keywords: null,
      error: {
        status: 400,
        message: "키워드는 최대 " + MAX_KEYWORD_COUNT + "개까지만 입력할 수 있습니다.",
        detail: "입력한 키워드 개수: " + keywords.length + "개 (" + keywords.join(", ") + ")"
      }
    };
  }

  var tooLongKeywords = keywords.filter(function (keyword) {
    return keyword.length > MAX_KEYWORD_LENGTH;
  });

  if (tooLongKeywords.length > 0) {
    return {
      keywords: null,
      error: {
        status: 400,
        message: "키워드가 너무 깁니다. " + MAX_KEYWORD_LENGTH + "자 이내로 입력해주세요.",
        detail: "너무 긴 키워드: " + tooLongKeywords.join(", ")
      }
    };
  }

  return { keywords: keywords, error: null };
}

function getBaseDate() {
  var today = new Date();
  var y = today.getFullYear();
  var m = String(today.getMonth() + 1).padStart(2, "0");
  var d = String(today.getDate()).padStart(2, "0");
  return y + "." + m + "." + d + " 기준";
}

function formatDateForNaver(date) {
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, "0");
  var d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

// 네이버 데이터랩 API는 "오늘" 데이터는 아직 집계되지 않아서 endDate로 쓸 수 없습니다.
// 그래서 어제를 endDate로, 그로부터 days일 전을 startDate로 잡아 안전한 최근 기간을 구합니다.
function getRecentDateRange(days) {
  var end = new Date();
  end.setDate(end.getDate() - 1);

  var start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  return {
    startDate: formatDateForNaver(start),
    endDate: formatDateForNaver(end)
  };
}

// 네이버 데이터랩 API(검색어트렌드 / 쇼핑인사이트)를 POST 방식으로 호출하는 공용 함수입니다.
// clientId/clientSecret이 비어 있으면 아예 호출하지 않고 바로 에러를 알려줍니다.
// 성공/실패와 상관없이 Client Secret 값은 콘솔에 출력하지 않습니다.
function callNaverDatalab(apiPath, clientId, clientSecret, requestBody, callback) {
  if (!clientId || !clientSecret) {
    callback({
      status: 500,
      message: "네이버 API 키가 설정되어 있지 않습니다.",
      detail: ".env 파일에 이 API에 필요한 Client ID/Secret 값을 채워주세요."
    });
    return;
  }

  var bodyText = JSON.stringify(requestBody);

  var options = {
    hostname: "openapi.naver.com",
    path: apiPath,
    method: "POST",
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(bodyText)
    }
  };

  var apiReq = https.request(options, function (apiRes) {
    var chunks = [];

    apiRes.on("data", function (chunk) {
      chunks.push(chunk);
    });

    apiRes.on("end", function () {
      var rawText = Buffer.concat(chunks).toString("utf8");
      var parsed;

      try {
        parsed = JSON.parse(rawText);
      } catch (parseError) {
        callback({
          status: 502,
          message: "네이버 서버 응답을 해석할 수 없습니다(JSON 형식이 아님).",
          detail: rawText.slice(0, 300)
        });
        return;
      }

      if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
        callback(null, parsed);
      } else {
        callback({
          status: apiRes.statusCode,
          message: "네이버 API가 오류를 반환했습니다.",
          detail: parsed
        });
      }
    });
  });

  apiReq.on("error", function (err) {
    // err.message에는 네트워크 오류 내용만 담기며, 키/시크릿 값은 포함되지 않습니다.
    callback({
      status: 500,
      message: "네이버 서버에 연결하는 중 오류가 발생했습니다.",
      detail: err.message
    });
  });

  apiReq.write(bodyText);
  apiReq.end();
}

function sendJson(res, statusCode, data, extraHeaders) {
  var headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  };
  if (extraHeaders) {
    for (var headerKey in extraHeaders) {
      if (Object.prototype.hasOwnProperty.call(extraHeaders, headerKey)) {
        headers[headerKey] = extraHeaders[headerKey];
      }
    }
  }
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(data));
}

function averageRatio(seriesData) {
  if (!seriesData.length) {
    return 0;
  }
  var sum = seriesData.reduce(function (total, point) {
    return total + point.ratio;
  }, 0);
  return sum / seriesData.length;
}

// "변동" 값은 네이버가 공식적으로 제공하는 순위 변동이 아니라, 최근 7일 평균과
// 그 이전 7일 평균의 관심도(ratio) 차이를 우리가 직접 계산한 근사치입니다.
// (데이터가 14일보다 적으면 마지막 값과 첫 값을 단순 비교합니다.)
function computeChangeFromSeries(seriesData) {
  if (seriesData.length < 2) {
    return "0";
  }

  var half = Math.min(7, Math.floor(seriesData.length / 2));
  var recentSlice = seriesData.slice(seriesData.length - half);
  var previousSlice = seriesData.slice(seriesData.length - half * 2, seriesData.length - half);

  var recentAvg = averageRatio(recentSlice);
  var previousAvg = previousSlice.length ? averageRatio(previousSlice) : recentAvg;
  var diff = Math.round(recentAvg - previousAvg);

  if (diff > 0) {
    return "+" + diff;
  }
  if (diff < 0) {
    return String(diff);
  }
  return "0";
}

// 네이버 데이터랩 응답(results 배열)을 화면 표에서 쓰는 { rank, name, category, change }
// 모양의 배열로 바꿔줍니다. 응답에 쓸만한 데이터가 없으면 null을 돌려주고, 호출한 쪽에서
// 예시 데이터로 대체하도록 합니다.
function buildRankedListFromDatalab(apiResult, categoryMap) {
  if (!apiResult || !Array.isArray(apiResult.results) || apiResult.results.length === 0) {
    return null;
  }

  var items = apiResult.results.map(function (result) {
    var seriesData = Array.isArray(result.data) ? result.data : [];
    return {
      name: result.title,
      category: categoryMap[result.title] || "생활용품",
      change: computeChangeFromSeries(seriesData),
      _avgRatio: averageRatio(seriesData)
    };
  });

  items.sort(function (a, b) {
    return b._avgRatio - a._avgRatio;
  });

  items.forEach(function (item, index) {
    item.rank = index + 1;
    delete item._avgRatio;
  });

  return items;
}

// 네이버 쇼핑 검색 API(/v1/search/shop.json)가 title에 검색어를 강조하려고 붙여주는
// <b>, </b> 태그를 없애고, 함께 오는 HTML 엔티티(&amp; 등)도 원래 글자로 되돌립니다.
function stripNaverHighlightTags(text) {
  if (!text) {
    return "";
  }
  return String(text)
    .replace(/<\/?b>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// 네이버 쇼핑 검색 API(검색 API의 하나)를 GET 방식으로 호출하는 함수입니다.
// 데이터랩 API(callNaverDatalab)와는 다른 주소/호출 방식(GET + 쿼리스트링)을 씁니다.
// clientId/clientSecret이 비어 있으면 호출하지 않고 바로 에러를 알려줍니다.
// 성공/실패와 상관없이 Client Secret 값은 콘솔에 출력하지 않습니다.
function callNaverShoppingSearchApi(clientId, clientSecret, query, callback) {
  if (!clientId || !clientSecret) {
    callback({
      status: 500,
      message: "네이버 API 키가 설정되어 있지 않습니다.",
      detail: ".env 파일(또는 Render 환경변수)에 NAVER_SHOPPING_CLIENT_ID/SECRET 값을 채워주세요."
    });
    return;
  }

  var searchPath =
    "/v1/search/shop.json?query=" + encodeURIComponent(query) +
    "&display=10&start=1&sort=sim";

  var options = {
    hostname: "openapi.naver.com",
    path: searchPath,
    method: "GET",
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret
    }
  };

  var apiReq = https.request(options, function (apiRes) {
    var chunks = [];

    apiRes.on("data", function (chunk) {
      chunks.push(chunk);
    });

    apiRes.on("end", function () {
      var rawText = Buffer.concat(chunks).toString("utf8");
      var parsed;

      try {
        parsed = JSON.parse(rawText);
      } catch (parseError) {
        callback({
          status: 502,
          message: "네이버 서버 응답을 해석할 수 없습니다(JSON 형식이 아님).",
          detail: rawText.slice(0, 300)
        });
        return;
      }

      if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
        callback(null, parsed);
      } else {
        callback({
          status: apiRes.statusCode,
          message: "네이버 API가 오류를 반환했습니다.",
          detail: parsed
        });
      }
    });
  });

  apiReq.on("error", function (err) {
    // err.message에는 네트워크 오류 내용만 담기며, 키/시크릿 값은 포함되지 않습니다.
    callback({
      status: 500,
      message: "네이버 서버에 연결하는 중 오류가 발생했습니다.",
      detail: err.message
    });
  });

  apiReq.end();
}

// 네이버 쇼핑 검색 API 응답(items 배열)을 화면에서 바로 쓰기 쉬운 모양으로 정리합니다.
// 응답에 items 배열이 없으면 null을 돌려주고, 호출한 쪽에서 오류로 처리하도록 합니다.
function buildShoppingSearchItems(apiResult) {
  if (!apiResult || !Array.isArray(apiResult.items) || apiResult.items.length === 0) {
    return null;
  }

  return apiResult.items.map(function (item, index) {
    return {
      rank: index + 1,
      title: stripNaverHighlightTags(item.title),
      mallName: item.mallName || "",
      lprice: item.lprice || "",
      hprice: item.hprice || "",
      productType: item.productType || "",
      brand: item.brand || "",
      maker: item.maker || "",
      category1: item.category1 || "",
      category2: item.category2 || "",
      category3: item.category3 || "",
      category4: item.category4 || "",
      link: item.link || "",
      image: item.image || ""
    };
  });
}

// 배열을 size개씩 묶어서 여러 개의 작은 배열로 나눕니다.
// (네이버 데이터랩 API의 "한 번에 최대 5개까지" 제한을 지키기 위해 사용합니다.)
function chunkArray(arr, size) {
  var chunks = [];
  for (var i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// 키워드 하나의 시계열(seriesData)에서 "최근 관심도 평균", "최근 대비 이전 기간 증감",
// "상승/하락/보합" 방향을 계산합니다. 같은 API 호출(같은 배치) 안에서 한 키워드의
// 시계열 값끼리 비교하는 것이므로, 배치가 서로 달라도 이 증감 방향 자체는 유효합니다.
// (다만 서로 다른 배치에서 받은 두 키워드의 절대적인 관심도 점수를 직접 비교하는 것은
// 네이버 데이터랩이 배치(요청)마다 값을 0~100으로 따로 정규화하기 때문에 근사치일
// 수밖에 없습니다. 이 프로젝트는 "참고용 개인 대시보드"이므로 이 근사치를 그대로
// 사용하되, 공식 순위처럼 소개하지 않습니다.)
function computeTrendInfo(seriesData) {
  if (!seriesData.length) {
    return { avgRatio: 0, diff: 0, trend: "flat" };
  }
  if (seriesData.length < 2) {
    return { avgRatio: averageRatio(seriesData), diff: 0, trend: "flat" };
  }

  var half = Math.min(7, Math.floor(seriesData.length / 2));
  var recentSlice = seriesData.slice(seriesData.length - half);
  var previousSlice = seriesData.slice(seriesData.length - half * 2, seriesData.length - half);

  var recentAvg = averageRatio(recentSlice);
  var previousAvg = previousSlice.length ? averageRatio(previousSlice) : recentAvg;
  var diff = recentAvg - previousAvg;

  var trend = "flat";
  if (diff > 1) {
    trend = "up";
  } else if (diff < -1) {
    trend = "down";
  }

  return { avgRatio: averageRatio(seriesData), diff: Math.round(diff), trend: trend };
}

// 관심 키워드 묶음(최대 5개)의 검색어트렌드(검색 관심도 추이)를 조회합니다.
function fetchSearchTrendBatch(keywords, dateRange, callback) {
  var body = {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    timeUnit: "date",
    keywordGroups: keywords.map(function (keyword) {
      return { groupName: keyword, keywords: [keyword] };
    })
  };
  callNaverDatalab(
    "/v1/datalab/search",
    NAVER_SEARCH_TREND_CLIENT_ID,
    NAVER_SEARCH_TREND_CLIENT_SECRET,
    body,
    callback
  );
}

// 관심 키워드 묶음(최대 5개)의 쇼핑인사이트(쇼핑 클릭 추이)를 조회합니다.
// /api/trends와 동일하게 예시 카테고리 코드("50000000")를 사용합니다.
function fetchShoppingInsightBatch(keywords, dateRange, callback) {
  var body = {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    timeUnit: "date",
    category: "50000000",
    keyword: keywords.map(function (keyword) {
      return { name: keyword, param: [keyword] };
    }),
    device: "",
    gender: "",
    ages: []
  };
  callNaverDatalab(
    "/v1/datalab/shopping/category/keywords",
    NAVER_SHOPPING_CLIENT_ID,
    NAVER_SHOPPING_CLIENT_SECRET,
    body,
    callback
  );
}

// ===== v3.9 1단계: 애니메이션 주간 관심도 API (POST /api/anime-weekly-trends) =====
//
// 화면(index.html)은 아직 이 API를 호출하지 않습니다. 이번 단계는 서버 쪽 계산과
// 네이버 검색어트렌드 API 연동만 검증하는 단계입니다.
//
// 이 API는 기존 NAVER_SEARCH_TREND_CLIENT_ID / NAVER_SEARCH_TREND_CLIENT_SECRET
// 환경변수와 기존 callNaverDatalab 헬퍼를 그대로 재사용합니다. .env 파일은 읽기만
// 하고 수정하지 않으며, Client ID/Secret 값은 로그나 응답에 절대 출력하지 않습니다.

var SEOUL_TIME_ZONE = "Asia/Seoul";

var ANIME_MIN_GROUPS = 1;
var ANIME_MAX_GROUPS = 5;
var ANIME_TITLE_MAX_LENGTH = 50;
var ANIME_KEYWORD_MAX_LENGTH = 50;
var ANIME_MAX_KEYWORDS_PER_GROUP = 20; // title 포함

var ANIME_WEEKS_DEFAULT = 12;
var ANIME_WEEKS_MIN = 4;
var ANIME_WEEKS_MAX = 26;

var ANIME_MAX_BODY_BYTES = 16 * 1024;
var ANIME_NAVER_TIMEOUT_MS = 10000;

var ANIME_CACHE_TTL_MS = 30 * 60 * 1000;
var ANIME_CACHE_TTL_SECONDS = 30 * 60;
var ANIME_CACHE_MAX_ENTRIES = 50;

// 서버 메모리에만 저장하는 캐시입니다. 파일/DB/.env에는 저장하지 않으며,
// 서버를 재시작하면 그대로 사라집니다. 실패 응답은 절대 캐시하지 않습니다.
var animeTrendsCache = new Map();

// 요청 본문(JSON)을 읽어옵니다. 외부 body-parser 패키지 없이 http 기본 스트림
// 이벤트만으로 처리하며, 최대 크기(ANIME_MAX_BODY_BYTES)를 넘으면 즉시 중단합니다.
// 본문 내용은 어떤 경우에도 로그에 출력하지 않습니다.
function readJsonBody(req, maxBytes, callback) {
  var chunks = [];
  var totalSize = 0;
  var finished = false;

  function finish(err, data) {
    if (finished) {
      return;
    }
    finished = true;
    callback(err, data);
  }

  req.on("data", function (chunk) {
    if (finished) {
      return;
    }
    totalSize += chunk.length;
    if (totalSize > maxBytes) {
      // 소켓을 바로 끊으면(req.destroy) 413 응답을 다 쓰기 전에 연결이 끊길 수
      // 있으므로, 여기서는 청크 쌓기만 멈추고(finished=true) 응답은 정상적으로
      // 보냅니다. 남은 요청 본문은 그냥 버려집니다.
      finish({
        status: 413,
        message: "요청 본문이 너무 큽니다(최대 16KB)."
      });
      return;
    }
    chunks.push(chunk);
  });

  req.on("end", function () {
    if (finished) {
      return;
    }
    var bodyText = Buffer.concat(chunks).toString("utf8");

    if (!bodyText.trim()) {
      finish({ status: 400, message: "요청 본문이 필요합니다." });
      return;
    }

    var parsed;
    try {
      parsed = JSON.parse(bodyText);
    } catch (parseError) {
      finish({ status: 400, message: "요청 본문이 올바른 JSON 형식이 아닙니다." });
      return;
    }

    finish(null, parsed);
  });

  req.on("error", function () {
    finish({ status: 400, message: "요청 본문을 읽는 중 오류가 발생했습니다." });
  });
}

// 문자열에서 제어문자(개행류 포함)를 제거합니다. title/keywords 검증에서 공통으로 씁니다.
function stripControlChars(text) {
  return String(text).replace(/[\x00-\x1F\x7F]/g, "");
}

function roundTo2(num) {
  return Math.round(num * 100) / 100;
}

// 클라이언트가 보낸 animeGroups를 검증하고, title/keywords를 정리한 배열로 바꿉니다.
// (title도 keywords 목록에 자동 포함시키고, 합쳐서 중복 제거 후 최대 20개로 제한합니다.)
function validateAnimeGroups(rawAnimeGroups) {
  if (!Array.isArray(rawAnimeGroups)) {
    return { groups: null, error: { status: 400, message: "animeGroups는 배열이어야 합니다." } };
  }

  if (rawAnimeGroups.length < ANIME_MIN_GROUPS) {
    return { groups: null, error: { status: 400, message: "비교할 애니메이션을 최소 1개 이상 입력해 주세요." } };
  }

  if (rawAnimeGroups.length > ANIME_MAX_GROUPS) {
    return { groups: null, error: { status: 400, message: "비교할 애니메이션은 최대 " + ANIME_MAX_GROUPS + "개까지 등록할 수 있습니다." } };
  }

  var seenTitleKeys = {};
  var groups = [];

  for (var i = 0; i < rawAnimeGroups.length; i++) {
    var rawGroup = rawAnimeGroups[i];

    if (!rawGroup || typeof rawGroup !== "object" || Array.isArray(rawGroup)) {
      return { groups: null, error: { status: 400, message: (i + 1) + "번째 항목의 형식이 올바르지 않습니다." } };
    }

    if (typeof rawGroup.title !== "string") {
      return { groups: null, error: { status: 400, message: (i + 1) + "번째 애니메이션의 title이 필요합니다." } };
    }

    var title = stripControlChars(rawGroup.title).trim();

    if (!title) {
      return { groups: null, error: { status: 400, message: (i + 1) + "번째 애니메이션의 title이 비어 있습니다." } };
    }

    if (title.length > ANIME_TITLE_MAX_LENGTH) {
      return { groups: null, error: { status: 400, message: "title은 " + ANIME_TITLE_MAX_LENGTH + "자 이내로 입력해 주세요." } };
    }

    var titleKey = title.toLowerCase();
    if (seenTitleKeys[titleKey]) {
      return { groups: null, error: { status: 400, message: "중복된 title이 있습니다: " + title } };
    }
    seenTitleKeys[titleKey] = true;

    if (!Array.isArray(rawGroup.keywords)) {
      return { groups: null, error: { status: 400, message: "\"" + title + "\"의 keywords는 배열이어야 합니다." } };
    }

    var combined = [];
    var combinedSeen = {};
    var candidateList = [title].concat(rawGroup.keywords);

    for (var j = 0; j < candidateList.length; j++) {
      var candidate = candidateList[j];

      if (typeof candidate !== "string") {
        return { groups: null, error: { status: 400, message: "\"" + title + "\"의 keywords에는 문자열만 입력할 수 있습니다." } };
      }

      var cleaned = stripControlChars(candidate).trim();
      if (!cleaned) {
        continue; // 빈 값은 제거
      }

      if (cleaned.length > ANIME_KEYWORD_MAX_LENGTH) {
        return { groups: null, error: { status: 400, message: "검색어는 " + ANIME_KEYWORD_MAX_LENGTH + "자 이내로 입력해 주세요: " + cleaned } };
      }

      var key = cleaned.toLowerCase();
      if (combinedSeen[key]) {
        continue; // 중복 제거(입력 순서는 유지)
      }
      combinedSeen[key] = true;
      combined.push(cleaned);
    }

    if (combined.length === 0) {
      return { groups: null, error: { status: 400, message: "\"" + title + "\"에 사용할 수 있는 검색어가 없습니다." } };
    }

    if (combined.length > ANIME_MAX_KEYWORDS_PER_GROUP) {
      return { groups: null, error: { status: 400, message: "\"" + title + "\"의 검색어(제목 포함)는 최대 " + ANIME_MAX_KEYWORDS_PER_GROUP + "개까지 사용할 수 있습니다." } };
    }

    groups.push({ title: title, keywords: combined });
  }

  return { groups: groups, error: null };
}

// weeks 값을 검증합니다. 입력이 없으면 기본값(12)을 그대로 씁니다.
function validateAnimeWeeks(rawWeeks) {
  if (rawWeeks === undefined || rawWeeks === null) {
    return { weeks: ANIME_WEEKS_DEFAULT, error: null };
  }

  if (typeof rawWeeks !== "number" || !Number.isInteger(rawWeeks)) {
    return { weeks: null, error: { status: 400, message: "weeks는 정수여야 합니다." } };
  }

  if (rawWeeks < ANIME_WEEKS_MIN || rawWeeks > ANIME_WEEKS_MAX) {
    return { weeks: null, error: { status: 400, message: "weeks는 " + ANIME_WEEKS_MIN + "~" + ANIME_WEEKS_MAX + " 사이의 정수여야 합니다." } };
  }

  return { weeks: rawWeeks, error: null };
}

// Asia/Seoul 기준 오늘 날짜의 연/월/일을 구합니다(서버가 어떤 시간대에서 실행되든
// 항상 서울 기준 날짜를 씁니다).
function getSeoulDateParts(date) {
  var formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  var map = {};
  formatter.formatToParts(date).forEach(function (part) {
    map[part.type] = part.value;
  });
  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10)
  };
}

// Asia/Seoul 기준 "오늘"을, 순수 날짜 연산(요일/일수 계산)만을 위한 UTC 자정 Date로
// 표현합니다. 이렇게 하면 서버의 로컬 시간대 설정과 무관하게 항상 같은 결과가 나옵니다.
function seoulTodayAsUtcMidnight() {
  var parts = getSeoulDateParts(new Date());
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function addDaysUtc(date, days) {
  var result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatUtcDateForNaver(date) {
  var y = date.getUTCFullYear();
  var m = String(date.getUTCMonth() + 1).padStart(2, "0");
  var d = String(date.getUTCDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

function parseNaverDateAsUtc(dateStr) {
  var parts = dateStr.split("-").map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}

// 상품 규칙: 한 주는 월요일~일요일, 진행 중인 주는 순위 계산에서 제외하고 가장
// 최근에 끝난 일요일까지만 조회 범위(endDate)로 씁니다. startDate는 그 최근 완료
// 주를 포함해 weeks만큼 거슬러 올라간 월요일입니다.
function computeAnimeWeeklyRange(weeks) {
  var today = seoulTodayAsUtcMidnight();
  var dow = today.getUTCDay(); // 0=일요일 ... 6=토요일
  var isoDow = dow === 0 ? 7 : dow; // 1=월요일 ... 7=일요일

  var thisWeekMonday = addDaysUtc(today, -(isoDow - 1));
  var endDate = addDaysUtc(thisWeekMonday, -1); // 가장 최근에 끝난 일요일
  var mostRecentCompletedMonday = addDaysUtc(endDate, -6);
  var startDate = addDaysUtc(mostRecentCompletedMonday, -(weeks - 1) * 7);

  return {
    startDate: formatUtcDateForNaver(startDate),
    endDate: formatUtcDateForNaver(endDate)
  };
}

// startDate부터 7일 간격으로 weeks개의 주(월요일 날짜) 목록을 만듭니다.
// 네이버 응답에 특정 주가 빠져 있어도(0으로 채우지 않고) 항상 이 목록을 기준으로
// weekly 배열을 구성하기 위해 씁니다.
function buildExpectedAnimeWeekPeriods(startDate, weeks) {
  var periods = [];
  var current = parseNaverDateAsUtc(startDate);
  for (var i = 0; i < weeks; i++) {
    periods.push(formatUtcDateForNaver(current));
    current = addDaysUtc(current, 7);
  }
  return periods;
}

// 캐시 키를 만듭니다. animeGroups(그룹 순서 포함)와 weeks, 계산된 날짜 범위만
// 반영하고 Client ID/Secret은 포함하지 않습니다.
function buildAnimeTrendsCacheKey(groups, weeks, range) {
  var normalized = {
    weeks: weeks,
    startDate: range.startDate,
    endDate: range.endDate,
    groups: groups.map(function (group) {
      return { title: group.title, keywords: group.keywords };
    })
  };
  return JSON.stringify(normalized);
}

function getAnimeTrendsCache(key) {
  var entry = animeTrendsCache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    animeTrendsCache.delete(key);
    return null;
  }
  return entry.body;
}

function setAnimeTrendsCache(key, body) {
  if (animeTrendsCache.has(key)) {
    animeTrendsCache.delete(key);
  }
  animeTrendsCache.set(key, { expiresAt: Date.now() + ANIME_CACHE_TTL_MS, body: body });

  // Map은 삽입 순서를 유지하므로, 가장 오래된(가장 먼저 삽입된) 항목부터 지웁니다.
  while (animeTrendsCache.size > ANIME_CACHE_MAX_ENTRIES) {
    var oldestKey = animeTrendsCache.keys().next().value;
    animeTrendsCache.delete(oldestKey);
  }
}

function withAnimeCacheFlags(responseBody, cacheHit) {
  var out = {};
  for (var key in responseBody) {
    if (Object.prototype.hasOwnProperty.call(responseBody, key)) {
      out[key] = responseBody[key];
    }
  }
  out.cacheHit = cacheHit;
  out.cacheTtlSeconds = ANIME_CACHE_TTL_SECONDS;
  return out;
}

// callNaverDatalab을 그대로 재사용하되, 이 API 전용으로 타임아웃(기본 10초)을
// 추가합니다. 기존 callNaverDatalab 자체는 수정하지 않습니다.
function callNaverDatalabWithTimeout(apiPath, clientId, clientSecret, requestBody, timeoutMs, callback) {
  var isDone = false;
  var timer = setTimeout(function () {
    if (isDone) {
      return;
    }
    isDone = true;
    callback({ status: 504, message: "네이버 API 응답 시간이 초과되었습니다." });
  }, timeoutMs);

  callNaverDatalab(apiPath, clientId, clientSecret, requestBody, function (err, data) {
    if (isDone) {
      return; // 이미 타임아웃으로 응답을 보낸 뒤 늦게 도착한 응답은 무시합니다.
    }
    isDone = true;
    clearTimeout(timer);
    callback(err, data);
  });
}

// 네이버 API 오류를 사용자용 메시지/상태코드로 바꿉니다. 원본 오류 전문이나
// Client ID/Secret은 절대 포함하지 않습니다.
function mapAnimeTrendsNaverError(err) {
  var status = err && err.status;

  if (status === 403) {
    return {
      status: 403,
      message: "네이버 개발자센터에서 데이터랩(검색어트렌드) API 권한을 확인해 주세요."
    };
  }

  if (status === 429) {
    return {
      status: 429,
      message: "네이버 데이터랩 호출 한도를 초과했습니다."
    };
  }

  if (status === 504) {
    return {
      status: 504,
      message: "네이버 API 응답이 지연되어 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."
    };
  }

  return {
    status: 502,
    message: "네이버 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
  };
}

// 각 애니메이션의 순위(currentRank/previousRank)를 매깁니다. ratio가 null인 항목은
// 순위가 없고(null), 동점이면 요청된 animeGroups 순서 -> title 순으로 안정 정렬합니다.
function assignAnimeRanks(rawItems, ratioField, rankField) {
  rawItems.forEach(function (item) {
    item[rankField] = null;
  });

  var eligible = rawItems.filter(function (item) {
    return item[ratioField] !== null;
  });

  eligible.sort(function (a, b) {
    if (b[ratioField] !== a[ratioField]) {
      return b[ratioField] - a[ratioField];
    }
    if (a.originalIndex !== b.originalIndex) {
      return a.originalIndex - b.originalIndex;
    }
    return a.title.localeCompare(b.title);
  });

  eligible.forEach(function (item, idx) {
    item[rankField] = idx + 1;
  });
}

// 네이버 데이터랩 응답을 이 프로젝트의 정규화된 items 형태로 바꿉니다.
// - 결측 주는 0으로 채우지 않고 null로 남겨둡니다(expectedPeriods 기준).
// - ratio가 숫자가 아니면(NaN/Infinity 포함) null로 처리합니다.
function buildAnimeWeeklyItems(groups, naverResult, expectedPeriods) {
  var resultsByTitle = {};
  if (naverResult && Array.isArray(naverResult.results)) {
    naverResult.results.forEach(function (result) {
      resultsByTitle[result.title] = result;
    });
  }

  var rawItems = groups.map(function (group, index) {
    var result = resultsByTitle[group.title];
    var dataByPeriod = {};
    if (result && Array.isArray(result.data)) {
      result.data.forEach(function (point) {
        dataByPeriod[point.period] = point;
      });
    }

    var weekly = expectedPeriods.map(function (period) {
      var point = dataByPeriod[period];
      var ratio = (point && typeof point.ratio === "number" && isFinite(point.ratio))
        ? roundTo2(point.ratio)
        : null;
      return { period: period, ratio: ratio };
    });

    var latestPoint = weekly.length > 0 ? weekly[weekly.length - 1] : null;
    var previousPoint = weekly.length > 1 ? weekly[weekly.length - 2] : null;

    var latestRatio = latestPoint ? latestPoint.ratio : null;
    var previousRatio = previousPoint ? previousPoint.ratio : null;

    var changePoint = (latestRatio !== null && previousRatio !== null)
      ? roundTo2(latestRatio - previousRatio)
      : null;

    var last4 = weekly.slice(Math.max(0, weekly.length - 4));
    var valid4 = last4.filter(function (point) {
      return point.ratio !== null;
    });
    var average4Weeks = valid4.length > 0
      ? roundTo2(valid4.reduce(function (sum, p) { return sum + p.ratio; }, 0) / valid4.length)
      : null;

    var status;
    if (latestRatio !== null && previousRatio !== null) {
      if (changePoint > 0) {
        status = "up";
      } else if (changePoint < 0) {
        status = "down";
      } else {
        status = "flat";
      }
    } else if (latestRatio !== null) {
      status = "new";
    } else {
      status = "unavailable";
    }

    return {
      originalIndex: index,
      title: group.title,
      keywords: group.keywords,
      weekly: weekly,
      latestRatio: latestRatio,
      previousRatio: previousRatio,
      changePoint: changePoint,
      average4Weeks: average4Weeks,
      average4WeeksCount: valid4.length,
      status: status
    };
  });

  assignAnimeRanks(rawItems, "latestRatio", "currentRank");
  assignAnimeRanks(rawItems, "previousRatio", "previousRank");

  var items = rawItems.map(function (item) {
    var rankChange = (item.currentRank !== null && item.previousRank !== null)
      ? (item.previousRank - item.currentRank)
      : null;

    return {
      title: item.title,
      keywords: item.keywords,
      weekly: item.weekly,
      latestRatio: item.latestRatio,
      previousRatio: item.previousRatio,
      changePoint: item.changePoint,
      average4Weeks: item.average4Weeks,
      average4WeeksCount: item.average4WeeksCount,
      currentRank: item.currentRank,
      previousRank: item.previousRank,
      rankChange: rankChange,
      status: item.status
    };
  });

  var rankingWeekPeriod = expectedPeriods.length > 0
    ? expectedPeriods[expectedPeriods.length - 1]
    : null;

  return { items: items, rankingWeekPeriod: rankingWeekPeriod };
}

function handleAnimeWeeklyTrendsRequest(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, {
      ok: false,
      message: "애니메이션 주간 트렌드는 POST 요청만 지원합니다."
    }, { "Allow": "POST" });
    return;
  }

  var contentTypeHeader = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (contentTypeHeader !== "application/json") {
    sendJson(res, 400, {
      ok: false,
      message: "Content-Type은 application/json이어야 합니다."
    });
    return;
  }

  readJsonBody(req, ANIME_MAX_BODY_BYTES, function (bodyErr, body) {
    if (bodyErr) {
      sendJson(res, bodyErr.status, { ok: false, message: bodyErr.message });
      return;
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      sendJson(res, 400, { ok: false, message: "요청 본문 형식이 올바르지 않습니다." });
      return;
    }

    var groupsResult = validateAnimeGroups(body.animeGroups);
    if (groupsResult.error) {
      sendJson(res, groupsResult.error.status, { ok: false, message: groupsResult.error.message });
      return;
    }

    var weeksResult = validateAnimeWeeks(body.weeks);
    if (weeksResult.error) {
      sendJson(res, weeksResult.error.status, { ok: false, message: weeksResult.error.message });
      return;
    }

    if (!NAVER_SEARCH_TREND_CLIENT_ID || !NAVER_SEARCH_TREND_CLIENT_SECRET) {
      sendJson(res, 503, {
        ok: false,
        message: "네이버 검색어트렌드 API 키가 아직 설정되지 않았습니다."
      });
      return;
    }

    var groups = groupsResult.groups;
    var weeks = weeksResult.weeks;
    var range = computeAnimeWeeklyRange(weeks);
    var expectedPeriods = buildExpectedAnimeWeekPeriods(range.startDate, weeks);

    var cacheKey = buildAnimeTrendsCacheKey(groups, weeks, range);
    var cachedBody = getAnimeTrendsCache(cacheKey);

    if (cachedBody) {
      sendJson(res, 200, withAnimeCacheFlags(cachedBody, true));
      return;
    }

    var requestBody = {
      startDate: range.startDate,
      endDate: range.endDate,
      timeUnit: "week",
      keywordGroups: groups.map(function (group) {
        return { groupName: group.title, keywords: group.keywords };
      })
    };

    callNaverDatalabWithTimeout(
      "/v1/datalab/search",
      NAVER_SEARCH_TREND_CLIENT_ID,
      NAVER_SEARCH_TREND_CLIENT_SECRET,
      requestBody,
      ANIME_NAVER_TIMEOUT_MS,
      function (err, data) {
        if (err) {
          var mapped = mapAnimeTrendsNaverError(err);
          console.error("[anime-weekly-trends] 네이버 API 호출 실패 (status: " + (err.status || "unknown") + ")");
          sendJson(res, mapped.status, { ok: false, message: mapped.message });
          return;
        }

        var built = buildAnimeWeeklyItems(groups, data, expectedPeriods);

        var responseBody = {
          ok: true,
          dataSource: "NAVER_DATALAB_SEARCH_TREND",
          timeUnit: "week",
          timezone: SEOUL_TIME_ZONE,
          range: {
            startDate: range.startDate,
            endDate: range.endDate,
            requestedWeeks: weeks
          },
          rankingWeek: {
            period: built.rankingWeekPeriod,
            label: "최근 완료 주"
          },
          comparisonScope: "selected_anime_groups_only",
          items: built.items,
          notices: [
            "이 순위는 이번 요청에 포함된 애니메이션끼리 비교한 결과입니다.",
            "검색 관심도 지수는 실제 검색 횟수, 판매량 또는 매출을 의미하지 않습니다.",
            "비교 작품 구성이 바뀌면 상대 지수의 정규화 기준도 달라질 수 있습니다."
          ]
        };

        setAnimeTrendsCache(cacheKey, responseBody);

        sendJson(res, 200, withAnimeCacheFlags(responseBody, false));
      }
    );
  });
}

// ===== v3.9.1 1단계: 자동 애니메이션 TOP 5 (GET /api/anime-auto-top5) =====
//
// 이 라우트는 사용자가 애니메이션 후보를 직접 입력하지 않아도, 서버가 다음을
// 자동으로 수행한다.
//   1) AniList에서 현재 글로벌 트렌딩 후보를 가져오고
//   2) 같은 시리즈/시즌을 가능한 범위에서 하나로 묶고
//   3) 후보 30개를 구성한 뒤
//   4) 네이버 데이터랩 검색어트렌드로 "한국 검색 관심도"를 비교하고
//   5) 공통 기준 작품(anchor) 대비 보정지수로 여러 요청 결과를 안전하게 연결하고
//   6) 예비 상위 5개를 고른 다음
//   7) 그 5개를 마지막으로 한 번 더 같은 요청에 넣어 최종 순위를 확정한다.
//
// 중요: AniList trending/popularity는 "후보 발견용" 보조 정보일 뿐, 최종 순위는
// 항상 네이버 검색 관심도(ratio)로만 정한다. 서로 다른 네이버 요청의 ratio는
// 그대로 비교하지 않고, 반드시 공통 기준 작품(anchor) 대비 보정지수
// (anchorNormalizedIndex)로 변환한 뒤에만 비교한다. 최종 TOP 5는 하나의 네이버
// 요청에서 다시 검증한 값으로만 확정한다. 이 결과는 "전체 애니메이션 공식
// 순위"가 아니라 "AniList 자동 후보군 30개 안에서 네이버 검색 관심도가 높은
// TOP 5"라는 점을 응답 notices에서도 분명히 밝힌다.
//
// 이 블록은 기존 POST /api/anime-weekly-trends(1단계) 코드를 전혀 수정하지
// 않고, callNaverDatalab / callNaverDatalabWithTimeout / mapAnimeTrendsNaverError /
// computeAnimeWeeklyRange / buildExpectedAnimeWeekPeriods / roundTo2 /
// stripControlChars / chunkArray / sendJson 등 기존 헬퍼를 그대로 재사용한다.

function isValidNumber(value) {
  return typeof value === "number" && isFinite(value);
}

// 한글(가-힣, 자모)이 포함되어 있는지 확인한다. AniList에는 한국어 제목이 항상
// 있는 것은 아니므로, 한글 검색어 존재 여부를 판단하는 데만 사용한다.
function containsHangul(text) {
  return /[가-힣ᄀ-ᇿ㄰-㆏]/.test(String(text));
}

// "Season 2", "2nd Season", "Part 2", "시즌 2", "2기", "파트 2" 같은 명백한
// 시즌 접미사만 보수적으로 제거한다. 이 결과는 "동일 시리즈 보조 병합" 판단
// 용도로만 쓰고, 화면/응답에 노출하는 제목 자체는 바꾸지 않는다.
function stripSeasonSuffix(title) {
  var result = String(title).trim();
  var patterns = [
    /[\s:_-]*season\s*\d+\s*$/i,
    /[\s:_-]*\d+\s*(st|nd|rd|th)\s*season\s*$/i,
    /[\s:_-]*part\s*\d+\s*$/i,
    /[\s:_-]*시즌\s*\d+\s*$/i,
    /[\s:_-]*\d+\s*기\s*$/i,
    /[\s:_-]*파트\s*\d+\s*$/i
  ];
  patterns.forEach(function (pattern) {
    result = result.replace(pattern, "");
  });
  return result.trim();
}

// 시즌 접미사를 지우고 유니코드/대소문자를 정규화한 "보조 중복 제거용 키"를
// 만든다. 너무 짧은 키(AUTO_TOP5_MIN_MERGE_KEY_LENGTH 미만)는 오병합 위험이
// 커서 호출한 쪽에서 아예 병합 후보로 쓰지 않는다.
function normalizeTitleKeyForDedupe(title) {
  var stripped = stripSeasonSuffix(title);
  return stripped.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

var ANILIST_GRAPHQL_HOSTNAME = "graphql.anilist.co";
var ANILIST_GRAPHQL_TIMEOUT_MS = 10000;
var ANILIST_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
var ANILIST_CACHE_TTL_SECONDS = 24 * 60 * 60;
var ANILIST_PER_PAGE = 50;

// AniList MediaFormat 중 실제 "애니메이션 시청 후보"로 볼 수 있는 형식만 허용한다.
// MUSIC(뮤직비디오)·SPECIAL은 제외하고, format이 없는(null) 항목도 안전하게 제외한다.
var ANILIST_ALLOWED_FORMATS = { TV: true, TV_SHORT: true, MOVIE: true, OVA: true, ONA: true };

var AUTO_TOP5_CANDIDATE_LIMIT = 30; // 이번 버전에서 고정. 쿼리로 늘릴 수 없다.
var AUTO_TOP5_WEEKS_OPTIONS = [4, 8, 12, 16, 26];
var AUTO_TOP5_WEEKS_DEFAULT = 12;
var AUTO_TOP5_MIN_CANDIDATES_REQUIRED = 5;
var AUTO_TOP5_ANCHOR_PROBE_COUNT = 5;
var AUTO_TOP5_BATCH_CANDIDATE_SIZE = 4; // + anchor 1개 = 네이버 요청당 최대 5개 그룹
var AUTO_TOP5_KEYWORD_MAX_LENGTH = 50;
var AUTO_TOP5_MAX_KEYWORDS_PER_CANDIDATE = 20;
var AUTO_TOP5_MIN_MERGE_KEY_LENGTH = 4;
var AUTO_TOP5_BOUNDARY_CLOSE_RATIO = 0.05; // 5위·6위 보정지수 차이가 5% 이내면 boundaryClose

var AUTO_TOP5_RESULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
var AUTO_TOP5_RESULT_CACHE_TTL_SECONDS = 6 * 60 * 60;
var AUTO_TOP5_RESULT_CACHE_MAX_ENTRIES = 20;

var AUTO_TOP5_NAVER_MAX_RETRY = 1;
var AUTO_TOP5_NAVER_RETRY_DELAY_MS = 800;

// v3.9.1 1.1: AniList 트렌딩만으로는 한국어 제목/별칭이 확보되지 않는 후보가
// 많아서(실측 30개 전부 hasHangulKeyword=false), 후보가 부족하면 다음 페이지까지
// 순차 조회해서 "한국어 검색어가 확보된 후보"를 최대 30개 채운다.
var AUTO_TOP5_MAX_ANILIST_PAGES = 3;
var AUTO_TOP5_MAX_RAW_CANDIDATES = 150; // 3페이지 * 50개

// 기준 작품은 한국어 검색어 보유 + 최신 ratio 유효(양수) + 최근 4주 중 유효한
// 주가 최소 이 값 이상이어야 한다(결측이 지나치게 많은 작품을 기준으로 쓰지 않기 위함).
var AUTO_TOP5_ANCHOR_MIN_VALID_WEEKS = 2;

// 결과 캐시 키에 포함되는 버전. 이 값을 올리면 이전 버전(예: 한국어 보강 이전의
// 영문-only 결과) 캐시 엔트리는 다른 키가 되어 재사용되지 않는다.
var AUTO_TOP5_RESULT_CACHE_VERSION = 2;

// AniList 후보 캐시(24시간, 이번 버전부터 한국어 제목 보강까지 끝난 최종 후보
// 30개를 저장), 자동 TOP5 결과 캐시(6시간), Wikidata 한국어 제목 캐시(7일)는
// 모두 이 서버 메모리에만 저장된다. 파일/DB에는 저장하지 않으며, 서버를
// 재시작하면 그대로 사라진다. 실패 응답이나 batch 일부 실패 결과는 절대 캐시하지 않는다.
var anilistCandidateCache = null; // { expiresAt, snapshotId, payload }
var anilistCandidateSnapshotCounter = 0;
var autoTop5ResultCache = new Map();
var autoTop5InFlightByWeeks = new Map(); // 같은 weeks로 동시에 들어온 요청은 in-flight Promise를 공유한다

// ===== Wikidata 한국어 제목 보강 =====
var WIKIDATA_HOSTNAME = "query.wikidata.org";
var WIKIDATA_PATH = "/sparql";
var WIKIDATA_TIMEOUT_MS = 10000;
var WIKIDATA_USER_AGENT = "trend-top10-KOO-dashboard/1.0 (personal non-commercial reference project)";
var WIKIDATA_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
var WIKIDATA_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
var WIKIDATA_CACHE_MAX_ENTRIES = 1000;
var WIKIDATA_MAX_RETRY = 1;
var WIKIDATA_RETRY_DELAY_MS = 800;
var WIKIDATA_BATCH_SIZE = 50; // SPARQL VALUES 절 하나에 넣을 최대 ID 개수

// 작품 ID(anilistId 또는 malId) 단위 Wikidata 조회 캐시. key 예: "anilist:21",
// "mal:34572". value.result는 { wikidataItemId, label, aliases } 또는(확인된
// "매칭 없음") null이다. 조회 자체가 실패(네트워크/5xx/timeout)했을 때는 절대
// 캐시하지 않는다 — "매칭 없음"과 "조회 실패"는 다르게 취급한다.
var wikidataItemCache = new Map();

// AniList GraphQL(POST https://graphql.anilist.co)을 호출하는 저수준 함수.
// callNaverDatalab과 같은 구조(콜백 스타일, Client Secret 등 비밀값 없음)로
// 작성했다. 인증 토큰/API 키는 전혀 사용하지 않는다.
function callAniListGraphQL(query, variables, callback) {
  var bodyText = JSON.stringify({ query: query, variables: variables });

  var options = {
    hostname: ANILIST_GRAPHQL_HOSTNAME,
    path: "/",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Content-Length": Buffer.byteLength(bodyText)
    }
  };

  var apiReq = https.request(options, function (apiRes) {
    var chunks = [];

    apiRes.on("data", function (chunk) {
      chunks.push(chunk);
    });

    apiRes.on("end", function () {
      var rawText = Buffer.concat(chunks).toString("utf8");
      var parsed;

      try {
        parsed = JSON.parse(rawText);
      } catch (parseError) {
        callback({ status: 502, message: "AniList 응답을 해석할 수 없습니다(JSON 형식이 아님)." });
        return;
      }

      // AniList rate-limit 관련 응답 헤더(X-RateLimit-Limit/Remaining, Retry-After)는
      // 내부 진단용으로만 읽고, 클라이언트 응답이나 로그에 그대로 노출하지 않는다.
      var meta = {
        rateLimitLimit: apiRes.headers["x-ratelimit-limit"] || null,
        rateLimitRemaining: apiRes.headers["x-ratelimit-remaining"] || null,
        retryAfter: apiRes.headers["retry-after"] || null
      };

      if (apiRes.statusCode === 429) {
        callback({ status: 429, message: "AniList API 호출 한도를 초과했습니다.", retryAfter: meta.retryAfter }, null, meta);
        return;
      }

      if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
        if (parsed && Array.isArray(parsed.errors) && parsed.errors.length > 0) {
          callback({ status: 502, message: "AniList GraphQL 오류가 발생했습니다.", graphqlErrors: true }, null, meta);
          return;
        }
        callback(null, parsed, meta);
        return;
      }

      callback({ status: apiRes.statusCode, message: "AniList API가 오류를 반환했습니다." }, null, meta);
    });
  });

  apiReq.on("error", function (err) {
    callback({ status: 500, message: "AniList 서버에 연결하는 중 오류가 발생했습니다.", detail: err.message });
  });

  apiReq.write(bodyText);
  apiReq.end();
}

// callNaverDatalabWithTimeout과 같은 방식(10초 전후 타임아웃, 이미 응답을
// 보냈으면 늦게 도착한 응답은 무시)으로 AniList 호출에 타임아웃을 추가한다.
function callAniListGraphQLWithTimeout(query, variables, timeoutMs, callback) {
  var isDone = false;
  var timer = setTimeout(function () {
    if (isDone) {
      return;
    }
    isDone = true;
    callback({ status: 504, message: "AniList 응답 시간이 초과되었습니다." });
  }, timeoutMs);

  callAniListGraphQL(query, variables, function (err, data, meta) {
    if (isDone) {
      return;
    }
    isDone = true;
    clearTimeout(timer);
    callback(err, data, meta);
  });
}

var ANILIST_TRENDING_QUERY =
  "query ($page: Int, $perPage: Int) { Page(page: $page, perPage: $perPage) { media(type: ANIME, isAdult: false, sort: [TRENDING_DESC, POPULARITY_DESC]) { id idMal title { romaji english native userPreferred } synonyms format status season seasonYear countryOfOrigin trending popularity siteUrl isAdult relations { edges { relationType node { id type } } } } } }";

// AniList 오류를 사용자용 메시지/상태코드로 바꾼다. 원본 오류 전문(GraphQL
// errors 배열 등)이나 내부 stack은 포함하지 않는다.
function mapAniListError(err) {
  var status = err && err.status;

  if (status === 429) {
    return {
      status: 503,
      message: "애니메이션 후보 제공 서비스의 호출 한도에 도달했습니다. 잠시 후 다시 시도해 주세요."
    };
  }

  if (err && err.graphqlErrors) {
    return {
      status: 502,
      message: "애니메이션 후보 데이터를 해석하지 못했습니다."
    };
  }

  if (status === 504 || (typeof status === "number" && status >= 500)) {
    return {
      status: 502,
      message: "애니메이션 후보 제공 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
    };
  }

  return {
    status: 502,
    message: "애니메이션 후보 데이터를 가져오지 못했습니다."
  };
}

// AniList 원본 media 하나를 내부 정규화 구조로 바꾼다. 형식이 맞지 않거나(성인용,
// 허용되지 않는 format), 쓸 수 있는 제목/검색어가 하나도 없으면 null을 돌려주고
// 후보에서 제외한다. _relations는 클러스터링 단계에서만 쓰고 최종 출력에는 포함하지 않는다.
function normalizeAniListMedia(raw, index) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  if (raw.isAdult === true) {
    return null;
  }
  if (typeof raw.id !== "number" || !isFinite(raw.id)) {
    return null;
  }
  if (!raw.format || !ANILIST_ALLOWED_FORMATS[raw.format]) {
    return null;
  }

  function clean(text) {
    if (typeof text !== "string") {
      return "";
    }
    return stripControlChars(text).trim();
  }

  var titleObj = raw.title || {};
  var cleanedTitles = {
    romaji: clean(titleObj.romaji),
    english: clean(titleObj.english),
    native: clean(titleObj.native),
    userPreferred: clean(titleObj.userPreferred)
  };
  var cleanedSynonyms = (Array.isArray(raw.synonyms) ? raw.synonyms : [])
    .map(clean)
    .filter(function (text) { return text.length > 0; });

  // display 제목 우선순위: 1) 한글이 포함된 title/synonym 2) english 3) userPreferred
  // 4) romaji 5) native. 한글 제목이 없다고 임의로 번역하지 않는다.
  var hangulCandidates = [cleanedTitles.userPreferred, cleanedTitles.english, cleanedTitles.romaji, cleanedTitles.native]
    .concat(cleanedSynonyms)
    .filter(function (text) { return text && containsHangul(text); });

  var display = hangulCandidates.length > 0
    ? hangulCandidates[0]
    : (cleanedTitles.english || cleanedTitles.userPreferred || cleanedTitles.romaji || cleanedTitles.native || "");

  if (!display) {
    return null; // 표시할 제목이 전혀 없음
  }

  // searchKeywords: display -> english -> userPreferred -> romaji -> native -> synonyms
  // 순서로 모아 중복 제거(대소문자/유니코드 정규화 기준), 빈 값 제외, 50자 초과 제외, 최대 20개.
  var candidateOrder = [display, cleanedTitles.english, cleanedTitles.userPreferred, cleanedTitles.romaji, cleanedTitles.native]
    .concat(cleanedSynonyms);

  var searchKeywords = [];
  var seenKeys = {};
  candidateOrder.forEach(function (text) {
    if (!text || text.length > AUTO_TOP5_KEYWORD_MAX_LENGTH) {
      return;
    }
    var key = text.normalize("NFKC").toLowerCase();
    if (seenKeys[key]) {
      return;
    }
    seenKeys[key] = true;
    searchKeywords.push(text);
  });
  searchKeywords = searchKeywords.slice(0, AUTO_TOP5_MAX_KEYWORDS_PER_CANDIDATE);

  if (searchKeywords.length === 0) {
    return null; // 작품명이 하나도 남지 않음 -> 후보에서 제외
  }

  var hasHangulKeyword = searchKeywords.some(containsHangul);

  return {
    anilistId: raw.id,
    malId: (typeof raw.idMal === "number" && isFinite(raw.idMal)) ? raw.idMal : null,
    titles: {
      display: display,
      romaji: cleanedTitles.romaji || null,
      english: cleanedTitles.english || null,
      native: cleanedTitles.native || null,
      userPreferred: cleanedTitles.userPreferred || null
    },
    synonyms: cleanedSynonyms,
    format: raw.format,
    status: raw.status || null,
    season: raw.season || null,
    seasonYear: (typeof raw.seasonYear === "number" && isFinite(raw.seasonYear)) ? raw.seasonYear : null,
    countryOfOrigin: raw.countryOfOrigin || null,
    trending: (typeof raw.trending === "number" && isFinite(raw.trending)) ? raw.trending : 0,
    popularity: (typeof raw.popularity === "number" && isFinite(raw.popularity)) ? raw.popularity : 0,
    siteUrl: raw.siteUrl || null,
    hasHangulKeyword: hasHangulKeyword,
    keywordCoverageStatus: hasHangulKeyword ? "korean_included" : "non_korean_only",
    searchKeywords: searchKeywords,
    originalOrder: index,
    _relations: (raw.relations && Array.isArray(raw.relations.edges)) ? raw.relations.edges : []
  };
}

// PREQUEL/SEQUEL 관계를 union-find로 클러스터링하고, 관계 정보만으로 합쳐지지
// 않는 경우에 한해 "시즌 접미사를 지운 제목이 정확히 같을 때"만 보수적으로
// 추가 병합한다. 불확실한 경우(짧은 키, 관계도 없고 제목도 다름)는 합치지 않는다.
function clusterAniListCandidates(normalizedList) {
  var n = normalizedList.length;
  var parent = normalizedList.map(function (_, i) { return i; });

  function find(x) {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }

  function union(a, b) {
    var ra = find(a);
    var rb = find(b);
    if (ra !== rb) {
      parent[ra] = rb;
    }
  }

  var idToIndex = {};
  normalizedList.forEach(function (c, i) {
    idToIndex[c.anilistId] = i;
  });

  var mergeExamples = [];

  normalizedList.forEach(function (c, i) {
    (c._relations || []).forEach(function (edge) {
      var isSequelRelation = edge && (edge.relationType === "PREQUEL" || edge.relationType === "SEQUEL");
      var pointsToAnime = edge && edge.node && edge.node.type === "ANIME";
      if (isSequelRelation && pointsToAnime && Object.prototype.hasOwnProperty.call(idToIndex, edge.node.id)) {
        var j = idToIndex[edge.node.id];
        if (find(i) !== find(j) && mergeExamples.length < 8) {
          mergeExamples.push(
            normalizedList[i].titles.display + " ↔ " + normalizedList[j].titles.display +
            " (" + edge.relationType + " 관계로 병합)"
          );
        }
        union(i, j);
      }
    });
  });

  // 보조 병합: 시즌 접미사를 지운 제목 키가 정확히 같은 서로 다른 클러스터만 합친다.
  var rootIndexByKey = {};
  for (var i = 0; i < n; i++) {
    var key = normalizeTitleKeyForDedupe(normalizedList[i].titles.display);
    if (key.length < AUTO_TOP5_MIN_MERGE_KEY_LENGTH) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(rootIndexByKey, key)) {
      var otherIndex = rootIndexByKey[key];
      if (find(i) !== find(otherIndex)) {
        if (mergeExamples.length < 8) {
          mergeExamples.push(
            normalizedList[i].titles.display + " ↔ " + normalizedList[otherIndex].titles.display +
            " (시즌 표기 제거 후 제목 일치로 병합)"
          );
        }
        union(i, otherIndex);
      }
    } else {
      rootIndexByKey[key] = i;
    }
  }

  var groups = {};
  for (var k = 0; k < n; k++) {
    var root = find(k);
    if (!groups[root]) {
      groups[root] = [];
    }
    groups[root].push(normalizedList[k]);
  }

  var pooled = Object.keys(groups).map(function (rootKey) {
    var members = groups[rootKey];
    members.sort(function (a, b) {
      if (b.trending !== a.trending) {
        return b.trending - a.trending;
      }
      if (b.popularity !== a.popularity) {
        return b.popularity - a.popularity;
      }
      return a.originalOrder - b.originalOrder;
    });

    var representative = members[0];

    var mergedKeywords = [];
    var seenKeywordKeys = {};
    members.forEach(function (member) {
      member.searchKeywords.forEach(function (keyword) {
        var normKey = keyword.normalize("NFKC").toLowerCase();
        if (seenKeywordKeys[normKey]) {
          return;
        }
        seenKeywordKeys[normKey] = true;
        mergedKeywords.push(keyword);
      });
    });
    mergedKeywords = mergedKeywords.slice(0, AUTO_TOP5_MAX_KEYWORDS_PER_CANDIDATE);

    var mergedHasHangul = mergedKeywords.some(containsHangul);

    return {
      anilistId: representative.anilistId,
      malId: representative.malId,
      titles: representative.titles,
      synonyms: representative.synonyms,
      format: representative.format,
      status: representative.status,
      season: representative.season,
      seasonYear: representative.seasonYear,
      countryOfOrigin: representative.countryOfOrigin,
      trending: representative.trending,
      popularity: representative.popularity,
      siteUrl: representative.siteUrl,
      hasHangulKeyword: mergedHasHangul,
      keywordCoverageStatus: mergedHasHangul ? "korean_included" : "non_korean_only",
      searchKeywords: mergedKeywords,
      originalOrder: representative.originalOrder,
      clusterSize: members.length
    };
  });

  return { pooled: pooled, mergeExamples: mergeExamples };
}

// AniList Page.media 원본 배열(여러 페이지를 합친 누적 배열일 수 있음)로부터
// 정규화 -> 클러스터링(중복 정리)까지만 수행한다. 한국어 필터링과 최종 30개
// 선택/discoveryRank 부여는 한국어 보강이 끝난 뒤(getAniListCandidatePoolCb)에서
// 한다 — AniList trending 순서와 한국 네이버 순위를 섞지 않기 위한 구조다.
function clusterAndNormalizeRawMedia(rawMediaList) {
  var normalized = [];

  rawMediaList.forEach(function (raw, index) {
    var candidate = normalizeAniListMedia(raw, index);
    if (candidate) {
      normalized.push(candidate);
    }
  });

  var validCountBeforeDedupe = normalized.length;
  var clusterResult = clusterAniListCandidates(normalized);

  return {
    pooled: clusterResult.pooled,
    stats: {
      validCountBeforeDedupe: validCountBeforeDedupe,
      countAfterDedupe: clusterResult.pooled.length,
      mergeExamples: clusterResult.mergeExamples
    }
  };
}

// ===== Wikidata 한국어 제목 보강 =====

function isValidWikidataNumericId(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value < 1e15;
}

// SPARQL 문자열에 ID를 직접 이어 붙이기 전에 반드시 숫자로만 검증한다(문자열
// 이스케이프가 아니라 "숫자가 아니면 아예 버림" 방식으로 injection을 막는다).
function buildWikidataQueryByProperty(propertyId, ids) {
  var safeIds = ids.filter(isValidWikidataNumericId);
  var valuesClause = safeIds.map(function (id) { return "\"" + String(id) + "\""; }).join(" ");
  return "SELECT ?item ?srcId (SAMPLE(?label) AS ?label) (GROUP_CONCAT(DISTINCT ?alias; separator=\"|\") AS ?aliases) WHERE { " +
    "VALUES ?srcId { " + valuesClause + " } " +
    "?item wdt:" + propertyId + " ?srcId . " +
    "OPTIONAL { ?item rdfs:label ?label . FILTER(LANG(?label)=\"ko\") } " +
    "OPTIONAL { ?item skos:altLabel ?alias . FILTER(LANG(?alias)=\"ko\") } " +
    "} GROUP BY ?item ?srcId";
}

// Wikidata Query Service(SPARQL)를 호출하는 저수준 함수. 인증 토큰/API 키는
// 쓰지 않으며, Wikidata 정책에 맞춰 명확한 User-Agent를 보낸다.
function callWikidataSparql(query, callback) {
  var bodyText = "query=" + encodeURIComponent(query);

  var options = {
    hostname: WIKIDATA_HOSTNAME,
    path: WIKIDATA_PATH,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/sparql-results+json",
      "User-Agent": WIKIDATA_USER_AGENT,
      "Content-Length": Buffer.byteLength(bodyText)
    }
  };

  var apiReq = https.request(options, function (apiRes) {
    var chunks = [];

    apiRes.on("data", function (chunk) {
      chunks.push(chunk);
    });

    apiRes.on("end", function () {
      var rawText = Buffer.concat(chunks).toString("utf8");

      if (apiRes.statusCode === 429) {
        callback({ status: 429, message: "Wikidata API 호출 한도를 초과했습니다." });
        return;
      }

      if (apiRes.statusCode < 200 || apiRes.statusCode >= 300) {
        callback({ status: apiRes.statusCode, message: "Wikidata API가 오류를 반환했습니다." });
        return;
      }

      var parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseError) {
        callback({ status: 502, message: "Wikidata 응답을 해석할 수 없습니다(JSON 형식이 아님)." });
        return;
      }

      callback(null, parsed);
    });
  });

  apiReq.on("error", function (err) {
    callback({ status: 500, message: "Wikidata 서버에 연결하는 중 오류가 발생했습니다.", detail: err.message });
  });

  apiReq.write(bodyText);
  apiReq.end();
}

function callWikidataSparqlWithTimeout(query, timeoutMs, callback) {
  var isDone = false;
  var timer = setTimeout(function () {
    if (isDone) {
      return;
    }
    isDone = true;
    callback({ status: 504, message: "Wikidata 응답 시간이 초과되었습니다." });
  }, timeoutMs);

  callWikidataSparql(query, function (err, data) {
    if (isDone) {
      return;
    }
    isDone = true;
    clearTimeout(timer);
    callback(err, data);
  });
}

function isRetryableWikidataError(err) {
  var status = err && err.status;
  return typeof status === "number" && status >= 500 && status < 600;
}

// 네트워크 오류/5xx만 최대 1회 재시도한다(429는 재시도하지 않음 — 네이버 정책과 동일).
function callWikidataSparqlWithRetry(query, callback) {
  function attempt(retryCount) {
    callWikidataSparqlWithTimeout(query, WIKIDATA_TIMEOUT_MS, function (err, data) {
      if (err) {
        if (retryCount < WIKIDATA_MAX_RETRY && isRetryableWikidataError(err)) {
          setTimeout(function () { attempt(retryCount + 1); }, WIKIDATA_RETRY_DELAY_MS);
          return;
        }
        callback(err);
        return;
      }
      callback(null, data);
    });
  }
  attempt(0);
}

function wikidataSparqlPromise(query) {
  return new Promise(function (resolve, reject) {
    callWikidataSparqlWithRetry(query, function (err, data) {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}

function mapWikidataError(err) {
  var status = err && err.status;

  if (status === 429) {
    return {
      status: 503,
      message: "애니메이션 후보 제공 서비스의 호출 한도에 도달했습니다. 잠시 후 다시 시도해 주세요."
    };
  }

  if (status === 504 || (typeof status === "number" && status >= 500)) {
    return {
      status: 502,
      message: "한국어 작품명 보강 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
    };
  }

  return {
    status: 502,
    message: "한국어 작품명 데이터를 가져오지 못했습니다."
  };
}

function mapAutoTop5WikidataError(err, stage) {
  var mapped = mapWikidataError(err);
  return makeStageError(mapped.status, stage, mapped.message);
}

// SPARQL 결과(results.bindings)를 { srcId(string): { wikidataItemId, label, aliases } }
// 맵으로 바꾼다. label/aliases는 한글이 실제로 포함돼 있는지 다시 한 번 검증해서
// (영어/일본어 label을 한국어로 잘못 취급하지 않도록) 통과한 값만 담는다.
function parseWikidataResultBindings(sparqlResult) {
  var map = {};
  if (!sparqlResult || !sparqlResult.results || !Array.isArray(sparqlResult.results.bindings)) {
    return map;
  }

  sparqlResult.results.bindings.forEach(function (binding) {
    var srcIdBinding = binding.srcId;
    if (!srcIdBinding || typeof srcIdBinding.value !== "string") {
      return;
    }
    var srcId = srcIdBinding.value;

    var itemUri = binding.item && binding.item.value;
    var wikidataItemId = null;
    if (typeof itemUri === "string") {
      var match = /Q\d+$/.exec(itemUri);
      if (match) {
        wikidataItemId = match[0];
      }
    }

    var rawLabel = (binding.label && typeof binding.label.value === "string")
      ? stripControlChars(binding.label.value).trim()
      : "";
    var rawAliasesText = (binding.aliases && typeof binding.aliases.value === "string") ? binding.aliases.value : "";
    var rawAliases = rawAliasesText.split("|")
      .map(function (a) { return stripControlChars(a).trim(); })
      .filter(function (a) { return a.length > 0; });

    var validLabel = (rawLabel && containsHangul(rawLabel)) ? rawLabel : "";
    var validAliases = rawAliases.filter(containsHangul);

    if (!validLabel && validAliases.length === 0) {
      return; // 이 항목은 매칭됐지만 검증된 한국어 값이 없음 -> 결과 없음과 동일하게 취급
    }

    map[srcId] = {
      wikidataItemId: wikidataItemId,
      label: validLabel || null,
      aliases: validAliases
    };
  });

  return map;
}

function getWikidataCacheEntry(key) {
  var entry = wikidataItemCache.get(key);
  if (!entry) {
    return undefined; // 캐시에 없음(조회 필요)
  }
  if (Date.now() > entry.expiresAt) {
    wikidataItemCache.delete(key);
    return undefined;
  }
  return entry.result; // 조회된 결과(객체) 또는 확인된 "매칭 없음"(null)
}

function setWikidataCacheEntry(key, result) {
  if (wikidataItemCache.has(key)) {
    wikidataItemCache.delete(key);
  }
  wikidataItemCache.set(key, { expiresAt: Date.now() + WIKIDATA_CACHE_TTL_MS, result: result });
  while (wikidataItemCache.size > WIKIDATA_CACHE_MAX_ENTRIES) {
    var oldestKey = wikidataItemCache.keys().next().value;
    wikidataItemCache.delete(oldestKey);
  }
}

// propertyId(P8729 또는 P4086) 기준으로 ids 목록의 한국어 정보를 찾는다. 캐시에
// 있는 것은 재사용하고, 없는 것만 WIKIDATA_BATCH_SIZE개씩 순차 조회한다(batch를
// Promise.all로 한꺼번에 쏘지 않음). 실패하면 stage가 붙은 오류를 던진다.
function resolveWikidataKoreanByIds(propertyId, cachePrefix, ids, externalCalls, stage) {
  var uniqueIds = [];
  var seen = {};
  ids.forEach(function (id) {
    if (!isValidWikidataNumericId(id) || seen[id]) {
      return;
    }
    seen[id] = true;
    uniqueIds.push(id);
  });

  var resultById = {};
  var pending = [];
  uniqueIds.forEach(function (id) {
    var cached = getWikidataCacheEntry(cachePrefix + id);
    if (cached !== undefined) {
      resultById[id] = cached;
    } else {
      pending.push(id);
    }
  });

  if (pending.length === 0) {
    return Promise.resolve(resultById);
  }

  var chunks = chunkArray(pending, WIKIDATA_BATCH_SIZE);

  return runPromisesSequentially(chunks, function (chunkIds) {
    var query = buildWikidataQueryByProperty(propertyId, chunkIds);
    return wikidataSparqlPromise(query)
      .catch(function (err) { throw mapAutoTop5WikidataError(err, stage); })
      .then(function (sparqlResult) {
        externalCalls.wikidataCalls += 1;
        var freshMap = parseWikidataResultBindings(sparqlResult);
        chunkIds.forEach(function (id) {
          var result = Object.prototype.hasOwnProperty.call(freshMap, String(id)) ? freshMap[String(id)] : null;
          setWikidataCacheEntry(cachePrefix + id, result);
          resultById[id] = result;
        });
        return null;
      });
  }).then(function () {
    return resultById;
  });
}

// 지나치게 짧은 단어·숫자만·URL/코드처럼 보이는 값·일반 영어 단어 등 "모호한"
// 비한글 검색어를 판별한다. 특정 작품명을 하드코딩한 차단 목록이 아니라 일반적인
// 패턴 규칙이다 — 이 판정 때문에 작품 자체를 후보에서 빼지는 않는다.
var WIKIDATA_GENERIC_ENGLISH_WORDS = {
  the: true, of: true, and: true, in: true, on: true, to: true, a: true, an: true,
  world: true, story: true, life: true, love: true, game: true, season: true, part: true,
  new: true, old: true, day: true, night: true, boy: true, girl: true, man: true
};

function isAmbiguousNonKoreanKeyword(text) {
  var trimmed = String(text).trim();
  if (trimmed.length <= 2) {
    return true; // 한두 글자
  }
  if (/^\d+$/.test(trimmed)) {
    return true; // 숫자만
  }
  if (/^(https?:\/\/|www\.)/i.test(trimmed)) {
    return true; // URL처럼 보임
  }
  if (/^[A-Za-z]{1,4}\d+$/.test(trimmed) || /^\d+[A-Za-z]{1,4}$/.test(trimmed)) {
    return true; // 코드처럼 보이는 값(문자+숫자 짧은 조합)
  }
  var lower = trimmed.toLowerCase();
  if (WIKIDATA_GENERIC_ENGLISH_WORDS[lower]) {
    return true; // 일반 영어 단어 단독
  }
  if (/^[A-Za-z]+$/.test(trimmed) && trimmed.length <= 4 && trimmed.indexOf(" ") === -1) {
    return true; // 짧은 단일 영단어(약어일 가능성)
  }
  return false;
}

// Wikidata/AniList에서 확보한 한국어 정보를 후보 하나에 반영해서 searchKeywords를
// 다시 만든다. 순서: Wikidata ko label -> Wikidata ko aliases -> AniList에서
// 이미 발견된 한글 제목/별칭 -> "한국어 대표 제목 + 애니"(대표 제목이 있을 때만) ->
// english -> userPreferred -> romaji -> native -> AniList synonyms.
// 한국어 label/alias 값 자체는 절대 고치지 않는다(임의 번역 없음).
function applyKoreanEnrichmentToCandidate(candidate, wikidataResult, matchedBy) {
  var wikidataLabel = wikidataResult && wikidataResult.label ? wikidataResult.label : null;
  var wikidataAliases = (wikidataResult && Array.isArray(wikidataResult.aliases)) ? wikidataResult.aliases : [];
  var wikidataItemId = (wikidataResult && wikidataResult.wikidataItemId) ? wikidataResult.wikidataItemId : null;

  var anilistHangulTexts = [candidate.titles.display, candidate.titles.english, candidate.titles.userPreferred, candidate.titles.romaji, candidate.titles.native]
    .concat(candidate.synonyms)
    .filter(function (text) { return text && containsHangul(text); });

  var koreanTitles;
  if (wikidataLabel || wikidataAliases.length > 0) {
    koreanTitles = {
      label: wikidataLabel || null,
      aliases: wikidataAliases,
      source: "wikidata",
      wikidataItemId: wikidataItemId,
      matchedBy: matchedBy
    };
  } else if (anilistHangulTexts.length > 0) {
    koreanTitles = {
      label: anilistHangulTexts[0],
      aliases: anilistHangulTexts.slice(1),
      source: "anilist",
      wikidataItemId: null,
      matchedBy: null
    };
  } else {
    koreanTitles = { label: null, aliases: [], source: null, wikidataItemId: null, matchedBy: null };
  }

  var koreanAniTitle = koreanTitles.label ? (koreanTitles.label + " 애니") : null;

  var orderedCandidates = [];
  if (koreanTitles.label) {
    orderedCandidates.push(koreanTitles.label);
  }
  koreanTitles.aliases.forEach(function (a) { orderedCandidates.push(a); });
  if (koreanTitles.source === "wikidata") {
    // Wikidata에서 확인됐어도, AniList가 별도로 찾아둔 한글 제목/별칭이 있으면
    // 검색어 폭을 넓히기 위해 함께 포함한다(중복은 뒤에서 자동 제거됨).
    anilistHangulTexts.forEach(function (t) { orderedCandidates.push(t); });
  }
  if (koreanAniTitle) {
    orderedCandidates.push(koreanAniTitle);
  }
  orderedCandidates.push(candidate.titles.english);
  orderedCandidates.push(candidate.titles.userPreferred);
  orderedCandidates.push(candidate.titles.romaji);
  orderedCandidates.push(candidate.titles.native);
  candidate.synonyms.forEach(function (s) { orderedCandidates.push(s); });

  var searchKeywords = [];
  var seenKeys = {};
  orderedCandidates.forEach(function (text) {
    if (!text || typeof text !== "string") {
      return;
    }
    var cleaned = stripControlChars(text).normalize("NFKC").trim();
    if (!cleaned || cleaned.length > AUTO_TOP5_KEYWORD_MAX_LENGTH) {
      return;
    }
    var key = cleaned.toLowerCase();
    if (seenKeys[key]) {
      return;
    }
    seenKeys[key] = true;
    searchKeywords.push(cleaned);
  });
  searchKeywords = searchKeywords.slice(0, AUTO_TOP5_MAX_KEYWORDS_PER_CANDIDATE);

  var keywordCoverageStatus;
  if (searchKeywords.length === 0) {
    keywordCoverageStatus = "insufficient";
  } else if (koreanTitles.source === "wikidata") {
    keywordCoverageStatus = "korean_verified";
  } else if (koreanTitles.source === "anilist") {
    keywordCoverageStatus = "korean_unverified";
  } else {
    keywordCoverageStatus = "non_korean_only";
  }

  var ambiguousNonKoreanKeywords = searchKeywords.filter(function (kw) {
    return !containsHangul(kw) && isAmbiguousNonKoreanKeyword(kw);
  });

  // 한국어 검색어가 이미 확보된 경우, 모호한 비한글 검색어는 네이버 요청용
  // 목록에서 제외한다(삭제가 아니라 ambiguousNonKoreanKeywords에 별도 기록하고,
  // 실제 네이버 호출에는 넣지 않는 방식). 걸러내면 0개가 되는 경우는 안전하게
  // 원래 목록을 그대로 쓴다.
  var filteredForNaver = searchKeywords.filter(function (kw) {
    return ambiguousNonKoreanKeywords.indexOf(kw) === -1;
  });
  var naverSearchKeywords = filteredForNaver.length > 0 ? filteredForNaver : searchKeywords;

  var out = {};
  for (var key2 in candidate) {
    if (Object.prototype.hasOwnProperty.call(candidate, key2)) {
      out[key2] = candidate[key2];
    }
  }
  delete out._relations;
  out.searchKeywords = searchKeywords;
  out.naverSearchKeywords = naverSearchKeywords;
  out.hasHangulKeyword = searchKeywords.some(containsHangul);
  out.keywordCoverageStatus = keywordCoverageStatus;
  out.koreanTitles = koreanTitles;
  out.ambiguousNonKoreanKeywords = ambiguousNonKoreanKeywords;
  out.titleSource = koreanTitles.source || "non_korean";
  return out;
}

// 후보 목록 전체에 Wikidata 한국어 제목 보강을 적용한다. 1단계로 AniList ID(P8729)
// 기준으로 조회하고, 매칭되지 않은 후보 중 malId가 있는 것만 MyAnimeList ID(P4086)로
// 다시 시도한다(둘 다 실패하면 AniList 자체에서 찾은 한글 제목/별칭으로 대체하거나,
// 그마저 없으면 non_korean_only/insufficient로 남는다).
function enrichCandidatesWithKoreanTitles(candidates, externalCalls) {
  var anilistIds = candidates.map(function (c) { return c.anilistId; });

  return resolveWikidataKoreanByIds("P8729", "anilist:", anilistIds, externalCalls, "korean_title_enrichment")
    .then(function (byAnilistId) {
      var needsMalFallback = candidates.filter(function (c) {
        return !byAnilistId[c.anilistId] && typeof c.malId === "number";
      });
      var malIds = needsMalFallback.map(function (c) { return c.malId; });

      return resolveWikidataKoreanByIds("P4086", "mal:", malIds, externalCalls, "korean_title_enrichment")
        .then(function (byMalId) {
          return candidates.map(function (c) {
            var wikidataResult = byAnilistId[c.anilistId] || null;
            var matchedBy = wikidataResult ? "anilist_id" : null;
            if (!wikidataResult && typeof c.malId === "number" && byMalId[c.malId]) {
              wikidataResult = byMalId[c.malId];
              matchedBy = "mal_id";
            }
            return applyKoreanEnrichmentToCandidate(c, wikidataResult, matchedBy);
          });
        });
    });
}

// AniList 트렌딩을 필요한 만큼(최대 3페이지, 원본 최대 150개) 순차 조회하면서,
// 매 페이지 후 정규화·클러스터링·Wikidata 한국어 보강까지 다시 계산해서 "한국어
// 검색어가 확보된 후보"가 30개 이상 모이면 더 이상 조회하지 않는다.
function fetchKoreanQualifiedCandidatesUntilEnoughOrLimit(externalCalls) {
  var accumulatedRawMedia = [];
  var pagesFetched = 0;

  function fetchPage(page) {
    return new Promise(function (resolve, reject) {
      callAniListGraphQLWithTimeout(
        ANILIST_TRENDING_QUERY,
        { page: page, perPage: ANILIST_PER_PAGE },
        ANILIST_GRAPHQL_TIMEOUT_MS,
        function (err, data) {
          externalCalls.anilistCalls += 1;
          if (err) {
            reject(mapAutoTop5AniListError(err, "candidate_discovery"));
            return;
          }
          if (!data || !data.data || !data.data.Page || !Array.isArray(data.data.Page.media)) {
            reject(makeStageError(502, "candidate_discovery", "AniList 응답 형식이 올바르지 않습니다."));
            return;
          }
          resolve(data.data.Page.media);
        }
      );
    });
  }

  function step() {
    pagesFetched += 1;
    return fetchPage(pagesFetched).then(function (rawMediaPage) {
      accumulatedRawMedia = accumulatedRawMedia.concat(rawMediaPage);
      var clusterOutput = clusterAndNormalizeRawMedia(accumulatedRawMedia);

      return enrichCandidatesWithKoreanTitles(clusterOutput.pooled, externalCalls).then(function (enrichedPooled) {
        var koreanQualified = enrichedPooled.filter(function (c) {
          return c.keywordCoverageStatus === "korean_verified" || c.keywordCoverageStatus === "korean_unverified";
        });

        var enoughKorean = koreanQualified.length >= AUTO_TOP5_CANDIDATE_LIMIT;
        var reachedPageLimit = pagesFetched >= AUTO_TOP5_MAX_ANILIST_PAGES;
        var reachedRawCap = accumulatedRawMedia.length >= AUTO_TOP5_MAX_RAW_CANDIDATES;

        if (enoughKorean || reachedPageLimit || reachedRawCap) {
          return {
            enrichedPooled: enrichedPooled,
            koreanQualified: koreanQualified,
            stats: clusterOutput.stats,
            pagesFetched: pagesFetched,
            rawFetchedCount: accumulatedRawMedia.length
          };
        }

        return step();
      });
    });
  }

  return step();
}

// AniList(다중 페이지) + Wikidata 한국어 보강까지 끝난 최종 후보(최대 30개,
// discoveryRank 포함)를 만든다. 24시간 캐시를 확인하고, 없거나 만료됐으면 새로
// 계산한다. 실패 응답이나 한국어 후보가 5개 미만인 결과는 캐시에 저장하지 않는다.
function getAniListCandidatePoolCb(externalCalls, callback) {
  if (anilistCandidateCache && Date.now() < anilistCandidateCache.expiresAt) {
    callback(null, anilistCandidateCache.payload, true);
    return;
  }

  fetchKoreanQualifiedCandidatesUntilEnoughOrLimit(externalCalls).then(
    function (loopResult) {
      var koreanQualified = loopResult.koreanQualified.slice();
      koreanQualified.sort(function (a, b) {
        if (b.trending !== a.trending) {
          return b.trending - a.trending;
        }
        if (b.popularity !== a.popularity) {
          return b.popularity - a.popularity;
        }
        if (a.originalOrder !== b.originalOrder) {
          return a.originalOrder - b.originalOrder;
        }
        return a.anilistId - b.anilistId;
      });

      var finalCandidates = koreanQualified.slice(0, AUTO_TOP5_CANDIDATE_LIMIT).map(function (candidate, idx) {
        var out = {};
        for (var key in candidate) {
          if (Object.prototype.hasOwnProperty.call(candidate, key)) {
            out[key] = candidate[key];
          }
        }
        out.discoveryRank = idx + 1;
        return out;
      });

      if (finalCandidates.length < AUTO_TOP5_MIN_CANDIDATES_REQUIRED) {
        callback(
          makeStageError(502, "korean_title_enrichment", "한국어 작품명이 확인된 애니메이션 후보를 충분히 확보하지 못했습니다."),
          null,
          false
        );
        return;
      }

      var enrichedPooled = loopResult.enrichedPooled;
      var koreanVerifiedCount = enrichedPooled.filter(function (c) { return c.keywordCoverageStatus === "korean_verified"; }).length;
      var koreanUnverifiedCount = enrichedPooled.filter(function (c) { return c.keywordCoverageStatus === "korean_unverified"; }).length;
      var nonKoreanOnlyCount = enrichedPooled.filter(function (c) { return c.keywordCoverageStatus === "non_korean_only"; }).length;
      var insufficientCount = enrichedPooled.filter(function (c) { return c.keywordCoverageStatus === "insufficient"; }).length;

      var payload = {
        candidates: finalCandidates,
        stats: {
          anilistRawFetchedCount: loopResult.rawFetchedCount,
          anilistPagesFetched: loopResult.pagesFetched,
          validCountBeforeDedupe: loopResult.stats.validCountBeforeDedupe,
          countAfterDedupe: loopResult.stats.countAfterDedupe,
          koreanVerifiedCount: koreanVerifiedCount,
          koreanUnverifiedCount: koreanUnverifiedCount,
          nonKoreanOnlyCount: nonKoreanOnlyCount,
          insufficientCount: insufficientCount,
          excludedFromNaverRankingCount: nonKoreanOnlyCount + insufficientCount,
          finalKoreanCandidateCount: finalCandidates.length,
          partialCandidatePool: finalCandidates.length < AUTO_TOP5_CANDIDATE_LIMIT,
          mergeExamples: loopResult.stats.mergeExamples
        }
      };

      anilistCandidateSnapshotCounter += 1;
      anilistCandidateCache = {
        expiresAt: Date.now() + ANILIST_CACHE_TTL_MS,
        snapshotId: anilistCandidateSnapshotCounter,
        payload: payload
      };

      callback(null, payload, false);
    },
    function (err) {
      callback(err, null, false);
    }
  );
}

// getAniListCandidatePoolCb를 Promise로 감싼다(새 파이프라인 전용 — 기존
// callNaverDatalab류 함수는 그대로 콜백 스타일을 유지한다). AniList/Wikidata
// 실제 호출 횟수는 이미 내부(fetchKoreanQualifiedCandidatesUntilEnoughOrLimit,
// resolveWikidataKoreanByIds)에서 정확히 세고 있으므로 여기서는 추가로 세지 않는다.
function getAniListCandidatePoolPromise(externalCalls) {
  return new Promise(function (resolve, reject) {
    getAniListCandidatePoolCb(externalCalls, function (err, payload, cacheHit) {
      if (err) {
        reject(err);
        return;
      }
      resolve({
        candidates: payload.candidates,
        stats: payload.stats,
        snapshotId: anilistCandidateCache.snapshotId,
        anilistCacheHit: cacheHit
      });
    });
  });
}

// 네이버 데이터랩(검색어트렌드) 요청 본문을 만든다. groupName은 사용자에게
// 보이는 값이 아니라 응답을 다시 매칭하기 위한 내부 식별자("g0", "g1"...)라서,
// 작품명에 특수문자가 있거나 두 후보의 표시 제목이 우연히 같아도 안전하다.
function buildAutoTop5NaverGroupsRequestBody(candidates, range) {
  return {
    startDate: range.startDate,
    endDate: range.endDate,
    timeUnit: "week",
    keywordGroups: candidates.map(function (candidate, i) {
      // naverSearchKeywords가 있으면(한국어 보강 후보) 모호한 비한글 검색어를
      // 제외한 목록을 쓰고, 없으면(예: 옛 형태 후보) searchKeywords로 대체한다.
      var keywords = Array.isArray(candidate.naverSearchKeywords) ? candidate.naverSearchKeywords : candidate.searchKeywords;
      return { groupName: "g" + i, keywords: keywords };
    })
  };
}

// 네이버 응답(results)을 groupName("g0","g1"...) 기준으로 다시 정렬해서, 요청한
// candidates와 완전히 같은 순서의 weekly 배열 목록을 돌려준다. 결측 주는 0으로
// 채우지 않고 null로 남긴다(expectedPeriods 기준).
function computeGroupWeeklySeriesFromNaverResult(naverResult, expectedPeriods, groupCount) {
  var resultsByGroupName = {};
  if (naverResult && Array.isArray(naverResult.results)) {
    naverResult.results.forEach(function (result) {
      resultsByGroupName[result.title] = result;
    });
  }

  var out = [];
  for (var i = 0; i < groupCount; i++) {
    var result = resultsByGroupName["g" + i];
    var dataByPeriod = {};
    if (result && Array.isArray(result.data)) {
      result.data.forEach(function (point) {
        dataByPeriod[point.period] = point;
      });
    }
    var weekly = expectedPeriods.map(function (period) {
      var point = dataByPeriod[period];
      var ratio = (point && typeof point.ratio === "number" && isFinite(point.ratio))
        ? roundTo2(point.ratio)
        : null;
      return { period: period, ratio: ratio };
    });
    out.push({ weekly: weekly });
  }
  return out;
}

// { period, value } 시계열 하나에서 latest/previous/changePoint/최근4주평균을
// 계산한다(value는 원본 ratio일 수도, anchorNormalizedIndex일 수도 있다). null은
// 0으로 바꾸지 않는다.
function computeSeriesDerivedMetrics(series) {
  var latestPoint = series.length > 0 ? series[series.length - 1] : null;
  var previousPoint = series.length > 1 ? series[series.length - 2] : null;
  var latestValue = latestPoint ? latestPoint.value : null;
  var previousValue = previousPoint ? previousPoint.value : null;

  var changePoint = (isValidNumber(latestValue) && isValidNumber(previousValue))
    ? roundTo2(latestValue - previousValue)
    : null;

  var last4 = series.slice(Math.max(0, series.length - 4));
  var valid4 = last4.filter(function (point) { return isValidNumber(point.value); });
  var average4Weeks = valid4.length > 0
    ? roundTo2(valid4.reduce(function (sum, point) { return sum + point.value; }, 0) / valid4.length)
    : null;

  return {
    latestValue: latestValue,
    previousValue: previousValue,
    changePoint: changePoint,
    average4Weeks: average4Weeks,
    average4WeeksCount: valid4.length
  };
}

function computeStatusFromValues(latestValue, previousValue, changePoint) {
  if (isValidNumber(latestValue) && isValidNumber(previousValue)) {
    if (changePoint > 0) {
      return "up";
    }
    if (changePoint < 0) {
      return "down";
    }
    return "flat";
  }
  if (isValidNumber(latestValue)) {
    return "new";
  }
  return "unavailable";
}

// 네트워크 오류/타임아웃(500), 잘못된 JSON(502), 네이버 5xx만 재시도 대상으로
// 본다. 400/403/429는 사용자·정책 문제이므로 자동 재시도하지 않는다.
function isRetryableNaverError(err) {
  var status = err && err.status;
  return typeof status === "number" && status >= 500 && status < 600;
}

// callNaverDatalabWithTimeout을 감싸서, 네트워크 오류/5xx일 때만 최대 1회
// 재시도한다(짧은 지연 후). 기존 callNaverDatalabWithTimeout/callNaverDatalab
// 자체는 수정하지 않는다.
function callNaverSearchTrendWithRetry(requestBody, callback) {
  function attempt(retryCount) {
    callNaverDatalabWithTimeout(
      "/v1/datalab/search",
      NAVER_SEARCH_TREND_CLIENT_ID,
      NAVER_SEARCH_TREND_CLIENT_SECRET,
      requestBody,
      ANIME_NAVER_TIMEOUT_MS,
      function (err, data) {
        if (err) {
          if (retryCount < AUTO_TOP5_NAVER_MAX_RETRY && isRetryableNaverError(err)) {
            setTimeout(function () { attempt(retryCount + 1); }, AUTO_TOP5_NAVER_RETRY_DELAY_MS);
            return;
          }
          callback(err);
          return;
        }
        callback(null, data);
      }
    );
  }
  attempt(0);
}

function naverSearchTrendPromise(requestBody) {
  return new Promise(function (resolve, reject) {
    callNaverSearchTrendWithRetry(requestBody, function (err, data) {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}

// 배열을 앞에서부터 순서대로(동시에 여러 개를 실행하지 않고) 하나씩 처리한다.
// 네이버 batch 호출을 Promise.all로 한꺼번에 쏘지 않기 위해 사용한다.
function runPromisesSequentially(items, iteratorFn) {
  var results = [];
  return items.reduce(function (chain, item, index) {
    return chain.then(function () {
      return iteratorFn(item, index).then(function (result) {
        results.push(result);
        return null;
      });
    });
  }, Promise.resolve()).then(function () {
    return results;
  });
}

// 네이버/AniList 원본 오류를 파이프라인 단계(stage)가 표시된 사용자용 오류로
// 바꾼다. stage는 candidate_discovery / anchor_probe / batch_comparison /
// final_validation 중 하나만 클라이언트에 노출한다.
function makeStageError(status, stage, message) {
  var error = new Error(message);
  error.status = status;
  error.stage = stage;
  error.userMessage = message;
  return error;
}

function mapAutoTop5AniListError(err, stage) {
  var mapped = mapAniListError(err);
  return makeStageError(mapped.status, stage, mapped.message);
}

function mapAutoTop5NaverError(err, stage) {
  var mapped = mapAnimeTrendsNaverError(err); // 기존 v3.9 오류 매핑을 그대로 재사용
  return makeStageError(mapped.status, stage, mapped.message);
}

// weekly(최근 완료 주까지의 시계열)에서 "최근 4주 중 ratio가 유효한(null이 아닌)
// 주 수"를 센다. 기준 작품이 결측이 지나치게 많은 작품이 되지 않도록 쓴다.
function computeValidRecentWeekCount(weekly) {
  var last4 = weekly.slice(Math.max(0, weekly.length - 4));
  return last4.filter(function (point) { return isValidNumber(point.ratio); }).length;
}

// probe한 후보 중에서 기준 작품(anchor)을 고른다. 조건: 1) 한국어 검색어 보유
// (keywordCoverageStatus가 korean_verified/korean_unverified) 2) 최신 완료 주
// ratio가 유효한 양수 3) 최근 4주 중 유효한 주가 AUTO_TOP5_ANCHOR_MIN_VALID_WEEKS
// 이상. "원피스" 같은 특정 작품을 하드코딩하지 않고, 매 요청마다 실제 최신
// 데이터로 다시 정한다. 조건을 만족하는 후보가 없으면 null을 돌려주고, 호출한
// 쪽에서 probe 범위를 넓혀 다시 시도한다.
function selectAnchorCandidate(probeCandidates, probeSeriesList) {
  var scored = probeCandidates.map(function (candidate, i) {
    var weekly = probeSeriesList[i].weekly;
    var latest = weekly.length > 0 ? weekly[weekly.length - 1].ratio : null;
    var validRecentWeekCount = computeValidRecentWeekCount(weekly);
    return { candidate: candidate, latest: latest, validRecentWeekCount: validRecentWeekCount };
  });

  var eligible = scored.filter(function (s) {
    var hasKoreanKeyword = s.candidate.keywordCoverageStatus === "korean_verified" ||
      s.candidate.keywordCoverageStatus === "korean_unverified";
    return hasKoreanKeyword &&
      isValidNumber(s.latest) && s.latest > 0 &&
      s.validRecentWeekCount >= AUTO_TOP5_ANCHOR_MIN_VALID_WEEKS;
  });

  if (eligible.length === 0) {
    return null;
  }

  eligible.sort(function (a, b) {
    if (b.latest !== a.latest) {
      return b.latest - a.latest;
    }
    return a.candidate.discoveryRank - b.candidate.discoveryRank;
  });

  var best = eligible[0];
  return {
    candidate: best.candidate,
    reason: "한국어 검색어를 확보한 후보 중 최근 완료 주 검색 관심도(ratio)가 가장 높고 최근 4주 데이터가 충분해 기준 작품으로 선정했습니다.",
    latestRatioValid: true,
    validRecentWeekCount: best.validRecentWeekCount
  };
}

// 후보군 전체(anchor 포함)의 anchorNormalizedIndex 기준 순위를 매긴다. 동점이면
// discoveryRank -> title -> anilistId 순으로 안정 정렬한다(assignAnimeRanks와
// 같은 원리이지만, 이 라우트 전용 tie-break인 anilistId까지 포함해 새로 작성했다).
function assignPoolRanks(poolEntries) {
  function rank(field, outField) {
    poolEntries.forEach(function (entry) { entry[outField] = null; });
    var eligible = poolEntries.filter(function (entry) { return isValidNumber(entry[field]); });
    eligible.sort(function (a, b) {
      if (b[field] !== a[field]) {
        return b[field] - a[field];
      }
      if (a.discoveryRank !== b.discoveryRank) {
        return a.discoveryRank - b.discoveryRank;
      }
      if (a.title !== b.title) {
        return a.title.localeCompare(b.title);
      }
      return a.anilistId - b.anilistId;
    });
    eligible.forEach(function (entry, idx) { entry[outField] = idx + 1; });
  }

  rank("latestValue", "poolCurrentRank");
  rank("previousValue", "poolPreviousRank");

  poolEntries.forEach(function (entry) {
    entry.poolRankChange = (entry.poolCurrentRank !== null && entry.poolPreviousRank !== null)
      ? (entry.poolPreviousRank - entry.poolCurrentRank)
      : null;
  });
}

// 예비 TOP 5를 실제로 비교한 마지막(최종) 네이버 요청 결과로 1~5위를 확정한다.
// 동점이면 예비 순위(preliminaryPoolRank) -> discoveryRank -> title 순이다.
function assignFinalTop5Ranks(finalItems) {
  function rank(field, outField) {
    finalItems.forEach(function (item) { item[outField] = null; });
    var eligible = finalItems.filter(function (item) { return isValidNumber(item[field]); });
    eligible.sort(function (a, b) {
      if (b[field] !== a[field]) {
        return b[field] - a[field];
      }
      if (a.preliminaryPoolRank !== b.preliminaryPoolRank) {
        return a.preliminaryPoolRank - b.preliminaryPoolRank;
      }
      if (a.discoveryRank !== b.discoveryRank) {
        return a.discoveryRank - b.discoveryRank;
      }
      return a.title.localeCompare(b.title);
    });
    eligible.forEach(function (item, idx) { item[outField] = idx + 1; });
  }

  rank("latestRatio", "currentRank");
  rank("previousRatio", "previousRankWithinFinalists");

  finalItems.forEach(function (item) {
    item.rankChangeWithinFinalists = (item.currentRank !== null && item.previousRankWithinFinalists !== null)
      ? (item.previousRankWithinFinalists - item.currentRank)
      : null;
  });
}

// 5위와 6위의 anchorNormalizedIndex 차이를 계산한다. 참고용 정보일 뿐이며,
// 이 값 때문에 실제 순위를 임의로 바꾸지 않는다.
function computeBoundaryInfo(sortedEligiblePoolEntries) {
  if (sortedEligiblePoolEntries.length < 6) {
    return {
      rank5Value: sortedEligiblePoolEntries.length >= 5 ? sortedEligiblePoolEntries[4].latestValue : null,
      rank6Value: null,
      diff: null,
      boundaryClose: false
    };
  }
  var v5 = sortedEligiblePoolEntries[4].latestValue;
  var v6 = sortedEligiblePoolEntries[5].latestValue;
  var diff = roundTo2(v5 - v6);
  var boundaryClose = v5 !== 0 && (Math.abs(diff) / Math.abs(v5)) <= AUTO_TOP5_BOUNDARY_CLOSE_RATIO;
  return { rank5Value: v5, rank6Value: v6, diff: diff, boundaryClose: boundaryClose };
}

// 캐시 키에 AUTO_TOP5_RESULT_CACHE_VERSION을 포함해서, 한국어 보강 이전 버전의
// 결과 캐시(영문-only 후보 기준)가 새 로직에서 재사용되지 않게 한다. snapshotId는
// AniList 트렌딩 + Wikidata 한국어 보강까지 끝난 후보 pool의 스냅샷 식별자다.
function buildAutoTop5CacheKey(weeks, range, snapshotId) {
  return JSON.stringify({
    v: AUTO_TOP5_RESULT_CACHE_VERSION,
    weeks: weeks,
    startDate: range.startDate,
    endDate: range.endDate,
    snapshotId: snapshotId
  });
}

function getAutoTop5ResultCache(key) {
  var entry = autoTop5ResultCache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    autoTop5ResultCache.delete(key);
    return null;
  }
  return entry.body;
}

function setAutoTop5ResultCache(key, body) {
  if (autoTop5ResultCache.has(key)) {
    autoTop5ResultCache.delete(key);
  }
  autoTop5ResultCache.set(key, { expiresAt: Date.now() + AUTO_TOP5_RESULT_CACHE_TTL_MS, body: body });
  while (autoTop5ResultCache.size > AUTO_TOP5_RESULT_CACHE_MAX_ENTRIES) {
    var oldestKey = autoTop5ResultCache.keys().next().value;
    autoTop5ResultCache.delete(oldestKey);
  }
}

function withAutoTop5CacheFlags(responseBody, cacheHit) {
  var out = {};
  for (var key in responseBody) {
    if (Object.prototype.hasOwnProperty.call(responseBody, key)) {
      out[key] = responseBody[key];
    }
  }
  out.cache = { resultCacheHit: cacheHit, resultCacheTtlSeconds: AUTO_TOP5_RESULT_CACHE_TTL_SECONDS };
  return out;
}

function validateAutoTop5Weeks(rawParam) {
  if (rawParam === null || rawParam === undefined || rawParam === "") {
    return { weeks: AUTO_TOP5_WEEKS_DEFAULT, error: null };
  }
  var num = Number(rawParam);
  if (!Number.isInteger(num) || AUTO_TOP5_WEEKS_OPTIONS.indexOf(num) === -1) {
    return {
      weeks: null,
      error: { status: 400, message: "weeks는 " + AUTO_TOP5_WEEKS_OPTIONS.join(", ") + " 중 하나여야 합니다." }
    };
  }
  return { weeks: num, error: null };
}

// ===== 자동 TOP 5 파이프라인 본체 =====
// candidate_discovery(AniList) -> anchor_probe(상위 5개 네이버 비교로 기준 작품
// 선정) -> batch_comparison(기준 작품 + 나머지 후보를 4개씩 순차 비교) ->
// final_validation(예비 상위 5개를 마지막으로 한 번 더 같은 요청에서 검증) 순서로
// 진행한다. 각 단계 실패는 makeStageError로 표준화해서 위로 던진다.
function runAutoTop5Pipeline(weeks) {
  var key = String(weeks);
  if (autoTop5InFlightByWeeks.has(key)) {
    return autoTop5InFlightByWeeks.get(key);
  }

  var promise = computeAutoTop5(weeks).finally(function () {
    autoTop5InFlightByWeeks.delete(key);
  });
  autoTop5InFlightByWeeks.set(key, promise);
  return promise;
}

function computeAutoTop5(weeks) {
  var externalCalls = { anilistCalls: 0, wikidataCalls: 0, naverProbeCalls: 0, naverBatchCalls: 0, naverFinalCalls: 0 };

  return getAniListCandidatePoolPromise(externalCalls)
    .catch(function (err) {
      throw mapAutoTop5AniListError(err, "candidate_discovery");
    })
    .then(function (poolResult) {
      var range = computeAnimeWeeklyRange(weeks);
      var expectedPeriods = buildExpectedAnimeWeekPeriods(range.startDate, weeks);
      var cacheKey = buildAutoTop5CacheKey(weeks, range, poolResult.snapshotId);
      var cachedBody = getAutoTop5ResultCache(cacheKey);

      if (cachedBody) {
        return withAutoTop5CacheFlags(cachedBody, true);
      }

      return runAutoTop5Uncached(weeks, range, expectedPeriods, poolResult, externalCalls, cacheKey);
    });
}

// 후보 상위 5개를 먼저 probe하고, 적합한 기준 작품이 없으면(한국어 검색어 +
// 유효 양수 ratio + 최근 4주 유효 2주 이상을 만족하는 후보가 없으면) 상위
// 6~10위까지 별도 요청으로 한 번 더 probe해서 범위를 넓힌다(한 요청 최대 5개
// 제한을 지키기 위해 두 번으로 나눠 부른다). 기준 작품을 하드코딩하지 않는다.
function probeForAnchor(candidates, range, expectedPeriods, externalCalls) {
  var firstBatch = candidates.slice(0, AUTO_TOP5_ANCHOR_PROBE_COUNT);
  var firstRequestBody = buildAutoTop5NaverGroupsRequestBody(firstBatch, range);

  return naverSearchTrendPromise(firstRequestBody)
    .catch(function (err) { throw mapAutoTop5NaverError(err, "anchor_probe"); })
    .then(function (firstData) {
      externalCalls.naverProbeCalls += 1;
      var firstSeriesList = computeGroupWeeklySeriesFromNaverResult(firstData, expectedPeriods, firstBatch.length);
      var selection = selectAnchorCandidate(firstBatch, firstSeriesList);

      if (selection || candidates.length <= AUTO_TOP5_ANCHOR_PROBE_COUNT) {
        return { anchorSelection: selection, probeCandidateCount: firstBatch.length };
      }

      var secondBatch = candidates.slice(AUTO_TOP5_ANCHOR_PROBE_COUNT, 10);
      if (secondBatch.length === 0) {
        return { anchorSelection: null, probeCandidateCount: firstBatch.length };
      }

      var secondRequestBody = buildAutoTop5NaverGroupsRequestBody(secondBatch, range);
      return naverSearchTrendPromise(secondRequestBody)
        .catch(function (err) { throw mapAutoTop5NaverError(err, "anchor_probe"); })
        .then(function (secondData) {
          externalCalls.naverProbeCalls += 1;
          var secondSeriesList = computeGroupWeeklySeriesFromNaverResult(secondData, expectedPeriods, secondBatch.length);
          var combinedCandidates = firstBatch.concat(secondBatch);
          var combinedSeriesList = firstSeriesList.concat(secondSeriesList);
          var combinedSelection = selectAnchorCandidate(combinedCandidates, combinedSeriesList);
          return { anchorSelection: combinedSelection, probeCandidateCount: combinedCandidates.length };
        });
    });
}

function runAutoTop5Uncached(weeks, range, expectedPeriods, poolResult, externalCalls, cacheKey) {
  if (!NAVER_SEARCH_TREND_CLIENT_ID || !NAVER_SEARCH_TREND_CLIENT_SECRET) {
    return Promise.reject(makeStageError(503, "anchor_probe", "네이버 검색어트렌드 API 키가 아직 설정되지 않았습니다."));
  }

  var candidates = poolResult.candidates;

  return probeForAnchor(candidates, range, expectedPeriods, externalCalls).then(function (probeResult) {
    var anchorSelection = probeResult.anchorSelection;

    if (!anchorSelection) {
      throw makeStageError(502, "anchor_probe", "공통 기준으로 사용할 애니메이션을 선정하지 못했습니다.");
    }

    var anchor = anchorSelection.candidate;
    var remaining = candidates.filter(function (c) { return c.anilistId !== anchor.anilistId; });
    var batches = chunkArray(remaining, AUTO_TOP5_BATCH_CANDIDATE_SIZE);
    var poolMetricsByAnilistId = {};

    return runPromisesSequentially(batches, function (batchCandidates, batchIndex) {
      var batchGroupCandidates = [anchor].concat(batchCandidates);
      var batchRequestBody = buildAutoTop5NaverGroupsRequestBody(batchGroupCandidates, range);

      return naverSearchTrendPromise(batchRequestBody)
        .catch(function (err) { throw mapAutoTop5NaverError(err, "batch_comparison"); })
        .then(function (batchData) {
          externalCalls.naverBatchCalls += 1;
          var batchSeriesList = computeGroupWeeklySeriesFromNaverResult(batchData, expectedPeriods, batchGroupCandidates.length);
          var anchorRawWeekly = batchSeriesList[0].weekly;

          if (batchIndex === 0) {
            var anchorNormSeries = anchorRawWeekly.map(function (point) {
              var value = (isValidNumber(point.ratio) && point.ratio > 0) ? 100 : null;
              return { period: point.period, value: value };
            });
            var anchorDerived = computeSeriesDerivedMetrics(anchorNormSeries);
            poolMetricsByAnilistId[anchor.anilistId] = anchorDerived;
          }

          batchCandidates.forEach(function (candidate, j) {
            var candidateWeekly = batchSeriesList[j + 1].weekly;
            var normSeries = candidateWeekly.map(function (point, idx) {
              var candidateRatio = point.ratio;
              var anchorRatio = anchorRawWeekly[idx].ratio;
              var value = (isValidNumber(candidateRatio) && isValidNumber(anchorRatio) && anchorRatio > 0)
                ? roundTo2((candidateRatio / anchorRatio) * 100)
                : null;
              return { period: point.period, value: value };
            });
            poolMetricsByAnilistId[candidate.anilistId] = computeSeriesDerivedMetrics(normSeries);
          });

          return null;
        });
    }).then(function () {
      return finalizeAutoTop5(weeks, range, expectedPeriods, poolResult, anchor, anchorSelection, poolMetricsByAnilistId, probeResult.probeCandidateCount, batches.length, externalCalls, cacheKey);
    });
  });
}

function finalizeAutoTop5(weeks, range, expectedPeriods, poolResult, anchor, anchorSelection, poolMetricsByAnilistId, probeCandidateCount, batchCount, externalCalls, cacheKey) {
  var candidates = poolResult.candidates;

  var poolEntries = candidates.map(function (candidate) {
    var metrics = poolMetricsByAnilistId[candidate.anilistId] || null;
    return {
      anilistId: candidate.anilistId,
      title: candidate.titles.display,
      discoveryRank: candidate.discoveryRank,
      hasHangulKeyword: candidate.hasHangulKeyword,
      keywordCoverageStatus: candidate.keywordCoverageStatus,
      latestValue: metrics ? metrics.latestValue : null,
      previousValue: metrics ? metrics.previousValue : null,
      changePoint: metrics ? metrics.changePoint : null
    };
  });

  assignPoolRanks(poolEntries);

  var poolEntryByAnilistId = {};
  poolEntries.forEach(function (entry) { poolEntryByAnilistId[entry.anilistId] = entry; });

  var eligibleForTop5 = poolEntries.filter(function (entry) { return isValidNumber(entry.latestValue); });

  if (eligibleForTop5.length < AUTO_TOP5_MIN_CANDIDATES_REQUIRED) {
    return Promise.reject(makeStageError(502, "batch_comparison", "예비 상위 5개를 구성할 만큼 유효한 검색 관심도 데이터를 확보하지 못했습니다."));
  }

  eligibleForTop5.sort(function (a, b) {
    if (b.latestValue !== a.latestValue) {
      return b.latestValue - a.latestValue;
    }
    if (a.discoveryRank !== b.discoveryRank) {
      return a.discoveryRank - b.discoveryRank;
    }
    if (a.title !== b.title) {
      return a.title.localeCompare(b.title);
    }
    return a.anilistId - b.anilistId;
  });

  var boundaryInfo = computeBoundaryInfo(eligibleForTop5);
  var preliminaryTop5Entries = eligibleForTop5.slice(0, AUTO_TOP5_MIN_CANDIDATES_REQUIRED);
  var candidateByAnilistId = {};
  candidates.forEach(function (c) { candidateByAnilistId[c.anilistId] = c; });

  var preliminaryTop5 = preliminaryTop5Entries.map(function (entry, idx) {
    return {
      candidate: candidateByAnilistId[entry.anilistId],
      preliminaryPoolRank: idx + 1
    };
  });

  var finalRequestBody = buildAutoTop5NaverGroupsRequestBody(
    preliminaryTop5.map(function (p) { return p.candidate; }),
    range
  );

  return naverSearchTrendPromise(finalRequestBody)
    .catch(function (err) { throw mapAutoTop5NaverError(err, "final_validation"); })
    .then(function (finalData) {
      externalCalls.naverFinalCalls += 1;
      var finalSeriesList = computeGroupWeeklySeriesFromNaverResult(finalData, expectedPeriods, preliminaryTop5.length);

      var finalItems = preliminaryTop5.map(function (p, idx) {
        var weekly = finalSeriesList[idx].weekly;
        var series = weekly.map(function (point) { return { period: point.period, value: point.ratio }; });
        var derived = computeSeriesDerivedMetrics(series);
        return {
          anilistId: p.candidate.anilistId,
          title: p.candidate.titles.display,
          discoveryRank: p.candidate.discoveryRank,
          preliminaryPoolRank: p.preliminaryPoolRank,
          weekly: weekly,
          latestRatio: derived.latestValue,
          previousRatio: derived.previousValue,
          changePoint: derived.changePoint,
          average4Weeks: derived.average4Weeks,
          average4WeeksCount: derived.average4WeeksCount
        };
      });

      var hasInvalidFinalist = finalItems.some(function (item) { return item.latestRatio === null; });
      if (hasInvalidFinalist) {
        throw makeStageError(
          502,
          "final_validation",
          "최종 상위 5개 중 일부 애니메이션의 최신 검색 관심도를 확인하지 못해 순위를 확정하지 못했습니다. 잠시 후 다시 시도해 주세요."
        );
      }

      assignFinalTop5Ranks(finalItems);

      var top5 = finalItems
        .slice()
        .sort(function (a, b) { return a.currentRank - b.currentRank; })
        .map(function (item) {
          var candidate = candidateByAnilistId[item.anilistId];
          var poolEntry = poolEntryByAnilistId[item.anilistId];
          var trendStatus = computeStatusFromValues(item.latestRatio, item.previousRatio, item.changePoint);
          return {
            rank: item.currentRank,
            anilistId: candidate.anilistId,
            malId: candidate.malId,
            title: candidate.titles.display,
            titles: candidate.titles,
            synonyms: candidate.synonyms,
            searchKeywords: candidate.searchKeywords,
            koreanTitle: candidate.koreanTitles ? candidate.koreanTitles.label : null,
            koreanAliases: candidate.koreanTitles ? candidate.koreanTitles.aliases : [],
            titleSource: candidate.titleSource || null,
            hasHangulKeyword: candidate.hasHangulKeyword,
            keywordCoverageStatus: candidate.keywordCoverageStatus,
            format: candidate.format,
            mediaStatus: candidate.status,
            season: candidate.season,
            seasonYear: candidate.seasonYear,
            countryOfOrigin: candidate.countryOfOrigin,
            siteUrl: candidate.siteUrl,
            anilistTrending: candidate.trending,
            anilistPopularity: candidate.popularity,
            discoveryRank: candidate.discoveryRank,
            preliminaryPoolRank: item.preliminaryPoolRank,
            poolCurrentRank: poolEntry ? poolEntry.poolCurrentRank : null,
            poolPreviousRank: poolEntry ? poolEntry.poolPreviousRank : null,
            poolRankChange: poolEntry ? poolEntry.poolRankChange : null,
            weekly: item.weekly,
            latestRatio: item.latestRatio,
            previousRatio: item.previousRatio,
            changePoint: item.changePoint,
            average4Weeks: item.average4Weeks,
            average4WeeksCount: item.average4WeeksCount,
            previousRankWithinFinalists: item.previousRankWithinFinalists,
            rankChangeWithinFinalists: item.rankChangeWithinFinalists,
            // trendStatus: 네이버 주간 검색 관심도 변화 상태(up/down/flat/new/unavailable).
            // status는 이 값과 항상 동일하게 유지되는 하위 호환용 필드다(기존 status
            // 필드를 참조하던 코드가 있어도 계속 같은 값을 받도록 남겨둔다). AniList
            // 작품 공개·방영 상태(RELEASING 등)는 mediaStatus로 완전히 분리했다 —
            // 예전에는 이 자리의 status 키가 바로 위 mediaStatus 값을 덮어써서
            // AniList 상태가 응답에서 사라지는 문제가 있었다.
            trendStatus: trendStatus,
            status: trendStatus
          };
        });

      var candidateRanking = poolEntries
        .slice()
        .sort(function (a, b) {
          var rankA = a.poolCurrentRank === null ? Infinity : a.poolCurrentRank;
          var rankB = b.poolCurrentRank === null ? Infinity : b.poolCurrentRank;
          if (rankA !== rankB) {
            return rankA - rankB;
          }
          if (a.discoveryRank !== b.discoveryRank) {
            return a.discoveryRank - b.discoveryRank;
          }
          if (a.title !== b.title) {
            return a.title.localeCompare(b.title);
          }
          return a.anilistId - b.anilistId;
        })
        .map(function (entry) {
          return {
            poolRank: entry.poolCurrentRank,
            anilistId: entry.anilistId,
            title: entry.title,
            discoveryRank: entry.discoveryRank,
            latestAnchorNormalizedIndex: entry.latestValue,
            previousAnchorNormalizedIndex: entry.previousValue,
            anchorNormalizedChangePoint: entry.changePoint,
            hasHangulKeyword: entry.hasHangulKeyword,
            keywordCoverageStatus: entry.keywordCoverageStatus
          };
        });

      var notices = [
        "후보 작품은 AniList의 글로벌 트렌딩 데이터를 기반으로 자동 선정합니다.",
        "한국어 제목과 별칭이 확인된 작품만 한국 네이버 관심도 순위에 포함했습니다.",
        "한국어 제목은 Wikidata의 AniList 또는 MyAnimeList 식별자 연결을 통해 보강했습니다.",
        "한국어 제목이 확인되지 않은 글로벌 트렌딩 작품은 이번 순위에서 제외될 수 있습니다.",
        "자동 제목 매칭은 완전하지 않을 수 있습니다.",
        "최종 순위는 자동 후보군 안에서 네이버 검색 관심도를 비교한 결과입니다.",
        "이 결과는 전체 애니메이션의 공식 순위가 아닙니다.",
        "검색 관심도 지수는 실제 검색 횟수, 피규어 판매량 또는 매출을 의미하지 않습니다.",
        "여러 요청의 후보 비교에는 공통 기준 작품 대비 보정지수를 사용했습니다.",
        "최종 상위 5개는 하나의 네이버 데이터랩 요청에서 다시 비교했습니다."
      ];

      var naverTotalCalls = externalCalls.naverProbeCalls + externalCalls.naverBatchCalls + externalCalls.naverFinalCalls;

      var responseBody = {
        ok: true,
        generatedAt: new Date().toISOString(),
        dataSources: {
          candidateDiscovery: "ANILIST_TRENDING",
          koreanInterest: "NAVER_DATALAB_SEARCH_TREND"
        },
        scope: "anilist_auto_korean_title_candidates_naver_korea_top5",
        timezone: SEOUL_TIME_ZONE,
        timeUnit: "week",
        range: {
          startDate: range.startDate,
          endDate: range.endDate,
          requestedWeeks: weeks
        },
        rankingWeek: {
          period: expectedPeriods.length > 0 ? expectedPeriods[expectedPeriods.length - 1] : null,
          label: "최근 완료 주"
        },
        candidatePool: {
          requestedCount: AUTO_TOP5_CANDIDATE_LIMIT,
          actualCount: candidates.length,
          partialCandidatePool: poolResult.stats.partialCandidatePool,
          anilistPagesFetched: poolResult.stats.anilistPagesFetched,
          anilistRawFetchedCount: poolResult.stats.anilistRawFetchedCount,
          validCountBeforeDedupe: poolResult.stats.validCountBeforeDedupe,
          countAfterDedupe: poolResult.stats.countAfterDedupe,
          koreanVerifiedCount: poolResult.stats.koreanVerifiedCount,
          koreanUnverifiedCount: poolResult.stats.koreanUnverifiedCount,
          nonKoreanOnlyCount: poolResult.stats.nonKoreanOnlyCount,
          insufficientCount: poolResult.stats.insufficientCount,
          excludedFromNaverRankingCount: poolResult.stats.excludedFromNaverRankingCount,
          finalKoreanCandidateCount: poolResult.stats.finalKoreanCandidateCount
        },
        discovery: {
          sort: ["TRENDING_DESC", "POPULARITY_DESC"],
          anilistCacheHit: poolResult.anilistCacheHit,
          anilistCacheTtlSeconds: ANILIST_CACHE_TTL_SECONDS
        },
        methodology: {
          anchor: {
            anilistId: anchor.anilistId,
            title: anchor.titles.display,
            koreanTitle: anchor.koreanTitles ? anchor.koreanTitles.label : null,
            keywordCoverageStatus: anchor.keywordCoverageStatus,
            reason: anchorSelection.reason,
            latestRatioValid: anchorSelection.latestRatioValid,
            validRecentWeekCount: anchorSelection.validRecentWeekCount
          },
          probeCandidateCount: probeCandidateCount,
          batchCount: batchCount,
          normalization: "candidateRatio / anchorRatio * 100",
          finalValidation: true,
          boundaryClose: boundaryInfo.boundaryClose,
          preliminaryBoundary: {
            rank5Value: boundaryInfo.rank5Value,
            rank6Value: boundaryInfo.rank6Value,
            diff: boundaryInfo.diff
          }
        },
        top5: top5,
        candidateRanking: candidateRanking,
        externalCalls: {
          anilistCalls: externalCalls.anilistCalls,
          wikidataCalls: externalCalls.wikidataCalls,
          naverProbeCalls: externalCalls.naverProbeCalls,
          naverBatchCalls: externalCalls.naverBatchCalls,
          naverFinalCalls: externalCalls.naverFinalCalls,
          naverTotalCalls: naverTotalCalls
        },
        notices: notices
      };

      setAutoTop5ResultCache(cacheKey, responseBody);

      return withAutoTop5CacheFlags(responseBody, false);
    });
}

function handleAnimeAutoTop5Request(req, res, requestUrl) {
  if (req.method !== "GET") {
    sendJson(res, 405, {
      ok: false,
      message: "자동 애니메이션 TOP 5는 GET 요청만 지원합니다."
    }, { "Allow": "GET" });
    return;
  }

  var weeksResult = validateAutoTop5Weeks(requestUrl.searchParams.get("weeks"));
  if (weeksResult.error) {
    sendJson(res, weeksResult.error.status, { ok: false, message: weeksResult.error.message });
    return;
  }

  runAutoTop5Pipeline(weeksResult.weeks)
    .then(function (body) {
      sendJson(res, 200, body);
    })
    .catch(function (err) {
      var status = (err && err.status) || 502;
      var message = (err && err.userMessage) || "일시적으로 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
      var stage = (err && err.stage) || "unknown";
      console.error("[anime-auto-top5] 실패 (stage: " + stage + ", status: " + status + ")");
      sendJson(res, status, { ok: false, message: message, stage: stage });
    });
}

var server = http.createServer(function (req, res) {
  // req.url에는 "/api/trends?keywords=..." 처럼 쿼리(물음표 뒤) 부분도 포함되어 있어서,
  // 주소 비교와 keywords 값을 읽기 위해 미리 pathname과 쿼리로 나눠둡니다.
  var requestUrl = new URL(req.url, "http://localhost");
  var pathname = requestUrl.pathname;

  if (pathname === "/") {
    // Render 같은 곳에 배포하면 이 서버 주소로 직접 접속하는 사람이 생기므로,
    // 메인 화면(index.html)을 그대로 읽어서 돌려준다. 로컬에서 index.html을
    // 더블클릭해서 여는 방식(file://)에는 영향을 주지 않는다.
    var indexPath = path.join(__dirname, "index.html");

    fs.readFile(indexPath, "utf8", function (err, html) {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("index.html을 읽는 중 오류가 발생했습니다.");
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    });
    return;
  }

  if (pathname === "/assets/emoticons.png") {
    // 헤더 장식용 이모티콘 스프라이트 이미지입니다. assets 폴더 전체를 공개하는
    // 대신, 이 파일 하나만 정확한 경로 문자열로 비교해서 내려줍니다. pathname을
    // 그대로 파일 경로에 이어붙이는 방식이 아니라 미리 정해둔 고정 경로만 읽기
    // 때문에 "../" 같은 경로 조작으로 다른 파일을 읽을 수 없습니다.
    var emoticonsPath = path.join(__dirname, "assets", "emoticons.png");

    fs.readFile(emoticonsPath, function (err, imageBuffer) {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not Found");
        return;
      }

      res.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400"
      });
      res.end(imageBuffer);
    });
    return;
  }

  if (pathname === "/api/trends") {
    // 화면(index.html)이 실제로 쓰는 주소입니다. keywords 쿼리값(없으면 기본 키워드)으로
    // 네이버 API를 먼저 호출해보고, 성공하면 그 결과를 화면 데이터 모양으로 바꿔서
    // 돌려주고, 실패하면(키가 없거나, 네이버 서버 오류거나, 응답에 쓸만한 데이터가 없는
    // 경우) 예시 데이터를 대신 돌려줍니다. 어느 쪽이든 이 서버는 결과를 파일이나 DB에
    // 저장하지 않습니다.
    var keywordsParam = requestUrl.searchParams.get("keywords");
    var parsedKeywords = parseKeywordsParam(keywordsParam);

    if (parsedKeywords.error) {
      sendJson(res, parsedKeywords.error.status, parsedKeywords.error);
      return;
    }

    var activeKeywords = parsedKeywords.keywords;
    var trendRange = getRecentDateRange(30);
    var finalSearchData = mockSearchData;
    var finalShoppingProductData = mockShoppingProductData;
    // 각 목록이 실제 네이버 API에서 왔는지("naver"), 예시 데이터로 대체됐는지("mock")
    // 화면에 그대로 알려주기 위한 값입니다. 기본값은 "mock"이고, API 호출이 성공해서
    // 실제 데이터로 바뀔 때만 "naver"로 바꿉니다.
    var searchDataSource = "mock";
    var shoppingProductSource = "mock";
    var callsFinished = 0;

    function sendTrendsResponse() {
      callsFinished += 1;
      if (callsFinished < 2) {
        return;
      }
      sendJson(res, 200, {
        searchData: finalSearchData,
        searchDataSource: searchDataSource,
        shoppingProductData: finalShoppingProductData,
        shoppingProductSource: shoppingProductSource,
        categories: categories,
        baseDate: getBaseDate(),
        // v1.1: 화면의 "조회 기준" 영역에 표시할 정보. 이번 요청에 실제로 사용된
        // 키워드(activeKeywords)와 조회 기간(dateRange)을 그대로 알려준다.
        activeKeywords: activeKeywords,
        dateRange: trendRange
      });
    }

    var searchTrendBody = {
      startDate: trendRange.startDate,
      endDate: trendRange.endDate,
      timeUnit: "date",
      keywordGroups: activeKeywords.map(function (keyword) {
        return { groupName: keyword, keywords: [keyword] };
      })
    };

    callNaverDatalab(
      "/v1/datalab/search",
      NAVER_SEARCH_TREND_CLIENT_ID,
      NAVER_SEARCH_TREND_CLIENT_SECRET,
      searchTrendBody,
      function (err, data) {
        if (err) {
          console.error("[trends] 검색어트렌드 API 호출 실패로 예시 데이터를 대신 사용합니다. (status: " + err.status + ")");
        } else {
          var converted = buildRankedListFromDatalab(data, TREND_TEST_KEYWORD_CATEGORY);
          if (converted) {
            finalSearchData = converted;
            searchDataSource = "naver";
          } else {
            console.error("[trends] 검색어트렌드 API 응답에 쓸만한 데이터가 없어 예시 데이터를 대신 사용합니다.");
          }
        }
        sendTrendsResponse();
      }
    );

    var shoppingBody = {
      startDate: trendRange.startDate,
      endDate: trendRange.endDate,
      timeUnit: "date",
      category: "50000000",
      keyword: activeKeywords.map(function (keyword) {
        return { name: keyword, param: [keyword] };
      }),
      device: "",
      gender: "",
      ages: []
    };

    callNaverDatalab(
      "/v1/datalab/shopping/category/keywords",
      NAVER_SHOPPING_CLIENT_ID,
      NAVER_SHOPPING_CLIENT_SECRET,
      shoppingBody,
      function (err, data) {
        if (err) {
          console.error("[trends] 쇼핑인사이트 API 호출 실패로 예시 데이터를 대신 사용합니다. (status: " + err.status + ")");
        } else {
          var converted = buildRankedListFromDatalab(data, TREND_TEST_KEYWORD_CATEGORY);
          if (converted) {
            finalShoppingProductData = converted;
            shoppingProductSource = "naver";
          } else {
            console.error("[trends] 쇼핑인사이트 API 응답에 쓸만한 데이터가 없어 예시 데이터를 대신 사용합니다.");
          }
        }
        sendTrendsResponse();
      }
    );
    return;
  }

  if (pathname === "/api/search-trend-test") {
    var searchTrendRange = getRecentDateRange(30);
    var searchTrendBody = {
      startDate: searchTrendRange.startDate,
      endDate: searchTrendRange.endDate,
      timeUnit: "date",
      keywordGroups: [
        { groupName: "선크림", keywords: ["선크림"] },
        { groupName: "양산", keywords: ["양산"] },
        { groupName: "여름원피스", keywords: ["여름원피스"] }
      ]
    };

    callNaverDatalab(
      "/v1/datalab/search",
      NAVER_SEARCH_TREND_CLIENT_ID,
      NAVER_SEARCH_TREND_CLIENT_SECRET,
      searchTrendBody,
      function (err, data) {
        if (err) {
          console.error("[search-trend-test] 실패 (status: " + err.status + ")");
          sendJson(res, err.status || 500, err);
          return;
        }
        sendJson(res, 200, data);
      }
    );
    return;
  }

  if (pathname === "/api/shopping-insight-test") {
    var shoppingRange = getRecentDateRange(30);
    var shoppingBody = {
      startDate: shoppingRange.startDate,
      endDate: shoppingRange.endDate,
      timeUnit: "date",
      category: "50000000",
      keyword: [
        { name: "선크림", param: ["선크림"] }
      ],
      device: "",
      gender: "",
      ages: []
    };

    callNaverDatalab(
      "/v1/datalab/shopping/category/keywords",
      NAVER_SHOPPING_CLIENT_ID,
      NAVER_SHOPPING_CLIENT_SECRET,
      shoppingBody,
      function (err, data) {
        if (err) {
          console.error("[shopping-insight-test] 실패 (status: " + err.status + ")");
          sendJson(res, err.status || 500, err);
          return;
        }
        sendJson(res, 200, data);
      }
    );
    return;
  }

  if (pathname === "/api/naver-shopping-search") {
    // 화면(index.html)이 "네이버 쇼핑 검색 결과 TOP10"을 보여줄 때 실제로 사용하는
    // 주소입니다. 후보 키워드를 비교하는 /api/trends와 달리, 네이버 쇼핑 검색 API가
    // 실제로 돌려주는 검색 결과 그대로(정확도순 10개)를 화면에 맞게 정리해서 돌려줍니다.
    // 이 서버는 결과를 파일이나 DB에 저장하지 않고, 요청이 들어올 때마다 새로 조회합니다.
    var searchQuery = requestUrl.searchParams.get("query");

    if (!searchQuery || !searchQuery.trim()) {
      sendJson(res, 400, {
        status: 400,
        message: "검색어(query)가 필요합니다.",
        detail: "예: /api/naver-shopping-search?query=선크림"
      });
      return;
    }

    var trimmedQuery = searchQuery.trim();

    if (trimmedQuery.length > MAX_KEYWORD_LENGTH) {
      sendJson(res, 400, {
        status: 400,
        message: "검색어가 너무 깁니다. " + MAX_KEYWORD_LENGTH + "자 이내로 입력해주세요.",
        detail: "입력한 검색어 길이: " + trimmedQuery.length + "자"
      });
      return;
    }

    callNaverShoppingSearchApi(
      NAVER_SHOPPING_CLIENT_ID,
      NAVER_SHOPPING_CLIENT_SECRET,
      trimmedQuery,
      function (err, data) {
        if (err) {
          console.error("[naver-shopping-search] 호출 실패 (status: " + err.status + ")");
          sendJson(res, err.status || 500, {
            status: err.status || 500,
            message: err.message,
            detail: err.detail
          });
          return;
        }

        var items = buildShoppingSearchItems(data);

        if (!items) {
          console.error("[naver-shopping-search] 응답에 쓸만한 데이터가 없습니다.");
          sendJson(res, 502, {
            status: 502,
            message: "네이버 쇼핑 검색 결과가 없습니다.",
            detail: "items 배열을 찾을 수 없거나 비어 있습니다."
          });
          return;
        }

        sendJson(res, 200, {
          source: "naver-shopping-search-api",
          query: trimmedQuery,
          display: 10,
          sort: "sim",
          notice: "네이버 쇼핑 검색 API 결과이며 구매순위/판매순위/공식 인기순위가 아닙니다.",
          items: items
        });
      }
    );
    return;
  }

  if (pathname === "/api/market-status") {
    // 화면(index.html) "1. 시장현황" 영역이 사용하는 주소입니다. 기본적으로는 미리
    // 정해둔 관심 키워드 10개(MARKET_STATUS_KEYWORDS)를 쓰지만, v3.4부터는 쿼리
    // 문자열에 같은 이름을 반복한 keyword 파라미터(예: ?keyword=선크림&keyword=쿠션)로
    // 사용자가 키워드를 직접 지정할 수도 있습니다. keyword 파라미터가 전혀 없으면
    // 기존과 동일하게 기본 키워드를 사용합니다. 최근 30일 검색어트렌드/쇼핑인사이트
    // 추이를 조회해서, 화면에서 바로 쓰기 쉬운 형태로 요약해 돌려줍니다.
    // 네이버 데이터랩 API는 한 번에 최대 5개까지만 비교할 수 있어서, 키워드를 5개씩
    // 묶음으로 나눠 각각 검색어트렌드/쇼핑인사이트를 따로 호출합니다.
    // 이 서버는 결과나 사용자가 입력한 키워드를 파일/DB에 저장하지 않고, 요청이
    // 들어올 때마다 새로 조회합니다.
    var requestedMarketStatusKeywords = requestUrl.searchParams.getAll("keyword");
    var usesDefaultMarketStatusKeywords = requestedMarketStatusKeywords.length === 0;
    var activeMarketStatusKeywords = MARKET_STATUS_KEYWORDS;

    if (!usesDefaultMarketStatusKeywords) {
      var validatedMarketStatusKeywords = validateMarketStatusKeywords(requestedMarketStatusKeywords);
      if (validatedMarketStatusKeywords.error) {
        sendJson(res, validatedMarketStatusKeywords.error.status, validatedMarketStatusKeywords.error);
        return;
      }
      activeMarketStatusKeywords = validatedMarketStatusKeywords.keywords;
    }

    var marketStatusRange = getRecentDateRange(30);
    var marketStatusBatches = chunkArray(activeMarketStatusKeywords, DATALAB_BATCH_SIZE);

    var searchResultsByKeyword = {};
    var shoppingResultsByKeyword = {};
    var hasSearchTrendError = false;
    var hasShoppingInsightError = false;

    var totalMarketStatusCalls = marketStatusBatches.length * 2;
    var marketStatusCallsFinished = 0;

    function finishMarketStatusCall() {
      marketStatusCallsFinished += 1;
      if (marketStatusCallsFinished < totalMarketStatusCalls) {
        return;
      }

      var keywordData = activeMarketStatusKeywords.map(function (keyword) {
        var searchInfo = searchResultsByKeyword[keyword] || null;
        var shoppingInfo = shoppingResultsByKeyword[keyword] || null;

        return {
          keyword: keyword,
          category: MARKET_STATUS_KEYWORD_CATEGORY[keyword] || "생활용품",
          searchInterestScore: searchInfo ? Math.round(searchInfo.avgRatio) : null,
          searchTrend: searchInfo ? searchInfo.trend : "flat",
          searchTrendDiff: searchInfo ? searchInfo.diff : 0,
          shoppingClickScore: shoppingInfo ? Math.round(shoppingInfo.avgRatio) : null
        };
      });

      // 검색어트렌드 API가 (모든 배치에서) 완전히 실패해서 쓸만한 데이터가 하나도
      // 없으면, 화면 쪽에서 예시 데이터로 대체하도록 오류로 응답합니다.
      var hasAnySearchData = keywordData.some(function (item) {
        return item.searchInterestScore !== null;
      });

      if (!hasAnySearchData) {
        sendJson(res, 502, {
          status: 502,
          message: "시장현황 데이터를 가져오지 못했습니다.",
          detail: "네이버 검색어트렌드 API 호출에 모두 실패했습니다."
        });
        return;
      }

      sendJson(res, 200, {
        source: "naver-datalab",
        notice: "네이버 공식 인기검색어 순위가 아니라 관심 키워드 기준 참고용 시장현황입니다.",
        dateRange: marketStatusRange,
        // keywords: 기존 의미 그대로 "서버에 설정된 기본 키워드 목록"을 유지한다
        // (사용자가 다른 키워드를 요청해도 이 값은 바뀌지 않는다).
        keywords: MARKET_STATUS_KEYWORDS,
        // v3.4에 추가된 필드: 이번 요청에 실제로 사용된 키워드와, 그것이 기본
        // 키워드인지 여부. index.html은 "현재 적용 키워드" 문구를 표시할 때
        // keywords가 아니라 이 effectiveKeywords를 기준으로 삼는다.
        effectiveKeywords: activeMarketStatusKeywords,
        usesDefaultKeywords: usesDefaultMarketStatusKeywords,
        keywordData: keywordData,
        // 두 배치 중 일부만 실패한 경우에도 나머지 데이터는 그대로 내려주되,
        // 화면에서 "일부 키워드 데이터 없음" 같은 안내를 보여줄 수 있도록 알려준다.
        partialFailure: hasSearchTrendError || hasShoppingInsightError
      });
    }

    marketStatusBatches.forEach(function (batchKeywords) {
      fetchSearchTrendBatch(batchKeywords, marketStatusRange, function (err, data) {
        if (err) {
          hasSearchTrendError = true;
          console.error("[market-status] 검색어트렌드 API 호출 실패 (status: " + err.status + ")");
        } else if (data && Array.isArray(data.results)) {
          data.results.forEach(function (result) {
            var seriesData = Array.isArray(result.data) ? result.data : [];
            searchResultsByKeyword[result.title] = computeTrendInfo(seriesData);
          });
        }
        finishMarketStatusCall();
      });

      fetchShoppingInsightBatch(batchKeywords, marketStatusRange, function (err, data) {
        if (err) {
          hasShoppingInsightError = true;
          console.error("[market-status] 쇼핑인사이트 API 호출 실패 (status: " + err.status + ")");
        } else if (data && Array.isArray(data.results)) {
          data.results.forEach(function (result) {
            var seriesData = Array.isArray(result.data) ? result.data : [];
            shoppingResultsByKeyword[result.title] = computeTrendInfo(seriesData);
          });
        }
        finishMarketStatusCall();
      });
    });
    return;
  }

  if (pathname === "/api/health") {
    // 운영 점검용 주소입니다. 네이버 API는 전혀 호출하지 않고, 이 서버 프로세스가
    // 요청을 받아 응답할 수 있는 상태인지만 알려줍니다. API 키/Secret이나 다른
    // 환경변수 값은 어떤 경우에도 이 응답에 포함하지 않습니다.
    sendJson(res, 200, {
      ok: true,
      service: "trend-top10",
      status: "running",
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (pathname === "/api/anime-weekly-trends") {
    handleAnimeWeeklyTrendsRequest(req, res);
    return;
  }

  if (pathname === "/api/anime-auto-top5") {
    handleAnimeAutoTop5Request(req, res, requestUrl);
    return;
  }

  if (pathname === "/api/naver-ready") {
    // 실제 네이버 API를 호출하지는 않고, 용도별 환경변수가 설정되어 있는지만 true/false로 알려줍니다.
    var shoppingInsightReady = Boolean(NAVER_SHOPPING_CLIENT_ID) && Boolean(NAVER_SHOPPING_CLIENT_SECRET);
    var searchTrendReady = Boolean(NAVER_SEARCH_TREND_CLIENT_ID) && Boolean(NAVER_SEARCH_TREND_CLIENT_SECRET);

    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    });
    res.end(JSON.stringify({
      shoppingInsightReady: shoppingInsightReady,
      searchTrendReady: searchTrendReady
    }));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not Found");
});

// Render 같은 호스팅 서비스는 서버가 어떤 포트를 쓸지 자기들이 정해서 환경변수
// PORT로 알려준다. 그 값이 있으면 그대로 쓰고, 없으면(내 컴퓨터에서 그냥 실행할 때는)
// 지금까지 쓰던 3000번을 그대로 쓴다.
var PORT = process.env.PORT || 3000;

server.listen(PORT, function () {
  console.log("네이버 쇼핑 검색 TOP10 서버 실행 중: http://localhost:" + PORT + "/api/naver-shopping-search");
});
