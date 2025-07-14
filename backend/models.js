const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite',
  logging: false
});

const User = sequelize.define('User', {
  name: DataTypes.STRING,
  email: { type: DataTypes.STRING, unique: true },
  password: DataTypes.STRING,
  avatar: DataTypes.STRING,
  balance: { type: DataTypes.FLOAT, defaultValue: 0 },
  rank: { type: DataTypes.INTEGER, defaultValue: 1 },
  referralLink: DataTypes.STRING
});

const Package = sequelize.define('Package', {
  name: DataTypes.STRING,
  percent: DataTypes.FLOAT,
  duration: DataTypes.INTEGER,
  minAmount: DataTypes.FLOAT
});

const Transaction = sequelize.define('Transaction', {
  type: DataTypes.STRING, // 'Депозит', 'Вывод', 'Инвестиция', 'Бонус', 'Доход', 'Бонус за реферала', 'Партнерская программа', 'RankReward', ...
  amount: DataTypes.FLOAT,
  status: DataTypes.STRING, // 'В обработке', 'Завершено', 'Активно', ...
  date: DataTypes.STRING,
  description: DataTypes.STRING // Дополнительная информация о транзакции
});

const Investment = sequelize.define('Investment', {
  amount: DataTypes.FLOAT,
  bonus: DataTypes.FLOAT,
  date: DataTypes.STRING
});

const Referral = sequelize.define('Referral', {
  // userId, referrerId (оба User)
});

const Address = sequelize.define('Address', {
  order_id: { type: DataTypes.STRING, allowNull: false },
  network: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.STRING, allowNull: false }
});

User.hasMany(Transaction);
Transaction.belongsTo(User);
Transaction.belongsTo(Package);

User.hasMany(Investment);
Investment.belongsTo(User);
Investment.belongsTo(Package);

User.hasMany(Referral, { as: 'Referrals', foreignKey: 'userId' });
User.hasMany(Referral, { as: 'Referrers', foreignKey: 'referrerId' });
Referral.belongsTo(User, { as: 'User', foreignKey: 'userId' });
Referral.belongsTo(User, { as: 'Referrer', foreignKey: 'referrerId' });

module.exports = { sequelize, User, Package, Transaction, Investment, Referral, Address }; 