<?php
/**
 * Яндекс Директ API Integration
 * Backend для работы с API Яндекс Директ
 */

// Must be at the very start
header('Content-Type: application/json; charset=utf-8');

// Error handling
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("PHP Error [$errno]: $errstr in $errfile:$errline");
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error']);
    exit;
});

header('Access-Control-Allow-Origin: *');

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0);

/**
 * Response helper
 */
function sendResponse($success, $data = null, $message = null) {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'error' => $message
    ]);
    exit;
}

/**
 * Validate token format
 */
function isValidToken($token) {
    return is_string($token) && !empty(trim($token));
}

/**
 * Safe logging helper
 */
function logDirectDebug($message, $context = []) {
    $serializedContext = $context ? json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : '';
    error_log('[DirectAPI] ' . $message . ($serializedContext ? ' | ' . $serializedContext : ''));
}

/**
 * Build date range from UI filters
 */
function resolveDateRange($filters) {
    $today = date('Y-m-d');

    if (!empty($filters['dateFrom']) && !empty($filters['dateTo'])) {
        $dateFrom = $filters['dateFrom'];
        $dateTo = $filters['dateTo'];

        if ($dateFrom > $dateTo) {
            $tmp = $dateFrom;
            $dateFrom = $dateTo;
            $dateTo = $tmp;
        }

        return [
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo
        ];
    }

    $period = isset($filters['period']) ? (int)$filters['period'] : 1;
    if ($period <= 0) {
        $period = 1;
    }

    // "N дней" = today + previous (N-1) full days
    $daysBack = max(0, $period - 1);

    return [
        'dateFrom' => date('Y-m-d', strtotime("-{$daysBack} days")),
        'dateTo' => $today
    ];
}

/**
 * Parse Yandex API error payload
 */
function extractYandexError($responseBody, $fallbackMessage = 'Ошибка API Яндекс Директ') {
    if (!$responseBody) {
        return $fallbackMessage;
    }
    $decoded = json_decode($responseBody, true);
    if (!is_array($decoded)) {
        return $fallbackMessage;
    }

    if (!empty($decoded['error']['error_string'])) {
        $detail = $decoded['error']['error_detail'] ?? '';
        return trim($decoded['error']['error_string'] . ($detail ? ': ' . $detail : ''));
    }

    if (!empty($decoded['error']['message'])) {
        return $decoded['error']['message'];
    }

    return $fallbackMessage;
}

/**
 * JSON API request (Campaigns service etc.)
 */
function makeDirectJsonApiRequest($url, $request, $token, $login) {
    $headers = [
        'Authorization: Bearer ' . $token,
        'Client-Login: ' . $login,
        'Accept-Language: ru',
        'Content-Type: application/json; charset=utf-8'
    ];

    $payload = json_encode($request, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        logDirectDebug('cURL error for JSON API request', ['url' => $url, 'error' => $error]);
        throw new RuntimeException('Ошибка соединения с API Яндекс Директ');
    }

    if ($httpCode !== 200) {
        logDirectDebug('Non-200 response from JSON API', ['url' => $url, 'httpCode' => $httpCode, 'response' => substr((string)$response, 0, 1500)]);
        throw new RuntimeException(extractYandexError($response, "Ошибка API Яндекс Директ (HTTP {$httpCode})"));
    }

    $decoded = json_decode((string)$response, true);
    if (!is_array($decoded)) {
        logDirectDebug('Invalid JSON response from JSON API', ['url' => $url, 'response' => substr((string)$response, 0, 1500)]);
        throw new RuntimeException('Некорректный ответ JSON от API Яндекс Директ');
    }

    if (!empty($decoded['error'])) {
        logDirectDebug('Yandex JSON API returned error object', ['url' => $url, 'error' => $decoded['error']]);
        throw new RuntimeException(extractYandexError(json_encode($decoded)));
    }

    return $decoded;
}

/**
 * Reports API request (returns TSV body)
 */
