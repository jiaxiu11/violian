'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return queryInterface.addColumn('Recordings', 'isRead', {
          type: Sequelize.DataTypes.BOOLEAN
        }, { transaction: t })
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return queryInterface.dropColumn('Recordings', 'isRead', {
          type: Sequelize.DataTypes.BOOLEAN
        }, { transaction: t })
    })
  }
};
