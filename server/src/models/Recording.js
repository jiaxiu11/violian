const AWS = require('aws-sdk')
const config = require('../config/config')

const s3 = new AWS.S3({
  accessKeyId: config.aws.id,
  secretAccessKey: config.aws.secret
});

module.exports = (sequelize, DataTypes) => {
  const Recording = sequelize.define('Recording', {
    audioUrl: DataTypes.STRING,
    audioFilename: DataTypes.STRING,
    transcription: DataTypes.STRING,
    overallComment: DataTypes.STRING,
    isCommented: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0
    },
    bpm: DataTypes.INTEGER
  })

  Recording.associate = function (models) {
    Recording.belongsTo(models.Exercise)
    Recording.belongsTo(models.User)
  }

  Recording.beforeDestroy(async (exercise, options) => {
    console.log('in recording before destroy')
    if (recording.audioUrl) {
      // delete the previous audio
      var originalAudioUrl = recording.audioUrl.split('/')
      originalVideoUrl.splice(0, 3)
      var newAudioUrl = originalAudioUrl.join('/')
      var deleteAudioParams = {
        Bucket: config.aws.bucket,
        Key: newAudioUrl
      }

      await s3.deleteObject(deleteAudioParams).promise()
    }
  })
  
  return Recording
}