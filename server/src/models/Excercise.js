const AWS = require('aws-sdk')
const config = require('../config/config')

const s3 = new AWS.S3({
  accessKeyId: config.aws.id,
  secretAccessKey: config.aws.secret
});

module.exports = (sequelize, DataTypes) => {
  const Exercise = sequelize.define('Exercise', {
    name: DataTypes.STRING,
    melody: DataTypes.TEXT,
    timeSignature:  DataTypes.STRING,
    numberOfBars: DataTypes.INTEGER,
    bpm: DataTypes.INTEGER,
    videoUrl:  DataTypes.STRING,
    videoPosterUrl:  DataTypes.STRING,
    demoStartTime: DataTypes.INTEGER,
    useScore: DataTypes.BOOLEAN,
    useXml: DataTypes.BOOLEAN,
    musicXmlUrl: DataTypes.STRING,
    videoFilename: DataTypes.STRING,
    videoPosterFilename: DataTypes.STRING,
    musicXmlFilename: DataTypes.STRING,
    keySignature: DataTypes.STRING
  })

  Exercise.associate = function (models) {
    Exercise.belongsTo(models.Lesson)
    Exercise.hasMany(models.Recording, {
      onDelete: 'CASCADE',
      hooks: true
    })
  }

  Exercise.beforeDestroy(async (exercise, options) => {
    console.log('in exercise before destroy')
    if (exercise.videoUrl) {
      // delete the previous video
      var originalVideoUrl = exercise.videoUrl.split('/')
      originalVideoUrl.splice(0, 3)
      var newVideoUrl = originalVideoUrl.join('/')
      var deleteVideoParams = {
        Bucket: config.aws.bucket,
        Key: newVideoUrl
      }

      await s3.deleteObject(deleteVideoParams).promise()
    } else if (exercise.demoUrl) {
      // delete the previous video
      var originalDemoUrl = exercise.demoUrl.split('/')
      originalDemoUrl.splice(0, 3)
      var newDemoUrl = originalDemoUrl.join('/')
      var deleteDemoParams = {
        Bucket: config.aws.bucket,
        Key: newDemoUrl
      }

      await s3.deleteObject(deleteDemoParams).promise()
    }
  })
  
  return Exercise
}