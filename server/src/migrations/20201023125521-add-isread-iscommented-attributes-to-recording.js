'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('Recordings', 'isCommented', {
          type: Sequelize.DataTypes.BOOLEAN,
          defaultValue: 0,
        }, { transaction: t }),
        queryInterface.addColumn('Recordings', 'isRead', {
          type: Sequelize.DataTypes.BOOLEAN,
          defaultValue: 0,
        }, { transaction: t }),
      ])
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.dropColumn('Recordings', 'isCommented', { transaction: t }),
        queryInterface.dropColumn('Recordings', 'isRead', { transaction: t }),
      ])
    })
  }
};
