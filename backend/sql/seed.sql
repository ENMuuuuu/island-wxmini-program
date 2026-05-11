USE habit_app;

INSERT INTO growth_theme (id, name, theme_type, total_layers, preview_url, config_json, theme_status)
VALUES
  (
    1,
    '成长建筑',
    'building',
    30,
    'https://example.com/themes/building.png',
    JSON_OBJECT('background', 'city', 'style', 'warm'),
    'active'
  ),
  (
    2,
    '治愈小岛',
    'island',
    50,
    'https://example.com/themes/island.png',
    JSON_OBJECT('background', 'sea', 'style', 'fresh'),
    'active'
  ),
  (
    3,
    '晚安星空',
    'stars',
    40,
    'https://example.com/themes/stars.png',
    JSON_OBJECT('background', 'night', 'style', 'dreamy'),
    'active'
  )
ON DUPLICATE KEY UPDATE
  preview_url = VALUES(preview_url),
  config_json = VALUES(config_json),
  theme_status = VALUES(theme_status);

INSERT INTO app_user (id, nickname, avatar_url)
VALUES
  (
    1,
    '测试用户',
    'https://example.com/avatar/test-user.png'
  )
ON DUPLICATE KEY UPDATE
  nickname = VALUES(nickname),
  avatar_url = VALUES(avatar_url);
