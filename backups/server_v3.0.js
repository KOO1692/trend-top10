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

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
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
    // 화면(index.html) "1. 시장현황" 영역이 사용하는 주소입니다. 미리 정해둔 관심
    // 키워드 10개(MARKET_STATUS_KEYWORDS)의 최근 30일 검색어트렌드/쇼핑인사이트
    // 추이를 조회해서, 화면에서 바로 쓰기 쉬운 형태로 요약해 돌려줍니다.
    // 네이버 데이터랩 API는 한 번에 최대 5개까지만 비교할 수 있어서, 10개를 5개씩
    // 두 묶음으로 나눠 각각 검색어트렌드/쇼핑인사이트를 따로 호출합니다(총 4번 호출).
    // 이 서버는 결과를 파일이나 DB에 저장하지 않고, 요청이 들어올 때마다 새로 조회합니다.
    var marketStatusRange = getRecentDateRange(30);
    var marketStatusBatches = chunkArray(MARKET_STATUS_KEYWORDS, DATALAB_BATCH_SIZE);

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

      var keywordData = MARKET_STATUS_KEYWORDS.map(function (keyword) {
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

      // 검색어트렌드 API가 (두 배치 모두) 완전히 실패해서 쓸만한 데이터가 하나도
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
        keywords: MARKET_STATUS_KEYWORDS,
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
