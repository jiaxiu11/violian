'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('Recordings', 'bpm', {
          type: Sequelize.DataTypes.STRING,
        }, { transaction: t }),
      ])
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.dropColumn('Recordings', 'bpm', { transaction: t }),
      ])
    })
  }
};
