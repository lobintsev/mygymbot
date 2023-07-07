import { DataTypes, Model } from 'sequelize';

class User extends Model {}

User.init({
  telegram_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  device_id: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users'
});

export default User;