const { Recording } = require("../models");
const { Lesson } = require("../models");
const { Exercise } = require("../models");
const { Course } = require("../models");
const { User } = require("../models");
const AWS = require("aws-sdk");
const config = require("../config/config");
const { sequelize } = require("../models");
const transcribe = require("../transcription/transcribe");
const path = require('path')
const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs');

const s3 = new AWS.S3({
  accessKeyId: config.aws.id,
  secretAccessKey: config.aws.secret,
});

module.exports = {
  async create(req, res) {
    try {
      await sequelize.transaction(async (t) => {
        const { eid } = req.body;
        const user = req.user;
        const exercise = await Exercise.findOne({
          where: {
            id: eid,
          },
          include: [
            {
              model: Lesson,
              include: [
                {
                  model: Course,
                },
              ],
            },
          ],
        });

        if (!exercise) {
          return res.status(403).send({
            error: "Exercise information is incorrect",
          });
        }

        console.log(req.file)
        let fileBuffer, filePath, outputPath;
        let outputName = req.file.originalname;
        if (req.file) {
          // Convert non-wav file into wav file.
          if (req.file.originalname.slice(-4) !== '.wav') {
            const dir = './temp';
            filePath = `${dir}/original_${req.file.originalname}`;

            // Change file extension.
            const strings = req.file.originalname.split('.');
            outputName = `${strings.slice(0, strings.length == 1 ? 1 : -1)}.wav`;
            outputPath = `${dir}/${outputName}`;

            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir);
            }
            fs.writeFileSync(filePath, req.file.buffer);

            await new Promise((resolve, reject) => {
              ffmpeg(filePath)
                .noVideo()
                .toFormat('wav')
                .output(outputPath)
                .on('progress', (progress) => {
                  console.log(progress)
                })
                .on('error', (err) => {
                  console.log(`[ffmpeg] error: ${err.message}`)
                  reject(err)
                })
                .on('end', async () => {
                  console.log('[ffmpeg] finished')
                  resolve()
                })
                .run()
            })

            fileBuffer = fs.readFileSync(outputPath);
          } else {
            fileBuffer = req.file.buffer;
          }

          // Uploading audio file to the bucket.
          let params = {
            Bucket: config.aws.bucket,
            Key: `${user.email}/${exercise.Lesson.Course.dataValues.name}/${exercise.Lesson.name}/${exercise.name}/audio/${outputName}`,
            Body: fileBuffer,
          };

          const response = await s3.upload(params).promise();

          // Remove temp files.
          if (filePath) {
            fs.unlinkSync(filePath);
          }
          if (outputPath) {
            fs.unlinkSync(outputPath);
          }

          req.body.UserId = user.id
          req.body.audioUrl = response.Location;
          req.body.audioFilename = req.file.originalname;

          const recording = await exercise.createRecording(req.body, {
            transaction: t,
          });
          await recording.setExercise(exercise);

          res.send({
            recording: recording.toJSON(),
          });
        } else {
          res.status(403).send({
            error: "No file found"
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: "an  error has occured trying to create the recording",
      });
    }
  },

  async list(req, res) {
    try {
      const { eid } = req.query;
      const exercise = await Exercise.findOne({
        where: {
          id: eid,
        },
      });

      if (!exercise) {
        return res.status(403).send({
          error: "Exercise information is incorrect",
        });
      }

      let recordings = await exercise.getRecordings();

      if (!recordings) {
        return res.status(403).send({
          error: "No recordings found",
        });
      }

      const recordingsJson = [];
      recordings.forEach((recording) => {
        recordingsJson.push(recording.toJSON());
      });
      res.send({
        recordings: recordingsJson,
      });
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: "An error has occured in trying to retrieve recordings",
      });
    }
  },

  async destroy(req, res) {
    try {
      await sequelize.transaction(async (t) => {
        const { rid } = req.query;
        await Recording.destroy({
          where: {
            id: rid,
          },
          transaction: t,
        });

        res.send({
          data: "ok",
        });
      });
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: "An error has occured in trying to delete recording",
      });
    }
  },

  async getTranscribedNotes(req, res) {
    try {
      await sequelize.transaction(async (t) => {
        const { rid } = req.query;
        const recording = await Recording.findOne({
          where: {
            id: rid,
          },
        });

        if (!recording) {
          return res.status(403).send({
            error: "Recording information is incorrect",
          });
        }

        if (!recording.transcription) {
          const transcriptionResponse = await transcribe.transcribe(
            recording.audioUrl
          );

          console.log(transcriptionResponse)
          if (!transcriptionResponse.success) {
            throw new Error("Transcription failed");
          }

          recording.transcription = transcriptionResponse.transcribed_notes;

          await Recording.update(recording.dataValues, {
            where: {
              id: rid,
            },
            transaction: t,
          });
        }

        await recording.reload().dataValues;
        res.send({
          recording: recording.toJSON(),
        });
      });
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: "An error has occured in trying to get transcribed notes",
      });
    }
  },

  async updateTranscribedNotes(req, res) {
    try {
      await sequelize.transaction(async (t) => {
        const { rid } = req.query;
        const { transcription } = req.body
        const recording = await Recording.findOne({
          where: {
            id: rid,
          },
        });

        if (!recording) {
          return res.status(403).send({
            error: "Recording information is incorrect",
          });
        }
        recording.transcription = transcription;

        await Recording.update(recording.dataValues, {
          where: {
            id: rid,
          },
          transaction: t,
        });

        await recording.reload().dataValues;
        res.send({
          recording: recording.toJSON(),
        });
      });
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: "An error has occured in trying to get transcribed notes",
      });
    }
  },

  async markAsCommented(req, res) {
    try {
      await sequelize.transaction(async (t) => {
        const { rid } = req.query;
        const recording = await Recording.findOne({
          where: {
            id: rid,
          },
        });

        if (!recording) {
          return res.status(403).send({
            error: "Recording information is incorrect",
          });
        }
        recording.isCommented = 1;

        await Recording.update(recording.dataValues, {
          where: {
            id: rid,
          },
          transaction: t,
        });

        await recording.reload().dataValues;
        res.send({
          recording: recording.toJSON(),
        });
      });
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: "An error has occured in trying to mark comment as read",
      });
    }
  },

  async markAsRead(req, res) {
    try {
      await sequelize.transaction(async (t) => {
        const { rid } = req.query;
        const recording = await Recording.findOne({
          where: {
            id: rid,
          },
        });

        if (!recording) {
          return res.status(403).send({
            error: "Recording information is incorrect",
          });
        }
        recording.isRead = 1;

        await Recording.update(recording.dataValues, {
          where: {
            id: rid,
          },
          transaction: t,
        });

        await recording.reload().dataValues;
        res.send({
          recording: recording.toJSON(),
        });
      });
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: "An error has occured in trying to mark comment as read",
      });
    }
  },

  async getUncommentedRecordings(req, res) {
    try {
      const user = req.user;
      const recordings = await Recording.findAll({
        where: {
          isCommented: 0,
          '$exercise.lesson.course.tutor.id$': user.id,
        },
        raw: true,
        attributes: [
          ['id', 'recording_id'],
          ['updatedAt', 'updated_at'],
          [sequelize.col('exercise.id'), 'exercise_id'],
          [sequelize.col('exercise.lesson.id'), 'lesson_id'],
          [sequelize.col('exercise.lesson.course.id'), 'course_id'],
          [sequelize.col('exercise.lesson.course.name'), 'course_name'],
          [sequelize.col('user.username'), 'student_name'],
          [sequelize.col('exercise.lesson.course.tutor.username'), 'tutor_name'],
        ],
        order: [
          ['updatedAt','DESC'],
        ],
        include: [
          {
            model: Exercise,
            attributes: [],
            include: [{
              model: Lesson,
              attributes: [],
              include: [{
                model: Course,
                attributes: [],
                include: [{
                  model: User,
                  as: 'Tutor',
                  attributes: [],
                }]
              }]
            }]
          },
          {
            model: User,
            attributes: [],
          }
        ]
      });

      console.log(recordings);
      res.send({
        recordings: recordings,
      })
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: "An error has occured in trying to get uncommented recordings",
      });
    }
  },

  async getUnreadComments(req, res) {
    try {
      const user = req.user;
      const recordings = await Recording.findAll({
        where: {
          UserId: user.id,
          isCommented: 1,
          isRead: 0,
        },
        raw: true,
        attributes: [
          ['id', 'recording_id'],
          ['updatedAt', 'updated_at'],
          [sequelize.col('exercise.id'), 'exercise_id'],
          [sequelize.col('exercise.lesson.id'), 'lesson_id'],
          [sequelize.col('exercise.lesson.course.id'), 'course_id'],
          [sequelize.col('exercise.lesson.course.name'), 'course_name'],
          [sequelize.col('user.username'), 'student_name'],
          [sequelize.col('exercise.lesson.course.tutor.username'), 'tutor_name'],
        ],
        order: [
          ['updatedAt','DESC'],
        ],
        include: [
          {
            model: Exercise,
            attributes: [],
            include: [{
              model: Lesson,
              attributes: [],
              include: [{
                model: Course,
                attributes: [],
                include: [{
                  model: User,
                  as: 'Tutor',
                  attributes: [],
                }]
              }]
            }]
          },
          {
            model: User,
            attributes: [],
          }
        ]
      });

      console.log(recordings);
      res.send({
        recordings: recordings,
      })
    } catch (err) {
      console.log(err);
      res.status(500).send({
        error: "An error has occured in trying to get unread comments",
      });
    }
  }
};
