module.exports = (sequelize, DataTypes) => {
  const Thread = sequelize.define('Thread', {
    unreadStudentPost: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    unreadTutorPost: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  })

  Thread.associate = function (models) {
    Thread.belongsTo(models.Lesson)
    Thread.belongsTo(models.Course)
    Thread.belongsTo(models.User)
    Thread.hasMany(models.Post, {
      onDelete: 'CASCADE',
      hooks: true
    })
  }
  
  return Thread
}