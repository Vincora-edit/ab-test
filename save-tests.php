<?php
/**
 * API endpoint для сохранения ab-tests-data.json
 * Принимает POST запрос с JSON данными и сохраняет в файл
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Получаем JSON из тела запроса
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data || !isset($data['tests'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid data format']);
        exit;
    }

    // Сохраняем в файл
    $filename = __DIR__ . '/ab-tests-data.json';
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    if (file_put_contents($filename, $json)) {
        echo json_encode([
            'success' => true,
            'message' => 'Tests saved successfully',
            'count' => count($data['tests']),
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save file']);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
