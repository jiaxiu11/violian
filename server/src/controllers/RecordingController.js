const { Recording } = require("../models");
const { Lesson } = require("../models");
const { Exercise } = require("../models");
const { Course } = require("../models");
const AWS = require("aws-sdk");
const config = require("../config/config");
const { sequelize } = require("../models");
const transcribe = require("../transcription/transcribe");

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
        if (req.file) {
          let params = {
            Bucket: config.aws.bucket,
            Key: `${user.email}/${exercise.Lesson.Course.dataValues.name}/${exercise.Lesson.name}/${exercise.name}/audio/${req.file.originalname}`,
            Body: req.file.buffer,
          };

          // Uploading audio file to the bucket
          const response = await s3.upload(params).promise();
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
        const {transcription} = req.body
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
  }
};