function makeDirectReportRequest($request, $token, $login) {
    $url = 'https://api.direct.yandex.com/json/v5/reports';
    $headers = [
        'Authorization: Bearer ' . $token,
        'Client-Login: ' . $login,
        'Accept-Language: ru',
        'Content-Type: application/json; charset=utf-8',
        'processingMode: auto',
        'returnMoneyInMicros: false',
        'skipReportHeader: true',
        'skipColumnHeader: false',
        'skipReportSummary: true'
    ];

    $payload = json_encode($request, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $maxAttempts = 4;
    $attempt = 0;

    do {
        $attempt++;
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            logDirectDebug('cURL error for Reports request', ['attempt' => $attempt, 'error' => $error]);
            throw new RuntimeException('Ошибка соединения с Reports API Яндекс Директ');
        }

        if ($httpCode === 200) {
            return (string)$response;
        }

        if ($httpCode === 201 || $httpCode === 202) {
            logDirectDebug('Reports request queued/in-progress', ['attempt' => $attempt, 'httpCode' => $httpCode]);
            sleep(2);
            continue;
        }

        logDirectDebug('Reports API returned error', ['httpCode' => $httpCode, 'response' => substr((string)$response, 0, 1500)]);
        throw new RuntimeException(extractYandexError($response, "Ошибка Reports API Яндекс Директ (HTTP {$httpCode})"));
    } while ($attempt < $maxAttempts);

    throw new RuntimeException('Отчёт Яндекс Директ не успел сформироваться, попробуйте позже');
}

/**
 * Parse TSV report into campaign metrics map
 */
function parseTsvReport($tsvBody) {
    $lines = preg_split('/\r\n|\n|\r/', trim((string)$tsvBody));
    if (!$lines || count($lines) < 2) {
        return [];
    }

    $headers = str_getcsv(array_shift($lines), "\t");
    $result = [];

    foreach ($lines as $line) {
        if ($line === '') {
            continue;
        }
        $columns = str_getcsv($line, "\t");
        if (count($columns) !== count($headers)) {
            continue;
        }

        $row = array_combine($headers, $columns);
        if ($row === false) {
            continue;
        }

        $campaignId = isset($row['CampaignId']) ? (int)$row['CampaignId'] : 0;
        if ($campaignId <= 0) {
            continue;
        }

        $impressions = (int)($row['Impressions'] ?? 0);
        $clicks = (int)($row['Clicks'] ?? 0);
        $cost = (float)($row['Cost'] ?? 0);
        $ctr = $impressions > 0 ? ($clicks / $impressions) * 100 : 0.0;

        $result[$campaignId] = [
            'campaignId' => $campaignId,
            'impressions' => $impressions,
            'clicks' => $clicks,
            'cost' => $cost,
            'ctr' => round($ctr, 2)
        ];
    }

    return $result;
}

/**
 * Parse TSV into grouped breakdown by dimension
 */
function parseBreakdownReport($tsvBody, $dimensionField) {
    $lines = preg_split('/\r\n|\n|\r/', trim((string)$tsvBody));
    if (!$lines || count($lines) < 2) {
        return [];
    }

    $headers = str_getcsv(array_shift($lines), "\t");
    $totals = [];

    foreach ($lines as $line) {
        if ($line === '') {
            continue;
        }
        $columns = str_getcsv($line, "\t");
        if (count($columns) !== count($headers)) {
            continue;
        }
        $row = array_combine($headers, $columns);
        if ($row === false) {
            continue;
        }

        $label = trim((string)($row[$dimensionField] ?? 'Не определено'));
        if ($label === '') {
            $label = 'Не определено';
        }

        if (!isset($totals[$label])) {
            $totals[$label] = [
                'label' => $label,
                'impressions' => 0,
                'clicks' => 0,
                'cost' => 0.0
            ];
        }

        $totals[$label]['impressions'] += (int)($row['Impressions'] ?? 0);
        $totals[$label]['clicks'] += (int)($row['Clicks'] ?? 0);
        $totals[$label]['cost'] += (float)($row['Cost'] ?? 0);
    }

    $items = array_values($totals);
    usort($items, function ($a, $b) {
        return $b['clicks'] <=> $a['clicks'];
    });

    return array_slice($items, 0, 8);
}

/**
 * Optional breakdown report; returns [] if API does not support requested dimension
 */
