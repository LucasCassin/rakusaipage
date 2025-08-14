exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO users (username, email, password, features, password_expires_at)
    VALUES (
      'mainUser',
      'admin@admin.com',
      '$2b$14$Q.sLXn5BJCbeWzOX8XiZte/GoL7Q5Hm3K4s24WEOafhUwHItAdVCK',
      ARRAY[
        'read:user:self',
        'read:user:other',
        'update:user:self',
        'update:user:other',
        'update:user:features:self',
        'update:user:features:other',
        'read:migration',
        'create:migration',
        'create:session',
        'read:session:self',
        'read:session:other',
        'block:other:update:self'
      ],
      '2019-09-21 00:00:00'
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM users WHERE username = 'mainUser';
  `);
};
