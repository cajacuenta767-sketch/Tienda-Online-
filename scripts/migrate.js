'use strict';
const { getDb } = require('../src/db');
const { migrate } = require('../src/db/migrate');
const ran = migrate(getDb());
console.log(ran.length ? `Migraciones aplicadas: ${ran.join(', ')}` : 'Base de datos al día.');