function fetchBreakdownReport($token, $login, $dateRange, $campaignIds, $dimensionField, $reportNamePrefix) {
    if (!$campaignIds) {
        return [];
    }

    try {
        $request = [
            'params' => [
                'SelectionCriteria' => [
                    'DateFrom' => $dateRange['dateFrom'],
                    'DateTo' => $dateRange['dateTo'],
                    'Filter' => [
                        [
                            'Field' => 'CampaignId',
                            'Operator' => 'IN',
                            'Values' => array_map('strval', $campaignIds)
                        ]
                    ]
                ],
                'FieldNames' => [$dimensionField, 'Impressions', 'Clicks', 'Cost'],
                'ReportName' => $reportNamePrefix . '_' . date('Ymd_His'),
                'ReportType' => 'CUSTOM_REPORT',
                'DateRangeType' => 'CUSTOM_DATE',
                'Format' => 'TSV',
                'IncludeVAT' => 'NO',
                'IncludeDiscount' => 'NO'
            ]
        ];

        $reportBody = makeDirectReportRequest($request, $token, $login);
        return parseBreakdownReport($reportBody, $dimensionField);
    } catch (Throwable $e) {
        logDirectDebug('Optional breakdown unavailable', [
            'dimension' => $dimensionField,
            'message' => $e->getMessage()
        ]);
        return [];
    }
}

/**
 * Normalize optional traffic-source dimensions to UI groups
 */
function normalizeTrafficSources($items) {
    if (!is_array($items) || !$items) {
        return [];
    }

    $map = [
        // Available in Direct Reports API via AdNetworkType segmentation
        'AD_NETWORK' => 'Переходы по рекламе',
        'AD' => 'Переходы по рекламе',
        'ADVERTISING' => 'Переходы по рекламе',
        'SEARCH' => 'Переходы из поисковых систем',
        'ORGANIC' => 'Переходы из поисковых систем'
    ];

    $totals = [];
    foreach ($items as $item) {
        $rawLabel = strtoupper(trim((string)($item['label'] ?? 'UNKNOWN')));
        $label = $map[$rawLabel] ?? null;
        if ($label === null) {
            continue;
        }

        if (!isset($totals[$label])) {
            $totals[$label] = [
                'label' => $label,
                'impressions' => 0,
                'clicks' => 0,
                'cost' => 0.0
            ];
        }

        $totals[$label]['impressions'] += (int)($item['impressions'] ?? 0);
        $totals[$label]['clicks'] += (int)($item['clicks'] ?? 0);
        $totals[$label]['cost'] += (float)($item['cost'] ?? 0);
    }

    $result = array_values($totals);
    usort($result, function ($a, $b) {
        return $b['clicks'] <=> $a['clicks'];
    });

    return $result;
}

/**
 * Get campaigns from Yandex Direct API (real data)
 */
