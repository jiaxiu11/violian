'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return queryInterface.createTable('Recording', {
        audioUrl: Sequelize.DataTypes.STRING,
        audioFilename: Sequelize.DataTypes.STRING,
        transcription: Sequelize.DataTypes.INTEGER,
      });
    })

  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return queryInterface.dropTable('Recording');
    })
  }
};
