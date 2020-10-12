const { Recording } = require("../models");
const { Lesson } = require("../models");
const { Exercise } = require("../models");
const { Course } = require("../models");
const AWS = require("aws-sdk");
const config = require("../config/config");
const { sequelize } = require("../models");

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

        if (req.file) {
          let params = {
            Bucket: config.aws.bucket,
            Key: `${user.email}/${exercise.Lesson.Course.dataValues.name}/${exercise.Lesson.name}/${exercise.name}/audio/${req.file.originalname}`,
            Body: req.file.buffer,
          };

          console.log(params.Key);
          // Uploading audio file to the bucket
          const response = await s3.upload(params).promise();
          console.log(req.body);
          req.body.audioUrl = response.Location;
          req.body.audioFilename = req.file.originalname;
        }

        // console.log(req.body);
        const recording = await exercise.createRecording(req.body, {
          transaction: t,
        });
        await recording.setExercise(exercise);

        res.send({
          recording: recording.toJSON(),
        });
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
};