function getCampaigns($token, $login, $filters) {
    $campaignsUrl = 'https://api.direct.yandex.com/json/v5/campaigns';

    try {
        $dateRange = resolveDateRange($filters);

        $campaignsRequest = [
            'method' => 'get',
            'params' => [
                'SelectionCriteria' => new stdClass(),
                'FieldNames' => ['Id', 'Name', 'State']
            ]
        ];

        $campaignsResponse = makeDirectJsonApiRequest($campaignsUrl, $campaignsRequest, $token, $login);
        $apiCampaigns = $campaignsResponse['result']['Campaigns'] ?? [];

        $campaignScope = (string)($filters['campaignScope'] ?? 'all_except_archived');
        if ($campaignScope === 'all_except_archived') {
            $apiCampaigns = array_values(array_filter($apiCampaigns, function ($campaign) {
                $state = strtoupper((string)($campaign['State'] ?? ''));
                return $state !== 'ARCHIVED' && $state !== 'CONVERTED';
            }));
        }

        $selectedCampaignId = isset($filters['campaign']) ? (int)$filters['campaign'] : 0;
        if ($selectedCampaignId > 0) {
            $apiCampaigns = array_values(array_filter($apiCampaigns, function ($campaign) use ($selectedCampaignId) {
                return (int)($campaign['Id'] ?? 0) === $selectedCampaignId;
            }));
        }

        if (!is_array($apiCampaigns) || count($apiCampaigns) === 0) {
            return [
                'campaigns' => [],
                'totalImpressions' => 0,
                'totalClicks' => 0,
                'totalCost' => 0,
                'avgCtr' => 0,
                'avgCpc' => 0,
                'cpm' => 0,
                'statusCounts' => ['ON' => 0, 'OFF' => 0, 'SUSPENDED' => 0, 'ENDED' => 0, 'UNKNOWN' => 0],
                'breakdowns' => ['technical' => [], 'technicalOs' => [], 'demography' => [], 'demographyGender' => [], 'geography' => [], 'trafficSources' => []],
                'impressionsChange' => 0,
                'clicksChange' => 0,
                'costChange' => 0,
                'ctrChange' => 0,
                'dateFrom' => $dateRange['dateFrom'],
                'dateTo' => $dateRange['dateTo']
            ];
        }

        $campaignIds = [];
        foreach ($apiCampaigns as $campaign) {
            if (!empty($campaign['Id'])) {
                $campaignIds[] = (int)$campaign['Id'];
            }
        }

        $reportRequest = [
            'params' => [
                'SelectionCriteria' => [
                    'DateFrom' => $dateRange['dateFrom'],
                    'DateTo' => $dateRange['dateTo'],
                    'Filter' => [
                        [
                            'Field' => 'CampaignId',
                            'Operator' => 'IN',
                            'Values' => array_map('strval', $campaignIds)
                        ]
                    ]
                ],
                'FieldNames' => ['CampaignId', 'CampaignName', 'Impressions', 'Clicks', 'Cost'],
                'ReportName' => 'realter_campaigns_' . date('Ymd_His'),
                'ReportType' => 'CAMPAIGN_PERFORMANCE_REPORT',
                'DateRangeType' => 'CUSTOM_DATE',
                'Format' => 'TSV',
                'IncludeVAT' => 'NO',
                'IncludeDiscount' => 'NO'
            ]
        ];

        $reportBody = makeDirectReportRequest($reportRequest, $token, $login);
        $statsByCampaignId = parseTsvReport($reportBody);

        $campaigns = [];
        $totalImpressions = 0;
        $totalClicks = 0;
        $totalCost = 0.0;

        foreach ($apiCampaigns as $campaign) {
            $id = (int)($campaign['Id'] ?? 0);
            if ($id <= 0) {
                continue;
            }

            $stats = $statsByCampaignId[$id] ?? [
                'impressions' => 0,
                'clicks' => 0,
                'cost' => 0.0,
                'ctr' => 0.0
            ];

            $campaigns[] = [
                'id' => $id,
                'name' => (string)($campaign['Name'] ?? ('Campaign #' . $id)),
                'status' => (string)($campaign['State'] ?? 'UNKNOWN'),
                'impressions' => (int)$stats['impressions'],
                'clicks' => (int)$stats['clicks'],
                'cost' => (float)$stats['cost'],
                'ctr' => (float)$stats['ctr']
            ];

            $totalImpressions += (int)$stats['impressions'];
            $totalClicks += (int)$stats['clicks'];
            $totalCost += (float)$stats['cost'];
        }

        $avgCtr = $totalImpressions > 0 ? ($totalClicks / $totalImpressions) * 100 : 0;
        $avgCpc = $totalClicks > 0 ? $totalCost / $totalClicks : 0;
        $cpm = $totalImpressions > 0 ? ($totalCost / $totalImpressions) * 1000 : 0;

        $statusCounts = [
            'ON' => 0,
            'OFF' => 0,
            'SUSPENDED' => 0,
            'ENDED' => 0,
            'UNKNOWN' => 0
        ];
        foreach ($apiCampaigns as $campaign) {
            $state = strtoupper((string)($campaign['State'] ?? 'UNKNOWN'));
            if (!array_key_exists($state, $statusCounts)) {
                $state = 'UNKNOWN';
            }
            $statusCounts[$state]++;
        }

        $technicalBreakdown = fetchBreakdownReport($token, $login, $dateRange, $campaignIds, 'Device', 'realter_technical');
        $technicalOsBreakdown = fetchBreakdownReport($token, $login, $dateRange, $campaignIds, 'MobilePlatform', 'realter_technical_os');
        $demographyBreakdown = fetchBreakdownReport($token, $login, $dateRange, $campaignIds, 'Age', 'realter_demography');
        $demographyGenderBreakdown = fetchBreakdownReport($token, $login, $dateRange, $campaignIds, 'Gender', 'realter_demography_gender');
        // Geography in Direct reports is provided via LocationOfPresenceName
        $geographyBreakdown = fetchBreakdownReport($token, $login, $dateRange, $campaignIds, 'LocationOfPresenceName', 'realter_geography');
        $trafficSourcesBreakdown = fetchBreakdownReport($token, $login, $dateRange, $campaignIds, 'AdNetworkType', 'realter_traffic_sources');
        $trafficSourcesBreakdown = normalizeTrafficSources($trafficSourcesBreakdown);

        return [
            'campaigns' => $campaigns,
            'totalImpressions' => $totalImpressions,
            'totalClicks' => $totalClicks,
            'totalCost' => round($totalCost, 2),
            'avgCtr' => round($avgCtr, 2),
            'avgCpc' => round($avgCpc, 2),
            'cpm' => round($cpm, 2),
            'statusCounts' => $statusCounts,
            'breakdowns' => [
                'technical' => $technicalBreakdown,
                'technicalOs' => $technicalOsBreakdown,
                'demography' => $demographyBreakdown,
                'demographyGender' => $demographyGenderBreakdown,
                'geography' => $geographyBreakdown,
                'trafficSources' => $trafficSourcesBreakdown
            ],
            'impressionsChange' => 0,
            'clicksChange' => 0,
            'costChange' => 0,
            'ctrChange' => 0,
            'dateFrom' => $dateRange['dateFrom'],
            'dateTo' => $dateRange['dateTo']
        ];
    } catch (Throwable $e) {
        logDirectDebug('Failed to fetch campaigns', ['message' => $e->getMessage()]);
        throw new RuntimeException('Ошибка при получении данных из Яндекс Директ: ' . $e->getMessage());
    }
}

