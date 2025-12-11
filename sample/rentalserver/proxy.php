<?php
/**
 * MCP Server PHP Proxy for XServer
 * Forwards requests to Node.js MCP server on localhost:8000
 */

// Node.js MCP serverのベースURL
$targetHost = "http://localhost:8000";

// リクエストパスを取得
$requestUri = $_SERVER["REQUEST_URI"];
$path = parse_url($requestUri, PHP_URL_PATH);

// /proxy.php を除去してパスを正規化
$path = preg_replace("/^\/proxy\.php/", "", $path);
if (empty($path)) {
    $path = "/";
}

$targetUrl = $targetHost . $path;

// Query stringがあれば追加
if (!empty($_SERVER["QUERY_STRING"])) {
    $targetUrl .= "?" . $_SERVER["QUERY_STRING"];
}

// CORSヘッダー
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, Mcp-Session-Id");

// OPTIONSリクエストへの対応
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// cURLでリクエストを転送
$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, $targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

// リクエストメソッドを設定
$method = $_SERVER["REQUEST_METHOD"];
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

// リクエストヘッダーを転送
$requestHeaders = [];
foreach (getallheaders() as $name => $value) {
    // Hostヘッダーは除外
    if (strtolower($name) !== "host") {
        $requestHeaders[] = "$name: $value";
    }
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $requestHeaders);

// POSTデータを転送
if (in_array($method, ["POST", "PUT", "PATCH"])) {
    $body = file_get_contents("php://input");
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

// リクエスト実行
$response = curl_exec($ch);
$error = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);

curl_close($ch);

if ($error) {
    http_response_code(502);
    header("Content-Type: application/json");
    echo json_encode(["error" => "Proxy error", "message" => $error]);
    exit;
}

// レスポンスヘッダーとボディを分離
$responseHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);

// HTTPステータスコードを設定
http_response_code($httpCode);

// レスポンスヘッダーを転送（一部除外）
$headerLines = explode("\r\n", $responseHeaders);
foreach ($headerLines as $header) {
    if (empty($header)) continue;
    
    // Transfer-Encoding, Connection などは除外
    $lowerHeader = strtolower($header);
    if (strpos($lowerHeader, "transfer-encoding:") === 0) continue;
    if (strpos($lowerHeader, "connection:") === 0) continue;
    if (strpos($lowerHeader, "http/") === 0) continue;
    
    header($header);
}

// レスポンスボディを出力
echo $responseBody;