/**
 * Validate and get Bearer token
 */
function getBearerToken($clientId, $clientSecret, $code) {
    $tokenUrl = 'https://oauth.yandex.ru/token';
    
    $postData = [
        'grant_type' => 'authorization_code',
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'code' => $code
    ];
    
    $ch = curl_init($tokenUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($postData),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        return null;
    }
    
    $data = json_decode($response, true);
    return $data['access_token'] ?? null;
}

// =====================================================
// Handle requests
// =====================================================

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    sendResponse(false, null, 'Invalid request');
}

$action = $input['action'] ?? null;
$token = $input['token'] ?? null;
$login = $input['login'] ?? null;

if (!$action) {
    sendResponse(false, null, 'Action not specified');
}

// Main action handler
switch ($action) {
    case 'getCampaigns':
        if (!isValidToken($token) || !$login) {
            sendResponse(false, null, 'Invalid credentials');
        }
        
        $filters = $input['filters'] ?? [
            'period' => 1,
            'dateFrom' => null,
            'dateTo' => null,
            'device' => 'all',
            'campaign' => '',
            'campaignScope' => 'all_except_archived'
        ];
        
        try {
            $data = getCampaigns($token, $login, $filters);
            sendResponse(true, $data);
        } catch (Throwable $e) {
            logDirectDebug('getCampaigns handler error', ['message' => $e->getMessage()]);
            sendResponse(false, null, $e->getMessage());
        }
        break;
        
    case 'exchangeCode':
        $clientId = $input['clientId'] ?? null;
        $clientSecret = $input['clientSecret'] ?? null;
        $code = $input['code'] ?? null;
        
        if (!$clientId || !$clientSecret || !$code) {
            sendResponse(false, null, 'Missing parameters');
        }
        
        $token = getBearerToken($clientId, $clientSecret, $code);
        if (!$token) {
            sendResponse(false, null, 'Failed to get access token');
        }
        
        sendResponse(true, ['token' => $token]);
        break;
        
    case 'validateToken':
        if (!isValidToken($token) || !$login) {
            sendResponse(false, null, 'Invalid token');
        }
        sendResponse(true, ['valid' => true]);
        break;
        
    default:
        sendResponse(false, null, 'Unknown action');
}
?>
